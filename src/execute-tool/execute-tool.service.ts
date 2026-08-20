import { Injectable } from "@nestjs/common";
import {
  parseEther,
  parseUnits,
  formatEther,
  formatGwei,
  encodeDeployData,
  createPublicClient,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionedAccountService } from "../blockchain/permissioned-account.service";
import { ERC20_ABI, ERC20_BYTECODE } from "../lib/contract";
import type { KernelAccountClient } from "@zerodev/sdk";

type ToolHandler = (
  args: Record<string, string>,
  client: KernelAccountClient,
) => Promise<string>;

const handlers: Record<string, ToolHandler> = {
  send_transaction: async ({ to, value }, client) => {
    const userOpHash = await client
      .sendUserOperation({
        calls: [
          {
            to: to as `0x${string}`,
            value: parseEther(value || "0"),
            data: "0x",
          },
        ],
      })
      .catch((err: any) => {
        console.error("sendUserOperation error:", err);
        if (err.details) console.error("Error details:", err.details);
        if (err.metaMessages) console.error("Meta messages:", err.metaMessages);
        throw err;
      });
    const receipt = await client.waitForUserOperationReceipt({
      hash: userOpHash,
    });
    return `Transaction sent successfully.\nUserOp Hash: ${userOpHash}\nTx Hash: ${receipt.receipt.transactionHash}\nhttps://sepolia.basescan.org/tx/${receipt.receipt.transactionHash}`;
  },

  deploy_erc20: async ({ name, symbol, initialSupply }, client) => {
    const supply = initialSupply || "1000000000";
    const deployData = encodeDeployData({
      abi: ERC20_ABI,
      bytecode: ERC20_BYTECODE,
      args: [name, symbol, parseUnits(supply, 18)],
    });

    const userOpHash = await client
      .sendUserOperation({
        calls: [
          {
            to: "0x" as `0x${string}`,   // zero-address signals contract creation
            data: deployData,
            value: 0n,
          },
        ],
      })
      .catch((err: any) => {
        console.error("deploy_erc20 sendUserOperation error:", err);
        if (err.details) console.error("Error details:", err.details);
        throw err;
      });

    const receipt = await client.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    // Extract deployed contract address from receipt logs
    const contractAddress =
      receipt.receipt.contractAddress ??
      receipt.receipt.logs?.[0]?.address ??
      "unknown";

    return `ERC-20 token deployed successfully.\nToken: ${name} (${symbol})\nSupply: ${Number(supply).toLocaleString()}\nContract: ${contractAddress}\nTx Hash: ${receipt.receipt.transactionHash}\nhttps://sepolia.basescan.org/address/${contractAddress}\nhttps://sepolia.basescan.org/tx/${receipt.receipt.transactionHash}`;
  },
};

@Injectable()
export class ExecuteToolService {
  private publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL),
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionedAccount: PermissionedAccountService,
  ) {}

  async execute(
    userId: string,
    toolName: string,
    args: Record<string, string>,
    toolCallId?: string,
  ): Promise<{ result: string }> {
    // Idempotency check
    if (toolCallId) {
      const existing = await this.prisma.transactionLog.findUnique({
        where: { tool_call_id: toolCallId },
      });
      if (existing) {
        return {
          result: existing.tx_hash
            ? `Already executed: ${existing.tx_hash}`
            : "Already processing",
        };
      }
    }

    // Determine if it's a read or write operation.
    // Read operations do NOT require a session key.
    if (toolName === "estimate_gas") {
      const activeWallet = await this.prisma.wallet.findFirst({
        where: { user_id: userId, is_active: true },
      });
      if (!activeWallet) throw new Error("No active wallet found");

      const gasUnits = await this.publicClient.estimateGas({
        account: activeWallet.address as `0x${string}`,
        to: args.to as `0x${string}`,
        value: parseEther(args.value || "0"),
      });
      const gasPrice = await this.publicClient.getGasPrice();
      const totalCost = gasUnits * gasPrice;
      return {
        result: JSON.stringify({
          gas_units: gasUnits.toString(),
          gas_price_gwei: formatGwei(gasPrice),
          total_cost_eth: formatEther(totalCost),
        }),
      };
    }

    const handler = handlers[toolName];
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Security limits for autonomous write operations
    if (toolName === "send_transaction") {
      const amountEth = Number(args.value || "0.01");

      if (amountEth > 0.01) {
        throw new Error(
          "Transaction value exceeds per-transaction limit of 0.01 ETH in Agent Mode.",
        );
      }

      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      const recentLogs = await this.prisma.transactionLog.findMany({
        where: {
          user_id: userId,
          tool_name: "send_transaction",
          status: "confirmed",
          created_at: { gte: yesterday },
        },
      });

      const totalRecentEth = recentLogs.reduce((sum, log) => {
        const logArgs = log.args as { value?: string };
        return sum + Number(logArgs.value || "0.01");
      }, 0);

      if (totalRecentEth + amountEth > 0.1) {
        throw new Error(
          `Cumulative 24h spending limit (0.1 ETH) exceeded. You have already spent ${totalRecentEth.toFixed(4)} ETH in the last 24h.`,
        );
      }
    }

    // For write operations, use the PermissionedAccountService
    const kernelClient =
      await this.permissionedAccount.getSessionClient(userId);

    let logId: string | undefined;
    if (toolCallId) {
      const log = await this.prisma.transactionLog.create({
        data: {
          user_id: userId,
          tool_call_id: toolCallId,
          tool_name: toolName,
          args,
        },
      });
      logId = log.id;
    }

    try {
      const result = await handler(args, kernelClient);

      if (logId) {
        const txHashMatch = result.match(/Tx Hash: (0x[a-fA-F0-9]{64})/);
        await this.prisma.transactionLog.update({
          where: { id: logId },
          data: {
            tx_hash: txHashMatch?.[1] ?? null,
            status: "confirmed",
          },
        });
      }

      return { result };
    } catch (error) {
      if (logId) {
        await this.prisma.transactionLog.update({
          where: { id: logId },
          data: { status: "failed" },
        });
      }

      if (
        (error as any)?.message?.includes("AA33") ||
        (error as any)?.message?.includes("paymaster")
      ) {
        throw new Error(
          "Transaction failed: ZeroDev paymaster sponsorship limit exhausted or rejected. Please manually fund the smart account or try again later.",
        );
      }

      throw error;
    }
  }
}

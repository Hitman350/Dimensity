import { Injectable } from '@nestjs/common';
import { parseEther, formatEther, formatGwei, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionedAccountService } from '../blockchain/permissioned-account.service';
import type { KernelAccountClient } from '@zerodev/sdk';

type ToolHandler = (
  args: Record<string, string>,
  client: KernelAccountClient,
) => Promise<string>;

const handlers: Record<string, ToolHandler> = {
  send_transaction: async ({ to, value }, client) => {
    const userOpHash = await client.sendUserOperation({
      calls: [{
        to: to as `0x${string}`,
        value: parseEther(value || '0'),
        data: '0x',
      }]
    }).catch((err: any) => {
      console.error("sendUserOperation error:", err);
      if (err.details) console.error("Error details:", err.details);
      if (err.metaMessages) console.error("Meta messages:", err.metaMessages);
      throw err;
    });
    const receipt = await client.waitForUserOperationReceipt({ hash: userOpHash });
    return `Transaction sent successfully.\nUserOp Hash: ${userOpHash}\nTx Hash: ${receipt.receipt.transactionHash}\nhttps://sepolia.basescan.org/tx/${receipt.receipt.transactionHash}`;
  },

  deploy_erc20: async ({ name, symbol, initialSupply }, client) => {
    // Note: To deploy a contract with KernelAccountClient, we can pass the bytecode and args as data to the zero address (or no 'to' field)
    // However, viem's encodeDeployData is usually needed. 
    // This requires specific implementation, but for now we throw since agent needs ERC20 factory or encodeDeployData.
    throw new Error('deploy_erc20 via Session Key requires factory/encodeDeployData setup');
  },
};

@Injectable()
export class ExecuteToolService {
  private publicClient = createPublicClient({ chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC_URL) });

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionedAccount: PermissionedAccountService
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
            : 'Already processing',
        };
      }
    }

    // Determine if it's a read or write operation.
    // Read operations do NOT require a session key.
    if (toolName === 'estimate_gas') {
      const activeWallet = await this.prisma.wallet.findFirst({
        where: { user_id: userId, is_active: true },
      });
      if (!activeWallet) throw new Error('No active wallet found');
      
      const gasUnits = await this.publicClient.estimateGas({
        account: activeWallet.address as `0x${string}`,
        to: args.to as `0x${string}`,
        value: parseEther(args.value || '0'),
      });
      const gasPrice = await this.publicClient.getGasPrice();
      const totalCost = gasUnits * gasPrice;
      return {
        result: JSON.stringify({
          gas_units: gasUnits.toString(),
          gas_price_gwei: formatGwei(gasPrice),
          total_cost_eth: formatEther(totalCost),
        })
      };
    }

    const handler = handlers[toolName];
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // For write operations, use the PermissionedAccountService
    const kernelClient = await this.permissionedAccount.getSessionClient(userId);

    // Defense-in-depth cumulative limits could go here (e.g. check DB sum for last 24h)

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
            status: 'confirmed',
          },
        });
      }

      return { result };
    } catch (error) {
      if (logId) {
        await this.prisma.transactionLog.update({
          where: { id: logId },
          data: { status: 'failed' },
        });
      }
      throw error;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { parseEther, formatEther, formatGwei } from 'viem';
import { publicClient, createPerRequestWalletClient } from '../lib/viem-clients';
import type { ExtendedWalletClient } from '../lib/viem-clients';
import { ERC20_ABI, ERC20_BYTECODE } from '../lib/contract';
import { PrismaService } from '../prisma/prisma.service';

type ToolHandler = (
  args: Record<string, string>,
  wc: ExtendedWalletClient,
  addr: `0x${string}`,
) => Promise<string>;

const handlers: Record<string, ToolHandler> = {
  send_transaction: async ({ to, value }, wc) => {
    const txHash = await wc.sendTransaction({
      to: to as `0x${string}`,
      value: parseEther(value ?? '0.01'),
    });
    return `Transaction sent. Tx Hash: ${txHash}\nhttps://sepolia.basescan.org/tx/${txHash}`;
  },

  deploy_erc20: async ({ name, symbol, initialSupply }, wc) => {
    const supply = parseFloat(initialSupply || '1000000000');
    const hash = await wc.deployContract({
      abi: ERC20_ABI,
      bytecode: ERC20_BYTECODE,
      args: [name, symbol, supply],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return `${name} (${symbol}) deployed at: ${receipt.contractAddress}\nhttps://sepolia.basescan.org/address/${receipt.contractAddress}`;
  },

  estimate_gas: async ({ to, value }, _wc, addr) => {
    const gasUnits = await publicClient.estimateGas({
      account: addr,
      to: to as `0x${string}`,
      value: parseEther(value ?? '0.01'),
    });
    const gasPrice = await publicClient.getGasPrice();
    const totalCost = gasUnits * gasPrice;
    return JSON.stringify({
      gas_units: gasUnits.toString(),
      gas_price_gwei: formatGwei(gasPrice),
      total_cost_eth: formatEther(totalCost),
    });
  },
};

@Injectable()
export class ExecuteToolService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    toolName: string,
    args: Record<string, string>,
    toolCallId?: string,
  ): Promise<{ result: string }> {
    // --- Idempotency check: prevent double-execution of the same tool call ---
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

    const activeWallet = await this.prisma.wallet.findFirst({
      where: { user_id: userId, is_active: true },
    });

    if (!activeWallet) {
      throw new Error('No active wallet found');
    }

    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
      throw new Error('Server signer not configured');
    }

    const walletClient = createPerRequestWalletClient(pk);
    const walletAddress = activeWallet.address as `0x${string}`;

    const handler = handlers[toolName];
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Create log entry BEFORE execution (tracks intent even if tx fails)
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
      const result = await handler(args, walletClient, walletAddress);

      // Update log with result
      if (logId) {
        const txHashMatch = result.match(/0x[a-fA-F0-9]{64}/);
        await this.prisma.transactionLog.update({
          where: { id: logId },
          data: {
            tx_hash: txHashMatch?.[0] ?? null,
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

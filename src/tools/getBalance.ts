import { Injectable } from '@nestjs/common';
import { formatEther } from 'viem';
import { BlockchainService } from '../blockchain/blockchain.service';
import type { ToolDefinition, ToolService } from './tool.interface';

@Injectable()
export class GetBalanceService implements ToolService {
  constructor(private readonly blockchain: BlockchainService) {}

  readonly definition: ToolDefinition = {
    name: 'get_balance',
    description: 'Get the balance of the wallet',
    parameters: {
      type: 'object',
      properties: {
        wallet: {
          type: 'string',
          pattern: '^0x[a-fA-F0-9]{40}$',
          description: 'The wallet address to get the balance of',
        },
      },
      required: ['wallet'],
    },
  };

  async execute(args: { wallet: string }): Promise<string> {
    const publicClient = this.blockchain.getPublicClient();
    const balance = await publicClient.getBalance({
      address: args.wallet as `0x${string}`,
    });
    return formatEther(balance);
  }
}

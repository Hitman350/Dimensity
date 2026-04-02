import { Injectable } from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';
import type { ToolDefinition, ToolService } from './tool.interface';

const ERC20_READ_ABI = [
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

@Injectable()
export class GetTokenInfoService implements ToolService {
  constructor(private readonly blockchain: BlockchainService) {}

  readonly definition: ToolDefinition = {
    name: 'get_token_info',
    description:
      'Reads the name, symbol, decimals, and total supply of any ERC-20 token contract. Use this after deploying a token to confirm the deployment, or whenever a user asks about a token contract.',
    parameters: {
      type: 'object',
      properties: {
        contract_address: {
          type: 'string',
          description: 'ERC-20 token contract address',
        },
      },
      required: ['contract_address'],
    },
  };

  async execute(args: { contract_address: string }): Promise<string> {
    try {
      const client = this.blockchain.getPublicClient();
      const address = args.contract_address as `0x${string}`;

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        client.readContract({
          address,
          abi: ERC20_READ_ABI,
          functionName: 'name',
        }),
        client.readContract({
          address,
          abi: ERC20_READ_ABI,
          functionName: 'symbol',
        }),
        client.readContract({
          address,
          abi: ERC20_READ_ABI,
          functionName: 'decimals',
        }),
        client.readContract({
          address,
          abi: ERC20_READ_ABI,
          functionName: 'totalSupply',
        }),
      ]);

      const supply =
        Number(totalSupply) / Math.pow(10, Number(decimals));
      const formattedSupply = supply.toLocaleString();

      return JSON.stringify({
        name: String(name),
        symbol: String(symbol),
        decimals: decimals.toString(),
        total_supply: formattedSupply,
        contract: args.contract_address,
        explorer: `https://explorer.testnet.abs.xyz/address/${args.contract_address}`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error reading token info. This may not be a valid ERC-20 contract: ${msg}`;
    }
  }
}

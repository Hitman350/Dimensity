import { Injectable, Inject } from '@nestjs/common';
import { SIGNER } from '../signers/signer.module';
import type { Signer } from '../signers/types';
import { SessionContextService } from '../context/sessionContext';
import { ERC20_ABI, ERC20_BYTECODE } from '../const/contractDetails';
import type { ToolDefinition, ToolService } from './tool.interface';

@Injectable()
export class DeployErc20Service implements ToolService {
  constructor(
    @Inject(SIGNER) private readonly signer: Signer,
    private readonly context: SessionContextService,
  ) {}

  readonly definition: ToolDefinition = {
    name: 'deploy_erc20',
    description: 'Deploy a new ERC20 token contract',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the token',
        },
        symbol: {
          type: 'string',
          description: 'The symbol of the token',
        },
        initialSupply: {
          type: 'string',
          description:
            'Initial supply amount. Defaults to 1 billion tokens if not specified.',
        },
      },
      required: ['name', 'symbol'],
    },
  };

  async execute(args: {
    name: string;
    symbol: string;
    initialSupply?: string;
  }): Promise<string> {
    try {
      const baseNumber = parseFloat(args.initialSupply || '1000000000');

      const { contractAddress } = await this.signer.deployContract({
        abi: ERC20_ABI,
        bytecode: ERC20_BYTECODE,
        args: [args.name, args.symbol, baseNumber],
      });

      this.context.updateContext({ lastContractAddress: contractAddress });

      return `${args.name} (${args.symbol}) token deployed successfully at: ${contractAddress}`;
    } catch (error) {
      return `Failed to deploy contract: ${error}`;
    }
  }
}

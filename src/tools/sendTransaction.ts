import { Injectable, Inject } from '@nestjs/common';
import { parseEther } from 'viem';
import { SIGNER } from '../signers/signer.module';
import type { Signer } from '../signers/types';
import { SessionContextService } from '../context/sessionContext';
import type { ToolDefinition, ToolService } from './tool.interface';

@Injectable()
export class SendTransactionService implements ToolService {
  constructor(
    @Inject(SIGNER) private readonly signer: Signer,
    private readonly context: SessionContextService,
  ) {}

  readonly definition: ToolDefinition = {
    name: 'send_transaction',
    description: 'Send ether to a specified wallet address',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'The recipient wallet address',
        },
        value: {
          type: 'string',
          description: 'The amount of ether to send (in ETH).',
        },
      },
      required: ['to'],
    },
  };

  async execute(args: { to: string; value?: string }): Promise<string> {
    try {
      const txHash = await this.signer.sendTransaction({
        to: args.to as `0x${string}`,
        value: parseEther(args.value ?? '0.01'),
      });

      this.context.updateContext({
        lastRecipient: args.to,
        lastAmount: args.value ?? '0.01',
        lastTxHash: txHash,
      });

      return `Transaction sent successfully. Tx Hash: ${txHash}`;
    } catch (error) {
      return `Failed to send transaction: ${error}`;
    }
  }
}

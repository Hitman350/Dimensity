import { Injectable, Inject } from '@nestjs/common';
import { SIGNER } from '../signers/signer.module';
import type { Signer } from '../signers/types';
import type { ToolDefinition, ToolService } from './tool.interface';

@Injectable()
export class GetWalletAddressService implements ToolService {
  constructor(@Inject(SIGNER) private readonly signer: Signer) {}

  readonly definition: ToolDefinition = {
    name: 'get_wallet_address',
    description: 'Get your own connected wallet address',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  };

  async execute(): Promise<string> {
    return this.signer.getAddress();
  }
}

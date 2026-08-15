// BlockchainService — Injectable wrapper for viem public client.

import { Injectable } from '@nestjs/common';
import { createPublicClient, http, type PublicClient } from 'viem';
import { baseSepolia } from 'viem/chains';

@Injectable()
export class BlockchainService {
  private readonly publicClient: PublicClient;

  constructor() {
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    }) as PublicClient;
  }

  getPublicClient(): PublicClient {
    return this.publicClient;
  }
}

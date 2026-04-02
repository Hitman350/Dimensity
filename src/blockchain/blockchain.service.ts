// ============================================================
// BlockchainService — Injectable wrapper for viem public client.
// Replaces direct createViemPublicClient() calls in tools.
// ============================================================

import { Injectable } from '@nestjs/common';
import { createPublicClient, http, type PublicClient } from 'viem';
import { abstractTestnet } from 'viem/chains';

@Injectable()
export class BlockchainService {
  private readonly publicClient: PublicClient;

  constructor() {
    this.publicClient = createPublicClient({
      chain: abstractTestnet,
      transport: http(),
    }) as PublicClient;
  }

  getPublicClient(): PublicClient {
    return this.publicClient;
  }
}

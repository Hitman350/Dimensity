// ============================================================
// Signer module — provides the SIGNER injection token.
// Factory reads SIGNER_TYPE and PRIVATE_KEY from ConfigService
// and creates the appropriate signer implementation.
// ============================================================

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalSigner } from './LocalSigner';
import { KernelSigner } from './KernelSigner';
import type { Signer } from './types';

export const SIGNER = 'SIGNER';

@Global()
@Module({
  providers: [
    {
      provide: SIGNER,
      useFactory: (config: ConfigService): Signer => {
        const signerType = config.get<string>('SIGNER_TYPE', 'local');

        switch (signerType) {
          case 'local': {
            const privateKey = config.get<string>('PRIVATE_KEY');
            if (!privateKey) {
              throw new Error(
                'PRIVATE_KEY environment variable is required for local signer',
              );
            }
            return new LocalSigner(privateKey);
          }
          case 'kernel':
            return new KernelSigner();
          default:
            throw new Error(
              `Unknown SIGNER_TYPE: ${signerType}. Use 'local' or 'kernel'.`,
            );
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [SIGNER],
})
export class SignerModule {}

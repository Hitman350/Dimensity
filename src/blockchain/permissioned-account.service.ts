import { Injectable } from '@nestjs/common';
import { createPublicClient, http, type PublicClient } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createKernelAccountClient, createZeroDevPaymasterClient, constants, type KernelAccountClient } from '@zerodev/sdk';
import { deserializePermissionAccount } from '@zerodev/permissions';
import { toECDSASigner } from '@zerodev/permissions/signers';
import { decrypt } from './crypto.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionedAccountService {
  private readonly publicClient: PublicClient;

  constructor(private readonly prisma: PrismaService) {
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    }) as PublicClient;
  }

  async getSessionClient(userId: string): Promise<KernelAccountClient> {
    const session = await this.prisma.agentSession.findFirst({
      where: { user_id: userId, status: 'ACTIVE' },
      orderBy: { created_at: 'desc' },
    });

    if (!session) {
      throw new Error('No active agent session found');
    }

    if (new Date() > session.expiresAt) {
      await this.prisma.agentSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' }
      });
      throw new Error('Agent session expired');
    }

    const rpcUrl = process.env.ZERODEV_RPC_URL;
    if (!rpcUrl) throw new Error('ZERODEV_RPC_URL not configured');

    const decryptedPk = decrypt(session.encryptedPrivateKey);
    const sessionKeyAccount = privateKeyToAccount(decryptedPk as `0x${string}`);
    const sessionSigner = await toECDSASigner({ signer: sessionKeyAccount });

    const permissionAccount = await deserializePermissionAccount(
      this.publicClient,
      constants.getEntryPoint('0.7'),
      constants.KERNEL_V3_1,
      session.serializedPermission,
      sessionSigner
    );

    const paymasterClient = createZeroDevPaymasterClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    const kernelClient = createKernelAccountClient({
      account: permissionAccount,
      chain: baseSepolia,
      bundlerTransport: http(rpcUrl),
      paymaster: paymasterClient,
    });

    return kernelClient as unknown as KernelAccountClient;
  }
}

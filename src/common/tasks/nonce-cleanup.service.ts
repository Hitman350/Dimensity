import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Purges stale nonces every hour to prevent unbounded database growth.
 * Deletes nonces that are either already used or past their expiry.
 */
@Injectable()
export class NonceCleanupService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupStaleNonces(): Promise<void> {
    const { count } = await this.prisma.nonce.deleteMany({
      where: {
        OR: [{ used: true }, { expires_at: { lt: new Date() } }],
      },
    });
    if (count > 0) {
      console.log(`[NonceCleanup] Purged ${count} stale nonces`);
    }
  }
}

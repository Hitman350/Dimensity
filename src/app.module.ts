import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { ChatModule } from './chat/chat.module';
import { ExecuteToolModule } from './execute-tool/execute-tool.module';
import { ConversationsModule } from './conversations/conversations.module';
import { WalletsModule } from './wallets/wallets.module';
import { NonceCleanupService } from './common/tasks/nonce-cleanup.service';

/** HTTP API — primary backend for the Next.js frontend (proxied via rewrites). */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'web/.env.local'],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 3 },
      { name: 'medium', ttl: 10000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    ChatModule,
    ExecuteToolModule,
    ConversationsModule,
    WalletsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    NonceCleanupService,
  ],
})
export class AppModule {}

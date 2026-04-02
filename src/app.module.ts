import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from './blockchain/blockchain.module';
import { SignerModule } from './signers/signer.module';
import { ProviderModule } from './providers/provider.module';
import { ContextModule } from './context/context.module';
import { ToolsModule } from './tools/tools.module';
import { AgentModule } from './agent/agent.module';

@Module({
  imports: [
    // Global config — replaces raw dotenv/config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Core infrastructure
    BlockchainModule,
    SignerModule,
    ProviderModule,
    ContextModule,

    // Business logic
    ToolsModule,
    AgentModule,
  ],
})
export class AppModule {}

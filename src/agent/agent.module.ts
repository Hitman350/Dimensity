import { Module } from '@nestjs/common';
import { ToolsModule } from '../tools/tools.module';
import { AgentService } from './agentLoop';
import { CliService } from './cli.service';

@Module({
  imports: [ToolsModule],
  providers: [AgentService, CliService],
  exports: [AgentService],
})
export class AgentModule {}

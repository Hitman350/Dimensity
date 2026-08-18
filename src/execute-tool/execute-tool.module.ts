import { Module } from '@nestjs/common';
import { ExecuteToolController } from './execute-tool.controller';
import { ExecuteToolService } from './execute-tool.service';

@Module({
  controllers: [ExecuteToolController],
  providers: [ExecuteToolService],
  exports: [ExecuteToolService],
})
export class ExecuteToolModule {}

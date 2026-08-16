import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

import { ExecuteToolModule } from '../execute-tool/execute-tool.module';

@Module({
  imports: [ExecuteToolModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}

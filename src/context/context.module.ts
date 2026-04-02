import { Module, Global } from '@nestjs/common';
import { SessionContextService } from './sessionContext';

@Global()
@Module({
  providers: [SessionContextService],
  exports: [SessionContextService],
})
export class ContextModule {}

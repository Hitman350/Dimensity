import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from '../auth/session.guard';
import { ExecuteToolService } from './execute-tool.service';
import { ExecuteToolDto } from '../common/dto/execute-tool.dto';

@Controller('execute-tool')
@UseGuards(SessionGuard)
export class ExecuteToolController {
  constructor(private readonly executeTool: ExecuteToolService) {}

  @Post()
  async post(
    @Req() req: Request & { userId: string },
    @Body() dto: ExecuteToolDto,
  ) {
    return this.executeTool.execute(
      req.userId,
      dto.toolName,
      dto.args,
      dto.toolCallId,
    );
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from '../auth/session.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PatchTitleDto } from '../common/dto/wallet.dto';
import { extractMatchSnippet } from '../common/search-snippet';

@Controller('conversations')
@UseGuards(SessionGuard)
export class ConversationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Req() req: Request & { userId: string },
    @Query('q') q?: string,
  ) {
    await this.prisma.conversation.deleteMany({
      where: {
        user_id: req.userId,
        messages: { none: {} },
      },
    });

    const search = q?.trim();

    if (!search) {
      const conversations = await this.prisma.conversation.findMany({
        where: {
          user_id: req.userId,
          messages: { some: {} },
        },
        select: { id: true, title: true, updated_at: true },
        orderBy: { updated_at: 'desc' },
      });
      return { conversations };
    }

    const conversations = await this.prisma.conversation.findMany({
      where: {
        user_id: req.userId,
        messages: { some: {} },
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          {
            messages: {
              some: { content: { contains: search, mode: 'insensitive' } },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        updated_at: true,
        messages: {
          where: { content: { contains: search, mode: 'insensitive' } },
          select: { content: true },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    return {
      conversations: conversations.map(({ messages, ...conversation }) => ({
        ...conversation,
        snippet: messages[0]
          ? extractMatchSnippet(messages[0].content, search)
          : null,
      })),
    };
  }

  @Post()
  async create(@Req() req: Request & { userId: string }) {
    return this.prisma.conversation.create({
      data: { user_id: req.userId },
      select: { id: true, title: true, updated_at: true },
    });
  }

  @Get(':id')
  async getOne(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, user_id: req.userId },
    });
    if (!conversation) {
      throw new NotFoundException();
    }
    const messages = await this.prisma.message.findMany({
      where: { conversation_id: id },
      select: { id: true, role: true, content: true, created_at: true },
      orderBy: { created_at: 'asc' },
    });
    return { messages };
  }

  @Delete(':id')
  async remove(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, user_id: req.userId },
    });
    if (!conversation) {
      throw new NotFoundException();
    }
    await this.prisma.conversation.delete({ where: { id } });
    return { deleted: true };
  }

  @Patch(':id')
  async patchTitle(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: PatchTitleDto,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, user_id: req.userId },
    });
    if (!conversation) {
      throw new NotFoundException();
    }
    return this.prisma.conversation.update({
      where: { id },
      data: { title: dto.title },
      select: { id: true, title: true, updated_at: true },
    });
  }
}

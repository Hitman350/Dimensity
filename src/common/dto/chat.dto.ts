import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsString()
  role!: string;

  @IsString()
  content!: string;
}

export class ChatRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(100)
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @IsOptional()
  @IsString()
  conversationId?: string;
}

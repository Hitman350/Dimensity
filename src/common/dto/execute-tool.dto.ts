import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  Matches,
} from 'class-validator';

export class ExecuteToolDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z_]+$/, { message: 'Invalid tool name format' })
  toolName!: string;

  @IsObject()
  args!: Record<string, string>;

  @IsOptional()
  @IsString()
  toolCallId?: string;
}


import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

export class AddWalletDto {
  @IsNotEmpty()
  message!: unknown;

  @IsString()
  @IsNotEmpty()
  signature!: string;
}

export class PatchWalletDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class PatchTitleDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

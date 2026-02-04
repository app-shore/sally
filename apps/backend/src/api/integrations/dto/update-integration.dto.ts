import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class UpdateIntegrationDto {
  @IsString()
  @IsOptional()
  display_name?: string;

  @IsObject()
  @IsOptional()
  credentials?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  sync_interval_seconds?: number;

  @IsBoolean()
  @IsOptional()
  is_enabled?: boolean;
}

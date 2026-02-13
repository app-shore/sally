import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsArray,
  IsDateString,
  Length,
} from 'class-validator';

export class UpdateDriverDto {
  @ApiProperty({ example: 'John Smith', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '555-123-4567', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'A', enum: ['A', 'B', 'C'], required: false })
  @IsEnum(['A', 'B', 'C'], { message: 'cdl_class must be A, B, or C' })
  @IsOptional()
  cdl_class?: string;

  @ApiProperty({ example: 'DL12345678', required: false })
  @IsString()
  @IsOptional()
  license_number?: string;

  @ApiProperty({ example: 'TX', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  license_state?: string;

  @ApiProperty({ example: ['HAZMAT', 'TANKER'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  endorsements?: string[];

  @ApiProperty({ example: '2024-03-01', required: false })
  @IsOptional()
  @IsDateString()
  hire_date?: string;

  @ApiProperty({ example: '2026-08-15', required: false })
  @IsOptional()
  @IsDateString()
  medical_card_expiry?: string;

  @ApiProperty({ example: 'Dallas', required: false })
  @IsOptional()
  @IsString()
  home_terminal_city?: string;

  @ApiProperty({ example: 'TX', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  home_terminal_state?: string;

  @ApiProperty({ example: 'Jane Smith', required: false })
  @IsOptional()
  @IsString()
  emergency_contact_name?: string;

  @ApiProperty({ example: '555-987-6543', required: false })
  @IsOptional()
  @IsString()
  emergency_contact_phone?: string;

  @ApiProperty({ example: 'Prefers I-40 corridor', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

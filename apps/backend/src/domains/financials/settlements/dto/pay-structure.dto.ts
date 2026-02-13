import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, Min, ValidateIf } from 'class-validator';

export class UpsertPayStructureDto {
  @ApiProperty({ example: 'PER_MILE', enum: ['PER_MILE', 'PERCENTAGE', 'FLAT_RATE', 'HYBRID'] })
  @IsEnum(['PER_MILE', 'PERCENTAGE', 'FLAT_RATE', 'HYBRID'])
  type: string;

  @ApiProperty({ example: 55, description: 'Rate per mile in cents (for PER_MILE)', required: false })
  @ValidateIf(o => o.type === 'PER_MILE')
  @IsNumber()
  @Min(1)
  rate_per_mile_cents?: number;

  @ApiProperty({ example: 27.0, description: 'Percentage of linehaul (for PERCENTAGE)', required: false })
  @ValidateIf(o => o.type === 'PERCENTAGE')
  @IsNumber()
  @Min(0.1)
  percentage?: number;

  @ApiProperty({ example: 80000, description: 'Flat rate in cents (for FLAT_RATE)', required: false })
  @ValidateIf(o => o.type === 'FLAT_RATE')
  @IsNumber()
  @Min(1)
  flat_rate_cents?: number;

  @ApiProperty({ example: 20000, description: 'Hybrid base in cents (for HYBRID)', required: false })
  @ValidateIf(o => o.type === 'HYBRID')
  @IsNumber()
  @Min(0)
  hybrid_base_cents?: number;

  @ApiProperty({ example: 20.0, description: 'Hybrid percentage (for HYBRID)', required: false })
  @ValidateIf(o => o.type === 'HYBRID')
  @IsNumber()
  @Min(0.1)
  hybrid_percent?: number;

  @ApiProperty({ example: '2026-02-13' })
  @IsDateString()
  effective_date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

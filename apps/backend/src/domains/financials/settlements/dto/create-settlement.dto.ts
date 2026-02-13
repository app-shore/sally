import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CalculateSettlementDto {
  @ApiProperty({ example: 'DRV-001', description: 'Driver ID' })
  @IsString()
  driver_id: string;

  @ApiProperty({ example: '2026-02-01', description: 'Period start date' })
  @IsDateString()
  period_start: string;

  @ApiProperty({ example: '2026-02-07', description: 'Period end date' })
  @IsDateString()
  period_end: string;

  @ApiProperty({ example: false, required: false, description: 'If true, return preview without creating' })
  @IsOptional()
  preview?: boolean;
}

export class AddDeductionDto {
  @ApiProperty({ example: 'FUEL_ADVANCE', enum: ['FUEL_ADVANCE', 'CASH_ADVANCE', 'INSURANCE', 'EQUIPMENT_LEASE', 'ESCROW', 'OTHER'] })
  @IsEnum(['FUEL_ADVANCE', 'CASH_ADVANCE', 'INSURANCE', 'EQUIPMENT_LEASE', 'ESCROW', 'OTHER'])
  type: string;

  @ApiProperty({ example: 'Fuel advance - 02/10' })
  @IsString()
  description: string;

  @ApiProperty({ example: 50000, description: 'Deduction amount in cents' })
  @IsNumber()
  @Min(1)
  amount_cents: number;
}

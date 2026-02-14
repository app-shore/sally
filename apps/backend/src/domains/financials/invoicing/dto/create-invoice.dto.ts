import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsEnum, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceLineItemDto {
  @ApiProperty({ example: 'LINEHAUL', enum: ['LINEHAUL', 'FUEL_SURCHARGE', 'DETENTION_PICKUP', 'DETENTION_DELIVERY', 'LAYOVER', 'LUMPER', 'TONU', 'ACCESSORIAL', 'ADJUSTMENT'] })
  @IsEnum(['LINEHAUL', 'FUEL_SURCHARGE', 'DETENTION_PICKUP', 'DETENTION_DELIVERY', 'LAYOVER', 'LUMPER', 'TONU', 'ACCESSORIAL', 'ADJUSTMENT'])
  type: string;

  @ApiProperty({ example: 'Line haul - Chicago to Dallas' })
  @IsString()
  description: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 250000, description: 'Unit price in cents' })
  @IsNumber()
  @Min(0)
  unit_price_cents: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'LD-20260213-001', description: 'Load ID to generate invoice for' })
  @IsString()
  load_id: string;

  @ApiProperty({ example: 30, description: 'Payment terms in days', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  payment_terms_days?: number;

  @ApiProperty({ example: 'Net 30', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'Internal reference', required: false })
  @IsOptional()
  @IsString()
  internal_notes?: string;

  @ApiProperty({ type: [CreateInvoiceLineItemDto], required: false, description: 'Manual line items (if not auto-generating)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  line_items?: CreateInvoiceLineItemDto[];
}

export class RecordPaymentDto {
  @ApiProperty({ example: 250000, description: 'Payment amount in cents' })
  @IsNumber()
  @Min(1)
  amount_cents: number;

  @ApiProperty({ example: 'check', required: false })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiProperty({ example: 'CHK-12345', required: false })
  @IsOptional()
  @IsString()
  reference_number?: string;

  @ApiProperty({ example: '2026-02-13', description: 'Payment date' })
  @IsDateString()
  payment_date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvoiceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  payment_terms_days?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  internal_notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  adjustment_cents?: number;

  @ApiProperty({ type: [CreateInvoiceLineItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  line_items?: CreateInvoiceLineItemDto[];
}

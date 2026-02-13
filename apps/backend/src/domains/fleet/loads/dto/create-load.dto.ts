import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateLoadStopDto } from './create-load-stop.dto';

export class CreateLoadDto {
  @ApiProperty({
    example: 'LOAD-001',
    description: 'Unique load number (auto-generated if not provided)',
    required: false,
  })
  @IsString()
  @IsOptional()
  load_number?: string;

  @ApiProperty({
    example: 40000,
    description: 'Weight of load in pounds',
  })
  @IsNumber()
  weight_lbs: number;

  @ApiProperty({
    example: 'Electronics',
    description: 'Type of commodity being transported',
  })
  @IsString()
  @IsNotEmpty()
  commodity_type: string;

  @ApiProperty({
    example: 'Temperature controlled, fragile',
    description: 'Special handling requirements',
    required: false,
  })
  @IsString()
  @IsOptional()
  special_requirements?: string;

  @ApiProperty({
    example: 'Acme Corp',
    description: 'Customer name',
  })
  @IsString()
  @IsNotEmpty()
  customer_name: string;

  @ApiProperty({ example: 'dry_van', required: false })
  @IsString()
  @IsOptional()
  equipment_type?: string;

  @ApiProperty({ example: 'PO-12345', description: 'Customer reference / PO number', required: false })
  @IsString()
  @IsOptional()
  reference_number?: string;

  @ApiProperty({ example: 245000, description: 'Rate in cents (e.g. $2450.00 = 245000)', required: false })
  @IsNumber()
  @IsOptional()
  rate_cents?: number;

  @ApiProperty({ example: 26, description: 'Number of pieces / pallets', required: false })
  @IsNumber()
  @IsOptional()
  pieces?: number;

  @ApiProperty({ example: 'manual', required: false })
  @IsString()
  @IsOptional()
  intake_source?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  intake_metadata?: any;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  customer_id?: number;

  @ApiProperty({ example: 'draft', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    type: [CreateLoadStopDto],
    description: 'Array of stops for this load',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLoadStopDto)
  stops: CreateLoadStopDto[];
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateLoadStopDto } from './create-load-stop.dto';

export class CreateLoadDto {
  @ApiProperty({
    example: 'LOAD-001',
    description: 'Unique load number',
  })
  @IsString()
  @IsNotEmpty()
  load_number: string;

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

  @ApiProperty({
    type: [CreateLoadStopDto],
    description: 'Array of stops for this load',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLoadStopDto)
  stops: CreateLoadStopDto[];
}

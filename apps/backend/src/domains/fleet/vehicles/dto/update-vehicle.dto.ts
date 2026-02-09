import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateVehicleDto {
  @ApiProperty({
    example: 'TRUCK-456',
    description: 'Vehicle unit number',
    required: false,
  })
  @IsString()
  @IsOptional()
  unit_number?: string;

  @ApiProperty({
    example: 'Freightliner',
    description: 'Vehicle make',
    required: false,
  })
  @IsString()
  @IsOptional()
  make?: string;

  @ApiProperty({
    example: 'Cascadia',
    description: 'Vehicle model',
    required: false,
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({
    example: 2024,
    description: 'Vehicle year',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiProperty({
    example: '1FUJGBDV7CLBP8834',
    description: 'Vehicle identification number',
    required: false,
  })
  @IsString()
  @IsOptional()
  vin?: string;

  @ApiProperty({
    example: 150,
    description: 'Fuel tank capacity in gallons',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  fuel_capacity_gallons?: number;

  @ApiProperty({
    example: 100,
    description: 'Current fuel level in gallons',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  current_fuel_gallons?: number;

  @ApiProperty({
    example: 6.5,
    description: 'Miles per gallon efficiency',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  mpg?: number;
}

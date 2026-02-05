import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({
    example: 'VEH-001',
    description: 'Unique vehicle identifier',
  })
  @IsString()
  @IsNotEmpty()
  vehicle_id: string;

  @ApiProperty({
    example: 'TRUCK-123',
    description: 'Vehicle unit number',
  })
  @IsString()
  @IsNotEmpty()
  unit_number: string;

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

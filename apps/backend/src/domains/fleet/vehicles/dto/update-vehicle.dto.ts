import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Length,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateVehicleDto {
  @ApiProperty({ example: 'TRUCK-456', description: 'Vehicle unit number', required: false })
  @IsString()
  @IsOptional()
  unit_number?: string;

  @ApiProperty({ example: '1FUJGBDV7CLBP8834', description: 'Vehicle identification number (17 characters)', required: false })
  @IsString()
  @IsOptional()
  @Length(17, 17, { message: 'VIN must be exactly 17 characters' })
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, { message: 'VIN must contain only valid characters (no I, O, Q)' })
  @Transform(({ value }) => value?.toUpperCase().replace(/\s/g, ''))
  vin?: string;

  @ApiProperty({ example: 'DRY_VAN', description: 'Equipment type', enum: ['DRY_VAN', 'FLATBED', 'REEFER', 'STEP_DECK', 'POWER_ONLY', 'OTHER'], required: false })
  @IsEnum(['DRY_VAN', 'FLATBED', 'REEFER', 'STEP_DECK', 'POWER_ONLY', 'OTHER'], { message: 'Invalid equipment type' })
  @IsOptional()
  equipment_type?: string;

  @ApiProperty({ example: 150, description: 'Fuel tank capacity in gallons', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  fuel_capacity_gallons?: number;

  @ApiProperty({ example: 6.5, description: 'Miles per gallon efficiency', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  mpg?: number;

  @ApiProperty({ example: 'AVAILABLE', description: 'Vehicle operational status', enum: ['AVAILABLE', 'ASSIGNED', 'IN_SHOP', 'OUT_OF_SERVICE'], required: false })
  @IsEnum(['AVAILABLE', 'ASSIGNED', 'IN_SHOP', 'OUT_OF_SERVICE'], { message: 'Invalid status' })
  @IsOptional()
  status?: string;

  @ApiProperty({ example: 'Freightliner', description: 'Vehicle make', required: false })
  @IsString()
  @IsOptional()
  make?: string;

  @ApiProperty({ example: 'Cascadia', description: 'Vehicle model', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ example: 2024, description: 'Vehicle year', required: false })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiProperty({ example: 'ABC-1234', description: 'License plate number', required: false })
  @IsString()
  @IsOptional()
  license_plate?: string;

  @ApiProperty({ example: 'TX', description: 'License plate state (2-letter code)', required: false })
  @IsString()
  @IsOptional()
  @Length(2, 2, { message: 'State must be a 2-letter code' })
  @Transform(({ value }) => value?.toUpperCase())
  license_plate_state?: string;

  @ApiProperty({ example: true, description: 'Whether vehicle has sleeper berth', required: false })
  @IsBoolean()
  @IsOptional()
  has_sleeper_berth?: boolean;

  @ApiProperty({ example: 80000, description: 'Gross vehicle weight in pounds', required: false })
  @IsNumber()
  @IsOptional()
  gross_weight_lbs?: number;

  @ApiProperty({ example: 100, description: 'Current fuel level in gallons', required: false })
  @IsNumber()
  @IsOptional()
  current_fuel_gallons?: number;
}

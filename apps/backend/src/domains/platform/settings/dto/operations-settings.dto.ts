import {
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsString,
  IsArray,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class UpdateOperationsSettingsDto {
  // HOS Defaults
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(11)
  defaultDriveHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(14)
  defaultOnDutyHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(8)
  defaultSinceBreakHours?: number;

  // Optimization Defaults
  @IsOptional()
  @IsString()
  @IsIn(['MINIMIZE_TIME', 'MINIMIZE_COST', 'BALANCE'])
  defaultOptimizationMode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerMile?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCostPerHour?: number;

  // Rest Insertion Preferences
  @IsOptional()
  @IsBoolean()
  preferFullRest?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  restStopBuffer?: number;

  @IsOptional()
  @IsBoolean()
  allowDockRest?: boolean;

  @IsOptional()
  @IsInt()
  @IsIn([7, 10])
  minRestDuration?: number;

  // Fuel Preferences
  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelPriceThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  maxFuelDetour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minFuelSavings?: number;

  // Route Planning Defaults
  @IsOptional()
  @IsString()
  @IsIn(['MANUAL', 'AUTO_ASSIGN'])
  defaultLoadAssignment?: string;

  @IsOptional()
  @IsString()
  @IsIn(['MANUAL', 'AUTO_SUGGEST'])
  defaultDriverSelection?: string;

  @IsOptional()
  @IsString()
  @IsIn(['MANUAL', 'AUTO_ASSIGN', 'DRIVER_DEFAULT'])
  defaultVehicleSelection?: string;

  // Report Preferences
  @IsOptional()
  @IsString()
  reportTimezone?: string;

  @IsOptional()
  @IsBoolean()
  includeMapInReports?: boolean;

  @IsOptional()
  @IsArray()
  reportEmailRecipients?: string[];
}

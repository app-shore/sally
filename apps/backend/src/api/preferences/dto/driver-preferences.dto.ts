import { IsOptional, IsInt, IsBoolean, IsString, IsArray, IsIn, Min, Max } from 'class-validator';

export class UpdateDriverPreferencesDto {
  // Preferred Locations
  @IsOptional()
  @IsArray()
  preferredRestStops?: any[];

  @IsOptional()
  @IsArray()
  preferredFuelStops?: any[];

  // Break Preferences
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(60)
  preferredBreakDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(60)
  breakReminderAdvance?: number;

  // Route Display
  @IsOptional()
  @IsString()
  @IsIn(['VERTICAL', 'HORIZONTAL'])
  timelineView?: string;

  @IsOptional()
  @IsBoolean()
  showRestReasoning?: boolean;

  @IsOptional()
  @IsBoolean()
  showCostDetails?: boolean;

  // Mobile Preferences
  @IsOptional()
  @IsBoolean()
  largeTextMode?: boolean;

  @IsOptional()
  @IsBoolean()
  offlineMode?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'NORMAL', 'HIGH'])
  dataUsageMode?: string;

  // Communication
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @IsIn(['IN_APP', 'SMS', 'PHONE'])
  preferredContactMethod?: string;

  @IsOptional()
  @IsString()
  languagePreference?: string;
}

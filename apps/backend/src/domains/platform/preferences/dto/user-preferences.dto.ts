import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsArray,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class UpdateUserPreferencesDto {
  // Display Preferences
  @IsOptional()
  @IsString()
  @IsIn(['MILES', 'KILOMETERS'])
  distanceUnit?: string;

  @IsOptional()
  @IsString()
  @IsIn(['12H', '24H'])
  timeFormat?: string;

  @IsOptional()
  @IsString()
  @IsIn(['F', 'C'])
  temperatureUnit?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  // Dashboard Preferences
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  autoRefreshInterval?: number;

  @IsOptional()
  @IsString()
  @IsIn(['OVERVIEW', 'TIMELINE', 'MAP', 'COMPLIANCE', 'COSTS'])
  defaultView?: string;

  @IsOptional()
  @IsBoolean()
  compactMode?: boolean;

  @IsOptional()
  @IsBoolean()
  highContrastMode?: boolean;

  // Alert Preferences
  @IsOptional()
  @IsArray()
  alertMethods?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  minAlertPriority?: string;

  @IsOptional()
  @IsArray()
  alertCategories?: string[];

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @IsOptional()
  @IsString()
  @IsIn(['NEVER', 'HOURLY', 'DAILY', 'WEEKLY'])
  emailDigestFrequency?: string;

  // Notification Preferences
  @IsOptional()
  @IsBoolean()
  desktopNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  // Accessibility
  @IsOptional()
  @IsString()
  @IsIn(['SMALL', 'MEDIUM', 'LARGE', 'XL'])
  fontSize?: string;

  @IsOptional()
  @IsBoolean()
  reduceMotion?: boolean;

  @IsOptional()
  @IsBoolean()
  screenReaderOptimized?: boolean;
}

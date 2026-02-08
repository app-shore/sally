import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsArray,
  IsIn,
  IsObject,
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

  // Alert Delivery
  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  minAlertPriority?: string;

  @IsOptional()
  @IsArray()
  alertCategories?: string[];

  @IsOptional()
  @IsObject()
  alertChannels?: Record<string, { inApp: boolean; email: boolean; push: boolean; sms: boolean }>;

  @IsOptional()
  @IsObject()
  soundSettings?: Record<string, boolean>;

  @IsOptional()
  @IsBoolean()
  browserNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  flashTabOnCritical?: boolean;

  // Quiet Hours
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  // Snooze & Digest
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  defaultSnoozeDuration?: number;

  @IsOptional()
  @IsString()
  @IsIn(['NEVER', 'HOURLY', 'DAILY', 'WEEKLY'])
  emailDigestFrequency?: string;

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

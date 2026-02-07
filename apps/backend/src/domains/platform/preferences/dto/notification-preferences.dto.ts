import { IsOptional, IsBoolean, IsInt, IsObject, Min, Max } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsObject()
  alertChannels?: Record<string, { inApp: boolean; email: boolean; push: boolean; sms: boolean }>;

  @IsOptional()
  @IsObject()
  notificationChannels?: Record<string, { inApp: boolean; email: boolean }>;

  @IsOptional()
  @IsObject()
  soundEnabled?: Record<string, boolean>; // { critical: true, high: true, medium: false, low: false }

  @IsOptional()
  @IsBoolean()
  browserNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  flashTabOnCritical?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  defaultSnoozeDuration?: number;
}

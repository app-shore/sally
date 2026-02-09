import { IsOptional, IsObject } from 'class-validator';

export class UpdateAlertConfigDto {
  @IsOptional()
  @IsObject()
  alertTypes?: Record<string, { enabled: boolean; mandatory?: boolean; thresholdMinutes?: number; thresholdPercent?: number }>;

  @IsOptional()
  @IsObject()
  escalationPolicy?: Record<string, { acknowledgeSlaMinutes: number; escalateTo: string; channels: string[] }>;

  @IsOptional()
  @IsObject()
  groupingConfig?: { dedupWindowMinutes: number; groupSameTypePerDriver: boolean; smartGroupAcrossDrivers: boolean; linkCascading: boolean };

  @IsOptional()
  @IsObject()
  defaultChannels?: Record<string, { inApp: boolean; email: boolean; push: boolean; sms: boolean }>;

  @IsOptional()
  @IsObject()
  complianceThresholds?: {
    driveHoursWarningPct: number;
    driveHoursCriticalPct: number;
    onDutyWarningPct: number;
    onDutyCriticalPct: number;
    sinceBreakWarningPct: number;
    sinceBreakCriticalPct: number;
    delayThresholdMinutes: number;
    hosApproachingPct: number;
    costOverrunPct: number;
  };
}

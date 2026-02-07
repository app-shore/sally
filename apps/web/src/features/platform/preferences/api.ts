import { apiClient } from '@/shared/lib/api';
import type { PreferencesResetResponse } from './types';

export interface UserPreferences {
  id: number;
  userId: number;
  distanceUnit: string;
  timeFormat: string;
  temperatureUnit: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  autoRefreshInterval: number;
  defaultView: string;
  compactMode: boolean;
  highContrastMode: boolean;
  alertMethods: string[];
  minAlertPriority: string;
  alertCategories: string[];
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  emailDigestFrequency: string;
  desktopNotifications: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  fontSize: string;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperationsSettings {
  id: number;
  tenantId: number;
  defaultDriveHours: number;
  defaultOnDutyHours: number;
  defaultSinceBreakHours: number;
  driveHoursWarningPct: number;
  driveHoursCriticalPct: number;
  onDutyWarningPct: number;
  onDutyCriticalPct: number;
  sinceBreakWarningPct: number;
  sinceBreakCriticalPct: number;
  defaultOptimizationMode: string;
  costPerMile: number;
  laborCostPerHour: number;
  preferFullRest: boolean;
  restStopBuffer: number;
  allowDockRest: boolean;
  minRestDuration: number;
  fuelPriceThreshold: number;
  maxFuelDetour: number;
  minFuelSavings: number;
  defaultLoadAssignment: string;
  defaultDriverSelection: string;
  defaultVehicleSelection: string;
  delayThresholdMinutes: number;
  hosApproachingPct: number;
  costOverrunPct: number;
  reportTimezone: string;
  includeMapInReports: boolean;
  reportEmailRecipients: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DriverPreferences {
  id: number;
  userId: number;
  driverId: number | null;
  preferredRestStops: any[];
  preferredFuelStops: any[];
  preferredBreakDuration: number;
  breakReminderAdvance: number;
  timelineView: string;
  showRestReasoning: boolean;
  showCostDetails: boolean;
  largeTextMode: boolean;
  offlineMode: boolean;
  dataUsageMode: string;
  emergencyContact: string | null;
  preferredContactMethod: string;
  languagePreference: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export async function getUserPreferences(): Promise<UserPreferences> {
  return apiClient<UserPreferences>('/preferences/user');
}

export async function updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
  return apiClient<UserPreferences>('/preferences/user', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ============================================================================
// OPERATIONS SETTINGS
// ============================================================================

export async function getOperationsSettings(): Promise<OperationsSettings> {
  return apiClient<OperationsSettings>('/preferences/operations');
}

export async function updateOperationsSettings(updates: Partial<OperationsSettings>): Promise<OperationsSettings> {
  return apiClient<OperationsSettings>('/preferences/operations', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ============================================================================
// DRIVER PREFERENCES
// ============================================================================

export async function getDriverPreferences(): Promise<DriverPreferences> {
  return apiClient<DriverPreferences>('/preferences/driver');
}

export async function updateDriverPreferences(updates: Partial<DriverPreferences>): Promise<DriverPreferences> {
  return apiClient<DriverPreferences>('/preferences/driver', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ============================================================================
// ALERT CONFIGURATION
// ============================================================================

export interface AlertTypeConfig {
  enabled: boolean;
  mandatory?: boolean;
  thresholdMinutes?: number;
  thresholdPercent?: number;
}

export interface EscalationPolicyConfig {
  acknowledgeSlaMinutes: number;
  escalateTo: string;
  channels: string[];
}

export interface GroupingConfig {
  dedupWindowMinutes: number;
  groupSameTypePerDriver: boolean;
  smartGroupAcrossDrivers: boolean;
  linkCascading: boolean;
}

export interface ChannelConfig {
  inApp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface AlertConfiguration {
  alertTypes: Record<string, AlertTypeConfig>;
  escalationPolicy: Record<string, EscalationPolicyConfig>;
  groupingConfig: GroupingConfig;
  defaultChannels: Record<string, ChannelConfig>;
}

export async function getAlertConfig(): Promise<AlertConfiguration> {
  return apiClient<AlertConfiguration>('/settings/alerts');
}

export async function updateAlertConfig(updates: Partial<AlertConfiguration>): Promise<AlertConfiguration> {
  return apiClient<AlertConfiguration>('/settings/alerts', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ============================================================================
// RESET TO DEFAULTS
// ============================================================================

export async function resetToDefaults(scope: 'user' | 'operations' | 'driver'): Promise<PreferencesResetResponse> {
  if (scope === 'operations') {
    return apiClient<PreferencesResetResponse>('/preferences/operations/reset', {
      method: 'POST',
    });
  }
  return apiClient<PreferencesResetResponse>('/preferences/reset', {
    method: 'POST',
    body: JSON.stringify({ scope }),
  });
}


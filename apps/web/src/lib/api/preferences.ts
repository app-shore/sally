const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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

export interface DispatcherPreferences {
  id: number;
  userId: number;
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

async function getAuthToken(): Promise<string | null> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return null;
  }

  // Get token from localStorage
  const token = localStorage.getItem('accessToken');
  return token;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export async function getUserPreferences(): Promise<UserPreferences> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/preferences/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user preferences');
  }

  return response.json();
}

export async function updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/preferences/user`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update user preferences');
  }

  return response.json();
}

// ============================================================================
// DISPATCHER PREFERENCES
// ============================================================================

export async function getDispatcherPreferences(): Promise<DispatcherPreferences> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/preferences/dispatcher`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dispatcher preferences');
  }

  return response.json();
}

export async function updateDispatcherPreferences(updates: Partial<DispatcherPreferences>): Promise<DispatcherPreferences> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/preferences/dispatcher`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update dispatcher preferences');
  }

  return response.json();
}

// ============================================================================
// DRIVER PREFERENCES
// ============================================================================

export async function getDriverPreferences(): Promise<DriverPreferences> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/preferences/driver`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch driver preferences');
  }

  return response.json();
}

export async function updateDriverPreferences(updates: Partial<DriverPreferences>): Promise<DriverPreferences> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/preferences/driver`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update driver preferences');
  }

  return response.json();
}

// ============================================================================
// RESET TO DEFAULTS
// ============================================================================

export async function resetToDefaults(scope: 'user' | 'dispatcher' | 'driver'): Promise<any> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/preferences/reset`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scope }),
  });

  if (!response.ok) {
    throw new Error('Failed to reset preferences');
  }

  return response.json();
}

// ============================================================================
// GET DEFAULTS
// ============================================================================

export async function getDefaults(): Promise<{
  user: Partial<UserPreferences>;
  dispatcher: Partial<DispatcherPreferences>;
  driver: Partial<DriverPreferences>;
}> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/preferences/defaults`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch default preferences');
  }

  return response.json();
}

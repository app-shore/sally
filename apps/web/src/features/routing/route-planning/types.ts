/**
 * Route Planning API types
 * Matches backend POST /api/v1/routes/plan request/response
 */

// ─── Request Types ───

export interface CreateRoutePlanRequest {
  driverId: string;
  vehicleId: string;
  loadIds: string[];
  departureTime: string; // ISO 8601 datetime
  optimizationPriority?: 'minimize_time' | 'minimize_cost' | 'balance';
  dispatcherParams?: {
    dockRestStops?: Array<{
      stopId: string;
      truckParkedHours: number;
      convertToRest: boolean;
    }>;
    preferredRestType?: 'auto' | 'full' | 'split_8_2' | 'split_7_3';
    avoidTollRoads?: boolean;
    maxDetourMilesForFuel?: number;
  };
}

// ─── Response Types ───

export interface RoutePlanResult {
  planId: string;
  status: 'draft' | 'active' | 'cancelled' | 'superseded' | 'completed';
  isFeasible: boolean;
  feasibilityIssues: string[];
  totalDistanceMiles: number;
  totalDriveTimeHours: number;
  totalTripTimeHours: number;
  totalDrivingDays: number;
  totalCostEstimate: number;
  departureTime: string;
  estimatedArrival: string;
  driver?: {
    driverId: string;
    name: string;
  };
  vehicle?: {
    vehicleId: string;
    unitNumber: string;
    equipmentType?: string;
    make?: string;
    model?: string;
  };
  dispatcherParams?: {
    preferredRestType?: 'auto' | 'full' | 'split_8_2' | 'split_7_3';
    avoidTollRoads?: boolean;
    maxDetourMilesForFuel?: number;
  };
  optimizationPriority?: 'minimize_time' | 'minimize_cost' | 'balance';
  segments: RouteSegment[];
  loads?: RoutePlanLoad[];
  complianceReport: ComplianceReport;
  weatherAlerts: WeatherAlert[];
  dailyBreakdown: DayBreakdown[];
}

export interface RoutePlanLoad {
  id: number;
  load: {
    loadId: string;
    loadNumber: string;
    customerName: string;
    commodityType: string;
    weightLbs: number;
    rateCents?: number;
    pieces?: number;
    equipmentType?: string;
    status: string;
    stops?: Array<{
      actionType: string;
      stop: {
        city: string;
        state: string;
      };
    }>;
  };
}

export interface RouteSegment {
  segmentId: string;
  sequenceOrder: number;
  segmentType: 'drive' | 'rest' | 'fuel' | 'dock' | 'break';

  // Location
  fromLocation: string;
  toLocation: string;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;

  // Timing
  estimatedArrival: string;
  estimatedDeparture: string;
  timezone?: string;

  // Drive
  distanceMiles?: number;
  driveTimeHours?: number;
  routeGeometry?: string;

  // Rest
  restDurationHours?: number;
  restType?: string;
  restReason?: string;

  // Dock
  dockDurationHours?: number;
  customerName?: string;
  actionType?: string;
  isDocktimeConverted?: boolean;

  // Fuel
  fuelGallons?: number;
  fuelCostEstimate?: number;
  fuelStationName?: string;
  fuelPricePerGallon?: number;
  detourMiles?: number;

  // HOS state after segment
  hosStateAfter?: HOSState;

  // Fuel state after segment
  fuelStateAfter?: {
    currentFuelGallons: number;
    fuelCapacityGallons: number;
    rangeRemainingMiles: number;
  };

  // Weather
  weatherAlerts?: WeatherAlert[];
}

export interface HOSState {
  hoursDriven: number;
  onDutyTime: number;
  hoursSinceBreak: number;
  cycleHoursUsed: number;
  cycleDaysData?: Array<{ date: string; hoursWorked: number }>;
  splitRestState?: {
    inSplit: boolean;
    firstPortionType: 'sleeper_7' | 'sleeper_8' | 'offduty_2' | 'offduty_3' | null;
    firstPortionCompleted: boolean;
    pausedDutyWindow: number;
  };
}

export interface ComplianceReport {
  isFullyCompliant: boolean;
  totalRestStops: number;
  totalBreaks: number;
  total34hRestarts: number;
  totalSplitRests: number;
  dockTimeConversions: number;
  rules: Array<{
    rule: string;
    status: 'pass' | 'addressed';
  }>;
}

export interface WeatherAlert {
  lat: number;
  lon: number;
  condition: string;
  severity: 'low' | 'moderate' | 'severe';
  description: string;
  temperatureF: number;
  windSpeedMph: number;
  driveTimeMultiplier: number;
}

export interface DayBreakdown {
  day: number;
  date: string;
  driveHours: number;
  onDutyHours: number;
  segments: number;
  restStops: number;
}

// ─── List/Get Response Types ───

export interface RoutePlanListItem {
  id: number;
  planId: string;
  status: string;
  isActive: boolean;
  totalDistanceMiles: number;
  totalDriveTimeHours: number;
  totalTripTimeHours: number;
  totalCostEstimate: number;
  departureTime: string;
  estimatedArrival: string;
  isFeasible: boolean;
  createdAt: string;
  driver: { driverId: string; name: string };
  vehicle: { vehicleId: string; unitNumber: string };
  _count: { segments: number; loads: number };
}

export interface RoutePlanListResponse {
  plans: RoutePlanListItem[];
  total: number;
}

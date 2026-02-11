export interface MonitoringTrigger {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  requiresReplan: boolean;
  etaImpactMinutes: number;
  params: Record<string, any>;
}

export interface MonitoringThresholds {
  hosApproachingMinutes: number;
  breakRequiredHours: number;
  cycleApproachingHours: number;
  appointmentAtRiskMinutes: number;
  dockTimeExceededMinutes: number;
  driverNotMovingMinutes: number;
  routeDelayMinutes: number;
  fuelLowPercent: number;
}

export const DEFAULT_THRESHOLDS: MonitoringThresholds = {
  hosApproachingMinutes: 60,
  breakRequiredHours: 8,
  cycleApproachingHours: 5,
  appointmentAtRiskMinutes: 30,
  dockTimeExceededMinutes: 60,
  driverNotMovingMinutes: 120,
  routeDelayMinutes: 30,
  fuelLowPercent: 20,
};

export interface MonitoringContext {
  plan: any;
  segments: any[];
  currentSegment: any | null;
  hosData: any;
  gpsData: any;
  thresholds: MonitoringThresholds;
  driverName: string;
}

export interface MonitoringStatus {
  planId: string;
  currentSegment: {
    segmentId: string;
    sequenceOrder: number;
    segmentType: string;
    status: string;
  } | null;
  driverPosition: {
    lat: number;
    lon: number;
    speed: number;
    heading: number;
    lastUpdated: string;
  } | null;
  hosState: {
    currentDutyStatus: string;
    driveTimeRemainingMinutes: number;
    shiftTimeRemainingMinutes: number;
    cycleTimeRemainingMinutes: number;
    timeUntilBreakMinutes: number;
  } | null;
  etaDeviation: {
    minutes: number;
    status: 'on_time' | 'at_risk' | 'late';
  };
  completedSegments: number;
  totalSegments: number;
  activeAlerts: number;
  lastChecked: string;
  recentUpdates: RoutePlanUpdate[];
}

export interface RoutePlanUpdate {
  updateId: string;
  planId: number;
  updateType: string;
  triggeredAt: string;
  triggeredBy: string;
  triggerData: Record<string, unknown>;
  replanTriggered: boolean;
  replanReason: string | null;
  impactSummary: {
    etaChangeMinutes: number;
    alertsFired: number;
    severity: string;
  } | null;
}

export interface MonitoringTriggerEvent {
  planId: string;
  triggerType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  requiresReplan: boolean;
  etaImpactMinutes: number;
  params: Record<string, unknown>;
  timestamp: string;
}

export interface MonitoringCycleEvent {
  routesMonitored: number;
  totalTriggers: number;
  timestamp: string;
}

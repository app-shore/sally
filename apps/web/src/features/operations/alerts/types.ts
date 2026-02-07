export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'acknowledged' | 'snoozed' | 'resolved' | 'auto_resolved';
export type AlertCategory = 'hos' | 'route' | 'driver' | 'vehicle' | 'external' | 'system';

export interface AlertNote {
  note_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface Alert {
  alert_id: string;
  driver_id: string;
  route_plan_id?: string;
  vehicle_id?: string;
  alert_type: string;
  category: AlertCategory;
  priority: AlertPriority;
  title: string;
  message: string;
  recommended_action?: string;
  metadata?: Record<string, unknown>;
  status: AlertStatus;
  acknowledged_at?: string;
  acknowledged_by?: string;
  snoozed_until?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  auto_resolved?: boolean;
  parent_alert_id?: string;
  escalation_level?: number;
  created_at: string;
  updated_at: string;
  notes?: AlertNote[];
  child_alerts?: Alert[];
}

export interface AlertStats {
  active: number;
  critical: number;
  avgResponseTimeMinutes: number;
  resolvedToday: number;
}

export interface ListAlertsParams {
  status?: string;
  priority?: string;
  driver_id?: string;
  category?: string;
}

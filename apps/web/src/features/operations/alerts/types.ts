export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type AlertCategory = 'hos' | 'delay' | 'route' | 'vehicle' | 'weather';

export interface Alert {
  id: string;
  plan_id?: string;
  driver_id?: string;
  priority: AlertPriority;
  category: AlertCategory;
  title: string;
  message: string;
  status: AlertStatus;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  metadata?: Record<string, unknown>;
}

export interface ListAlertsParams {
  status?: AlertStatus;
  priority?: AlertPriority;
  category?: AlertCategory;
  plan_id?: string;
  driver_id?: string;
}

export interface AcknowledgeAlertResponse {
  message: string;
  alert: Alert;
}

export interface ResolveAlertResponse {
  message: string;
  alert: Alert;
}

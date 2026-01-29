import { api } from './client';

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

export async function listAlerts(params?: ListAlertsParams): Promise<Alert[]> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value);
      }
    });
  }

  const query = queryParams.toString();
  const url = `/api/v1/alerts${query ? `?${query}` : ''}`;

  return api.get<Alert[]>(url);
}

export async function getAlert(alertId: string): Promise<Alert> {
  return api.get<Alert>(`/api/v1/alerts/${alertId}`);
}

export interface AcknowledgeAlertResponse {
  message: string;
  alert: Alert;
}

export async function acknowledgeAlert(alertId: string): Promise<AcknowledgeAlertResponse> {
  return api.post<AcknowledgeAlertResponse>(`/api/v1/alerts/${alertId}/acknowledge`);
}

export interface ResolveAlertResponse {
  message: string;
  alert: Alert;
}

export async function resolveAlert(alertId: string): Promise<ResolveAlertResponse> {
  return api.post<ResolveAlertResponse>(`/api/v1/alerts/${alertId}/resolve`);
}

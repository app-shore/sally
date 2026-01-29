const API_BASE_URL = 'http://localhost:8000';

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
  const url = new URL(`${API_BASE_URL}/api/v1/alerts`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch alerts' }));
    throw new Error(error.detail || 'Failed to fetch alerts');
  }

  return response.json();
}

export async function getAlert(alertId: string): Promise<Alert> {
  const response = await fetch(`${API_BASE_URL}/api/v1/alerts/${alertId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch alert' }));
    throw new Error(error.detail || 'Failed to fetch alert');
  }

  return response.json();
}

export interface AcknowledgeAlertResponse {
  message: string;
  alert: Alert;
}

export async function acknowledgeAlert(alertId: string): Promise<AcknowledgeAlertResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to acknowledge alert' }));
    throw new Error(error.detail || 'Failed to acknowledge alert');
  }

  return response.json();
}

export interface ResolveAlertResponse {
  message: string;
  alert: Alert;
}

export async function resolveAlert(alertId: string): Promise<ResolveAlertResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/alerts/${alertId}/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to resolve alert' }));
    throw new Error(error.detail || 'Failed to resolve alert');
  }

  return response.json();
}

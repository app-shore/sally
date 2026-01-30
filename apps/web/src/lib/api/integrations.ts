import { apiClient } from './client';

export type IntegrationType = 'TMS' | 'HOS_ELD' | 'FUEL_PRICE' | 'WEATHER' | 'TELEMATICS';

export type IntegrationVendor =
  | 'MCLEOD_TMS'
  | 'TMW_TMS'
  | 'TRUCKBASE_TMS'
  | 'SAMSARA_ELD'
  | 'KEEPTRUCKIN_ELD'
  | 'MOTIVE_ELD'
  | 'GASBUDDY_FUEL'
  | 'FUELFINDER_FUEL'
  | 'OPENWEATHER';

export type IntegrationStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'ACTIVE' | 'ERROR' | 'DISABLED';

export interface IntegrationConfig {
  id: string;
  integration_type: IntegrationType;
  vendor: IntegrationVendor;
  display_name: string;
  is_enabled: boolean;
  status: IntegrationStatus;
  sync_interval_seconds?: number;
  last_sync_at?: string;
  last_success_at?: string;
  last_error_at?: string;
  last_error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIntegrationRequest {
  integration_type: IntegrationType;
  vendor: IntegrationVendor;
  display_name: string;
  credentials?: Record<string, any>;
  sync_interval_seconds?: number;
}

export interface UpdateIntegrationRequest {
  display_name?: string;
  credentials?: Record<string, any>;
  sync_interval_seconds?: number;
  is_enabled?: boolean;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface SyncResponse {
  success: boolean;
  records_processed?: number;
  records_created?: number;
  records_updated?: number;
  message?: string;
}

export interface SyncLog {
  id: string;
  sync_type: string;
  started_at: string;
  completed_at?: string;
  status: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  error_details?: Record<string, any>;
}

/**
 * List all integration configurations for the current tenant
 */
export async function listIntegrations(): Promise<IntegrationConfig[]> {
  return apiClient<IntegrationConfig[]>('/integrations', { method: 'GET' });
}

/**
 * Get a specific integration configuration by ID
 */
export async function getIntegration(integrationId: string): Promise<IntegrationConfig> {
  return apiClient<IntegrationConfig>(`/integrations/${integrationId}`, { method: 'GET' });
}

/**
 * Create a new integration configuration
 */
export async function createIntegration(data: CreateIntegrationRequest): Promise<IntegrationConfig> {
  return apiClient<IntegrationConfig>('/integrations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing integration configuration
 */
export async function updateIntegration(
  integrationId: string,
  data: UpdateIntegrationRequest
): Promise<IntegrationConfig> {
  return apiClient<IntegrationConfig>(`/integrations/${integrationId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an integration configuration
 */
export async function deleteIntegration(integrationId: string): Promise<void> {
  return apiClient<void>(`/integrations/${integrationId}`, { method: 'DELETE' });
}

/**
 * Test connection to external system
 */
export async function testConnection(integrationId: string): Promise<TestConnectionResponse> {
  return apiClient<TestConnectionResponse>(`/integrations/${integrationId}/test`, {
    method: 'POST',
  });
}

/**
 * Trigger a manual sync for this integration
 */
export async function triggerSync(integrationId: string): Promise<SyncResponse> {
  return apiClient<SyncResponse>(`/integrations/${integrationId}/sync`, {
    method: 'POST',
  });
}

/**
 * Get sync history for an integration
 */
export async function getSyncHistory(integrationId: string, limit = 20): Promise<SyncLog[]> {
    return apiClient<SyncLog[]>(`/integrations/${integrationId}/sync-history?limit=${limit}`, {
    method: 'GET',
  });
}

/**
 * Helper function to get human-readable integration type labels
 */
export function getIntegrationTypeLabel(type: IntegrationType): string {
  const labels: Record<IntegrationType, string> = {
    TMS: 'Transportation Management System',
    HOS_ELD: 'Hours of Service (ELD)',
    FUEL_PRICE: 'Fuel Prices',
    WEATHER: 'Weather',
    TELEMATICS: 'Telematics',
  };
  return labels[type];
}

/**
 * Helper function to get human-readable vendor labels
 */
export function getVendorLabel(vendor: IntegrationVendor): string {
  const labels: Record<IntegrationVendor, string> = {
    MCLEOD_TMS: 'McLeod',
    TMW_TMS: 'TMW Systems',
    TRUCKBASE_TMS: 'Truckbase',
    SAMSARA_ELD: 'Samsara',
    KEEPTRUCKIN_ELD: 'KeepTruckin',
    MOTIVE_ELD: 'Motive',
    GASBUDDY_FUEL: 'GasBuddy',
    FUELFINDER_FUEL: 'Fuel Finder',
    OPENWEATHER: 'OpenWeather',
  };
  return labels[vendor];
}

/**
 * Helper function to format relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

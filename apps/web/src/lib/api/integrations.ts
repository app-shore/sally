import { apiClient } from './client';

export type IntegrationType = 'TMS' | 'HOS_ELD' | 'FUEL_PRICE' | 'WEATHER' | 'TELEMATICS';

// Backend validates vendor, frontend treats as string
export type IntegrationVendor = string;

export type IntegrationStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'ACTIVE' | 'ERROR' | 'DISABLED';

export interface CredentialField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number';
  required: boolean;
  helpText?: string;
  placeholder?: string;
}

export interface VendorMetadata {
  id: string;
  displayName: string;
  description: string;
  integrationType: IntegrationType;
  credentialFields: CredentialField[];
  helpUrl?: string;
  logoUrl?: string;
}

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
  duration_ms?: number;
  status: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  error_details?: Record<string, any>;
}

export interface SyncStats {
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  success_rate: number;
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
 * Trigger fleet-wide sync (all enabled integrations for tenant)
 */
export async function syncFleet(): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/fleet/sync', {
    method: 'POST',
  });
}

/**
 * Get sync history for an integration
 */
export async function getSyncHistory(
  integrationId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<SyncLog[]> {
  return apiClient<SyncLog[]>(`/integrations/${integrationId}/sync-history?limit=${limit}&offset=${offset}`, {
    method: 'GET',
  });
}

/**
 * Get sync statistics for an integration
 */
export async function getSyncStats(integrationId: string): Promise<SyncStats> {
  return apiClient<SyncStats>(`/integrations/${integrationId}/sync-history/stats`, {
    method: 'GET',
  });
}

/**
 * Get vendor registry metadata
 */
export async function getVendorRegistry(): Promise<VendorMetadata[]> {
  return apiClient<VendorMetadata[]>('/integrations/vendors', { method: 'GET' });
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

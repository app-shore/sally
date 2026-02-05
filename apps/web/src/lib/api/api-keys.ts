import { apiClient } from './client';

export interface ApiKey {
  id: string;
  key?: string; // Only present on creation
  name: string;
  requestCount: number;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface CreateApiKeyRequest {
  name: string;
}

export async function createApiKey(data: CreateApiKeyRequest): Promise<ApiKey> {
  const response = await apiClient.post('/api-keys', data);
  return response.data;
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const response = await apiClient.get('/api-keys');
  return response.data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiClient.delete(`/api-keys/${id}`);
}

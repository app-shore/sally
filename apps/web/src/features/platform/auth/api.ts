import { apiClient } from '@/shared/lib/api';
import type {
  Tenant,
  UserSummary,
  UserLookupRequest,
  UserLookupResponse,
  LoginRequest,
  LoginResponse,
} from './types';

export const authApi = {
  /**
   * Lookup user by email or phone (simplified login flow)
   */
  lookupUser: async (data: UserLookupRequest): Promise<UserLookupResponse> => {
    return apiClient<UserLookupResponse>('/auth/lookup-user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Fetch available tenants (public)
   * @deprecated Use lookupUser instead
   */
  listTenants: async (): Promise<Tenant[]> => {
    return apiClient<Tenant[]>('/auth/tenants');
  },

  /**
   * Fetch users for a tenant and role (public, for login screen)
   * @deprecated Use lookupUser instead
   */
  listUsersForTenant: async (tenantId: string, role?: string): Promise<UserSummary[]> => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient<UserSummary[]>(`/auth/tenants/${tenantId}/users${query}`);
  },

  /**
   * Login with user_id (tenant_id is optional - userId is globally unique)
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Logout and revoke refresh token
   */
  logout: async (): Promise<void> => {
    return apiClient<void>('/auth/logout', {
      method: 'POST',
    });
  },

  /**
   * Refresh access token using refresh token cookie
   */
  refreshToken: async (): Promise<LoginResponse> => {
    return apiClient<LoginResponse>('/auth/refresh', {
      method: 'POST',
    });
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<LoginResponse['user']> => {
    return apiClient<LoginResponse['user']>('/auth/me');
  },
};

// Re-export legacy functions for backwards compatibility during migration
export const lookupUser = authApi.lookupUser;
export const listTenants = authApi.listTenants;
export const listUsersForTenant = authApi.listUsersForTenant;
export const login = authApi.login;
export const logout = authApi.logout;
export const refreshToken = authApi.refreshToken;
export const getProfile = authApi.getProfile;

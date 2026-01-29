import { api } from './client';

export interface Tenant {
  tenantId: string;
  companyName: string;
  subdomain?: string;
  isActive: boolean;
}

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'DISPATCHER' | 'DRIVER' | 'ADMIN';
}

export interface UserSummary {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  driverId?: string;
  driverName?: string;
}

export interface LoginRequest {
  tenant_id: string;
  user_id: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'DISPATCHER' | 'DRIVER' | 'ADMIN';
    tenantId: string;
    tenantName: string;
    driverId?: string;
    driverName?: string;
    isActive: boolean;
  };
}

// Fetch available tenants (public)
export async function listTenants(): Promise<Tenant[]> {
  return api.get('/auth/tenants');
}

// Fetch users for a tenant and role (public, for login screen)
export async function listUsersForTenant(
  tenantId: string,
  role?: string
): Promise<UserSummary[]> {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  const query = params.toString() ? `?${params.toString()}` : '';
  return api.get(`/auth/tenants/${tenantId}/users${query}`);
}

// Login with tenant and user selection
export async function login(data: LoginRequest): Promise<LoginResponse> {
  return api.post('/auth/login', data);
}

// Logout and revoke refresh token
export async function logout(): Promise<void> {
  return api.post('/auth/logout');
}

// Refresh access token using refresh token cookie
export async function refreshToken(): Promise<LoginResponse> {
  return api.post('/auth/refresh');
}

// Get current user profile
export async function getProfile(): Promise<LoginResponse['user']> {
  return api.get('/auth/me');
}

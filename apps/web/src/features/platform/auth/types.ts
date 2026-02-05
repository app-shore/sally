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

export interface UserLookupRequest {
  email?: string;
  phone?: string;
}

export interface UserLookupResult {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenantName: string;
  driverId?: string;
  driverName?: string;
}

export interface UserLookupResponse {
  users: UserLookupResult[];
  multiTenant: boolean;
}

export interface LoginRequest {
  tenant_id?: string; // Optional - userId is globally unique
  user_id: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
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

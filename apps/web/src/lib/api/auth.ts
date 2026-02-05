/**
 * @deprecated This file is deprecated. Import from '@/features/platform/auth' instead.
 * This re-export is provided for backwards compatibility during migration.
 */

export {
  authApi,
  lookupUser,
  listTenants,
  listUsersForTenant,
  login,
  logout,
  refreshToken,
  getProfile,
} from '@/features/platform/auth/api';

export type {
  Tenant,
  User,
  UserSummary,
  UserLookupRequest,
  UserLookupResult,
  UserLookupResponse,
  LoginRequest,
  LoginResponse,
} from '@/features/platform/auth/types';

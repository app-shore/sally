/**
 * Legacy sessionStore - Now a wrapper around the new authStore
 *
 * This maintains backward compatibility with existing code while
 * using the new Firebase authentication system under the hood.
 */

import { useAuthStore } from '@/stores/auth-store';

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'DISPATCHER' | 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';
  tenantId: string;
  tenantName: string;
  driverId?: string;
  driverName?: string;
  isActive: boolean;
}

interface SessionState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface SessionActions {
  login: (accessToken: string, user: User) => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  restoreSession: () => void;
}

type SessionStore = SessionState & SessionActions;

/**
 * Wrapper hook that delegates to authStore
 */
export const useSessionStore = (): SessionStore => {
  const authStore = useAuthStore();

  return {
    // Map authStore state to sessionStore interface
    user: authStore.user as User | null,
    accessToken: authStore.accessToken,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,

    // Delegate actions to authStore
    login: (accessToken: string, user: User) => {
      authStore.setTokens(accessToken, authStore.refreshToken || '');
      authStore.setUser(user);
    },

    logout: async () => {
      await authStore.signOut();
    },

    refreshToken: async () => {
      // No-op: Firebase handles token refresh automatically
      // This is here for backward compatibility
      return Promise.resolve();
    },

    setLoading: (loading: boolean) => {
      // No-op: authStore manages its own loading state
    },

    restoreSession: () => {
      // No-op: Zustand persist handles this automatically
    },
  };
};

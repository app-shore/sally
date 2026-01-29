import { create } from 'zustand';

interface User {
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const useSessionStore = create<SessionStore>()((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  login: (accessToken, user) => {
    set({
      accessToken,
      user,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    const { accessToken } = get();
    if (accessToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  refreshToken: async () => {
    try {
      set({ isLoading: true });
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Send httpOnly refresh token cookie
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      set({
        accessToken: data.accessToken,
        user: data.user,
        isAuthenticated: true,
      });

      // Update localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      // Refresh failed, clear session
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),

  restoreSession: () => {
    // Restore from localStorage on page load
    const accessToken = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (accessToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({
          accessToken,
          user,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      }
    }
  },
}));

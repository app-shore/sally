import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/shared/lib/firebase';

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'SUPER_ADMIN';
  tenantId?: string;
  tenantName?: string;
  driverId?: string;
}

interface AuthState {
  // State
  user: User | null;
  firebaseUser: FirebaseUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  isInitialized: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<User | null>;
  setHasHydrated: (state: boolean) => void;
  setInitialized: (state: boolean) => void;
  signUp: (email: string, password: string) => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  exchangeFirebaseToken: (firebaseToken: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setFirebaseUser: (firebaseUser: FirebaseUser | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      firebaseUser: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,
      isInitialized: false,

      // Sign in with email/password
      signIn: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const firebaseToken = await userCredential.user.getIdToken();

          // Exchange Firebase token for SALLY JWT
          await get().exchangeFirebaseToken(firebaseToken);

          set({
            firebaseUser: userCredential.user,
            isLoading: false,
            isInitialized: true,
          });

          // Return the user object for redirect logic
          return get().user;
        } catch (error) {
          set({ isLoading: false, isInitialized: false });
          throw error;
        }
      },

      // Sign up (only creates Firebase account, not SALLY user)
      signUp: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          set({ isLoading: false });
          return userCredential.user;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Sign out
      signOut: async () => {
        await firebaseSignOut(auth);
        set({
          user: null,
          firebaseUser: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      // Reset password
      resetPassword: async (email: string) => {
        await sendPasswordResetEmail(auth, email);
      },

      // Exchange Firebase token for SALLY JWT
      exchangeFirebaseToken: async (firebaseToken: string) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const response = await fetch(`${apiUrl}/auth/firebase/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebaseToken }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Token exchange failed');
        }

        const data = await response.json();

        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },

      // Setters
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setInitialized: (state) => set({ isInitialized: state }),
      clearAuth: () =>
        set({
          user: null,
          firebaseUser: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isInitialized: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // If we have valid auth data after hydration, mark as initialized
        if (state?.accessToken && state?.user) {
          state?.setInitialized(true);
        }
      },
    },
  ),
);

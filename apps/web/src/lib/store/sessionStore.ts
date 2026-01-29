import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserType = 'dispatcher' | 'driver';

interface SessionState {
  user_type: UserType | null;
  user_id: string | null;
  session_id: string | null;
  is_authenticated: boolean;
  isAuthenticated: boolean; // Alias for is_authenticated
}

interface SessionActions {
  login: (user_type: UserType, user_id: string, session_id: string) => void;
  logout: () => void;
}

type SessionStore = SessionState & SessionActions;

const initialState: SessionState = {
  user_type: null,
  user_id: null,
  session_id: null,
  is_authenticated: false,
  isAuthenticated: false,
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      ...initialState,
      login: (user_type, user_id, session_id) =>
        set({
          user_type,
          user_id,
          session_id,
          is_authenticated: true,
          isAuthenticated: true,
        }),
      logout: () => set(initialState),
    }),
    {
      name: 'sally-session',
    }
  )
);

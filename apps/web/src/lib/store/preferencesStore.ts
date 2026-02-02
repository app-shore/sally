import { create } from 'zustand';
import {
  UserPreferences,
  DispatcherPreferences,
  DriverPreferences,
  getUserPreferences,
  updateUserPreferences,
  getDispatcherPreferences,
  updateDispatcherPreferences,
  getDriverPreferences,
  updateDriverPreferences,
  resetToDefaults as resetToDefaultsAPI,
} from '../api/preferences';

interface PreferencesState {
  // Preferences data
  userPreferences: UserPreferences | null;
  dispatcherPreferences: DispatcherPreferences | null;
  driverPreferences: DriverPreferences | null;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  loadUserPreferences: () => Promise<void>;
  loadDispatcherPreferences: () => Promise<void>;
  loadDriverPreferences: () => Promise<void>;
  loadAllPreferences: (userRole: string) => Promise<void>;

  updateUserPrefs: (updates: Partial<UserPreferences>) => Promise<void>;
  updateDispatcherPrefs: (updates: Partial<DispatcherPreferences>) => Promise<void>;
  updateDriverPrefs: (updates: Partial<DriverPreferences>) => Promise<void>;

  resetToDefaults: (scope: 'user' | 'dispatcher' | 'driver') => Promise<void>;
  clearError: () => void;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  // Initial state
  userPreferences: null,
  dispatcherPreferences: null,
  driverPreferences: null,
  isLoading: false,
  isSaving: false,
  error: null,

  // Load user preferences
  loadUserPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const preferences = await getUserPreferences();
      set({ userPreferences: preferences, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Load dispatcher preferences
  loadDispatcherPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const preferences = await getDispatcherPreferences();
      set({ dispatcherPreferences: preferences, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Load driver preferences
  loadDriverPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const preferences = await getDriverPreferences();
      set({ driverPreferences: preferences, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Load all preferences based on role
  loadAllPreferences: async (userRole: string) => {
    set({ isLoading: true, error: null });
    try {
      // Always load user preferences
      const userPrefs = await getUserPreferences();
      set({ userPreferences: userPrefs });

      // Load role-specific preferences
      if (userRole === 'DISPATCHER' || userRole === 'ADMIN' || userRole === 'OWNER') {
        const dispatcherPrefs = await getDispatcherPreferences();
        set({ dispatcherPreferences: dispatcherPrefs });
      }

      if (userRole === 'DRIVER') {
        const driverPrefs = await getDriverPreferences();
        set({ driverPreferences: driverPrefs });
      }

      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Update user preferences
  updateUserPrefs: async (updates: Partial<UserPreferences>) => {
    set({ isSaving: true, error: null });
    try {
      const updatedPreferences = await updateUserPreferences(updates);
      set({ userPreferences: updatedPreferences, isSaving: false });
    } catch (error: any) {
      set({ error: error.message, isSaving: false });
      throw error;
    }
  },

  // Update dispatcher preferences
  updateDispatcherPrefs: async (updates: Partial<DispatcherPreferences>) => {
    set({ isSaving: true, error: null });
    try {
      const updatedPreferences = await updateDispatcherPreferences(updates);
      set({ dispatcherPreferences: updatedPreferences, isSaving: false });
    } catch (error: any) {
      set({ error: error.message, isSaving: false });
      throw error;
    }
  },

  // Update driver preferences
  updateDriverPrefs: async (updates: Partial<DriverPreferences>) => {
    set({ isSaving: true, error: null });
    try {
      const updatedPreferences = await updateDriverPreferences(updates);
      set({ driverPreferences: updatedPreferences, isSaving: false });
    } catch (error: any) {
      set({ error: error.message, isSaving: false });
      throw error;
    }
  },

  // Reset to defaults
  resetToDefaults: async (scope: 'user' | 'dispatcher' | 'driver') => {
    set({ isSaving: true, error: null });
    try {
      const resetPreferences = await resetToDefaultsAPI(scope);

      if (scope === 'user') {
        set({ userPreferences: resetPreferences });
      } else if (scope === 'dispatcher') {
        set({ dispatcherPreferences: resetPreferences });
      } else if (scope === 'driver') {
        set({ driverPreferences: resetPreferences });
      }

      set({ isSaving: false });
    } catch (error: any) {
      set({ error: error.message, isSaving: false });
      throw error;
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

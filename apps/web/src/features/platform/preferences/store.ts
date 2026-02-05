import { create } from 'zustand';
import {
  UserPreferences,
  OperationsSettings,
  DriverPreferences,
  getUserPreferences,
  updateUserPreferences,
  getOperationsSettings,
  updateOperationsSettings,
  getDriverPreferences,
  updateDriverPreferences,
  resetToDefaults as resetToDefaultsAPI,
} from '@/features/platform/preferences';

interface PreferencesState {
  // Preferences data
  userPreferences: UserPreferences | null;
  operationsSettings: OperationsSettings | null;
  driverPreferences: DriverPreferences | null;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  loadUserPreferences: () => Promise<void>;
  loadOperationsSettings: () => Promise<void>;
  loadDriverPreferences: () => Promise<void>;
  loadAllPreferences: (userRole: string) => Promise<void>;

  updateUserPrefs: (updates: Partial<UserPreferences>) => Promise<void>;
  updateOperationsSettings: (updates: Partial<OperationsSettings>) => Promise<void>;
  updateDriverPrefs: (updates: Partial<DriverPreferences>) => Promise<void>;

  resetToDefaults: (scope: 'user' | 'operations' | 'driver') => Promise<void>;
  clearError: () => void;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  // Initial state
  userPreferences: null,
  operationsSettings: null,
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

  // Load operations settings
  loadOperationsSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await getOperationsSettings();
      set({ operationsSettings: settings, isLoading: false });
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
        const operationsSettings = await getOperationsSettings();
        set({ operationsSettings });
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

  // Update operations settings
  updateOperationsSettings: async (updates: Partial<OperationsSettings>) => {
    set({ isSaving: true, error: null });
    try {
      const updatedSettings = await updateOperationsSettings(updates);
      set({ operationsSettings: updatedSettings, isSaving: false });
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
  resetToDefaults: async (scope: 'user' | 'operations' | 'driver') => {
    set({ isSaving: true, error: null });
    try {
      const resetPreferences = await resetToDefaultsAPI(scope);

      if (scope === 'user') {
        set({ userPreferences: resetPreferences });
      } else if (scope === 'operations') {
        set({ operationsSettings: resetPreferences });
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

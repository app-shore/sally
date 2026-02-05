import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  category: string;
}

interface FeatureFlagsState {
  flags: FeatureFlag[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  setFlags: (flags: FeatureFlag[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  isEnabled: (key: string) => boolean;
  getFlag: (key: string) => FeatureFlag | undefined;
  getFlagsByCategory: (category: string) => FeatureFlag[];
  clearCache: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  persist(
    (set, get) => ({
      flags: [],
      isLoading: false,
      error: null,
      lastFetched: null,

      setFlags: (flags) =>
        set({
          flags,
          lastFetched: Date.now(),
          error: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      isEnabled: (key) => {
        const flag = get().flags.find((f) => f.key === key);
        return flag?.enabled ?? false;
      },

      getFlag: (key) => {
        return get().flags.find((f) => f.key === key);
      },

      getFlagsByCategory: (category) => {
        return get().flags.filter((f) => f.category === category);
      },

      clearCache: () =>
        set({
          flags: [],
          lastFetched: null,
          error: null,
        }),
    }),
    {
      name: 'feature-flags-storage',
      partialize: (state) => ({
        flags: state.flags,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

// Helper to check if cache is stale
export const isCacheStale = (): boolean => {
  const { lastFetched } = useFeatureFlagsStore.getState();
  if (!lastFetched) return true;
  return Date.now() - lastFetched > CACHE_DURATION;
};

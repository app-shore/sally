import { create } from 'zustand';
import { getOnboardingStatus } from '@/lib/api/onboarding';

export interface OnboardingItem {
  id: string;
  title: string;
  complete: boolean;
  metadata: Record<string, any>;
}

export interface OnboardingStatus {
  overallProgress: number;
  criticalComplete: boolean;
  recommendedComplete: boolean;
  optionalComplete: boolean;
  items: {
    critical: OnboardingItem[];
    recommended: OnboardingItem[];
    optional: OnboardingItem[];
  };
}

interface OnboardingStore {
  status: OnboardingStatus | null;
  loading: boolean;
  error: string | null;

  // Computed properties
  criticalItemsComplete: boolean;
  recommendedItemsComplete: boolean;
  optionalItemsComplete: boolean;
  incompleteCriticalItems: OnboardingItem[];
  incompleteRecommendedItems: OnboardingItem[];
  criticalIncompleteCount: number;
  recommendedIncompleteCount: number;

  // Actions
  fetchStatus: () => Promise<void>;
  refetchStatus: () => Promise<void>;
  dismissBanner: () => void;
  dismissSoftWarning: () => void;
  isBannerDismissed: () => boolean;
  isSoftWarningDismissed: () => boolean;
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  status: null,
  loading: false,
  error: null,

  // Computed properties
  get criticalItemsComplete() {
    return get().status?.criticalComplete ?? true;
  },

  get recommendedItemsComplete() {
    return get().status?.recommendedComplete ?? true;
  },

  get optionalItemsComplete() {
    return get().status?.optionalComplete ?? true;
  },

  get incompleteCriticalItems() {
    return get().status?.items.critical.filter((item) => !item.complete) ?? [];
  },

  get incompleteRecommendedItems() {
    return get().status?.items.recommended.filter((item) => !item.complete) ?? [];
  },

  get criticalIncompleteCount() {
    return get().incompleteCriticalItems.length;
  },

  get recommendedIncompleteCount() {
    return get().incompleteRecommendedItems.length;
  },

  // Actions
  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const status = await getOnboardingStatus();
      set({ status, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  refetchStatus: async () => {
    // Silent refetch (no loading state)
    try {
      const status = await getOnboardingStatus();
      set({ status });
    } catch (error: any) {
      console.error('Failed to refetch onboarding status:', error);
    }
  },

  dismissBanner: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('onboarding-banner-dismissed', 'true');
    }
  },

  dismissSoftWarning: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('onboarding-soft-warning-dismissed', 'true');
    }
  },

  isBannerDismissed: () => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('onboarding-banner-dismissed') === 'true';
  },

  isSoftWarningDismissed: () => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('onboarding-soft-warning-dismissed') === 'true';
  },
}));

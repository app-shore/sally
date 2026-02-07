'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { OnboardingBanner } from '@/features/platform/onboarding';
import { useAuthStore } from '@/features/auth';
import { useOnboardingStore } from '@/features/platform/onboarding';
import { useQuery } from '@tanstack/react-query';
import { listAlerts } from '@/features/operations/alerts';
import { cn } from '@/shared/lib/utils';
import { useSSE } from '@/shared/hooks/use-sse';
import { useAlertSound } from '@/shared/hooks/use-alert-sound';
import { useTabTitle } from '@/shared/hooks/use-tab-title';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const {
    criticalItemsComplete,
    criticalIncompleteCount,
    dismissBanner,
    isBannerDismissed,
    fetchStatus
  } = useOnboardingStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Fetch alert count
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: () => listAlerts({ status: 'active' }),
    refetchInterval: 30000, // Poll every 30 seconds
    enabled: isAuthenticated,
  });

  const alertCount = alerts.length;
  const criticalCount = alerts.filter((a) => a.priority === 'critical' && a.status === 'active').length;

  // Sound and tab title notifications
  const { playAlertSound } = useAlertSound();
  useTabTitle(criticalCount);

  // Real-time updates via SSE
  useSSE({
    enabled: isAuthenticated,
    onAlertNew: (alert) => {
      playAlertSound(alert.priority);
    },
  });

  // Initialize onboarding store for OWNER/ADMIN
  useEffect(() => {
    if (isAuthenticated && (user?.role === 'OWNER' || user?.role === 'ADMIN')) {
      fetchStatus();
    }
  }, [isAuthenticated, user?.role, fetchStatus]);

  // Check banner dismissal on mount
  useEffect(() => {
    setBannerDismissed(isBannerDismissed());
  }, [isBannerDismissed]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleDismissBanner = () => {
    dismissBanner();
    setBannerDismissed(true);
  };

  const showOnboardingBanner =
    !bannerDismissed &&
    !criticalItemsComplete &&
    (user?.role === 'OWNER' || user?.role === 'ADMIN') &&
    pathname !== '/setup-hub';

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header - Full width at top */}
      <AppHeader
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        alertCount={alertCount}
      />

      {/* Onboarding Banner - Below header */}
      {showOnboardingBanner && (
        <OnboardingBanner
          incompleteCount={criticalIncompleteCount}
          onDismiss={handleDismissBanner}
        />
      )}

      {/* Content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Below header */}
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main content - Adjust margin based on sidebar state */}
        <main
          className={cn(
            'flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 transition-all duration-300',
            sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
          )}
        >
          {/* Remove max-w-7xl constraint - let pages control their own width */}
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;

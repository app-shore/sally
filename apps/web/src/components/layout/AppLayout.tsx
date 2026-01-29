'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { AlertsPanel } from './AlertsPanel';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useQuery } from '@tanstack/react-query';
import { listAlerts } from '@/lib/api/alerts';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user_type } = useSessionStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);

  // Fetch alert count
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: () => listAlerts({ status: 'active' }),
    refetchInterval: 30000, // Poll every 30 seconds
    enabled: isAuthenticated,
  });

  const alertCount = alerts.length;

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // Role-based route protection
    if (pathname?.startsWith('/dispatcher') && user_type !== 'dispatcher') {
      router.push('/driver/dashboard');
    } else if (pathname?.startsWith('/driver') && user_type !== 'driver') {
      router.push('/dispatcher/overview');
    }
  }, [isAuthenticated, user_type, pathname, router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        alertCount={alertCount}
        onOpenAlerts={() => setAlertsPanelOpen(true)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <AppHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          alertCount={alertCount}
          onOpenAlerts={() => setAlertsPanelOpen(true)}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Alerts panel */}
      <AlertsPanel
        isOpen={alertsPanelOpen}
        onClose={() => setAlertsPanelOpen(false)}
      />
    </div>
  );
}

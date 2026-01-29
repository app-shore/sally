'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { GlobalSallyChat } from '@/components/chat/GlobalSallyChat';
import { useChatStore } from '@/lib/store/chatStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { isProtectedRoute } from '@/lib/navigation';

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDocked } = useChatStore();
  const { isAuthenticated, refreshToken, isLoading, restoreSession } = useSessionStore();
  const [isRestoring, setIsRestoring] = useState(true);

  // Determine if current page requires authentication using centralized logic
  const requiresAuth = pathname ? isProtectedRoute(pathname) : false;

  // Restore session on page load
  useEffect(() => {
    async function restore() {
      // First try to restore from localStorage
      restoreSession();

      // Then try to refresh token if not authenticated
      if (!isAuthenticated) {
        try {
          await refreshToken();
          console.log('Session restored from refresh token');
        } catch (error) {
          console.log('No valid session to restore');
        }
      }
      setIsRestoring(false);
    }

    restore();
  }, []);

  // Redirect to login if trying to access protected page without auth
  useEffect(() => {
    if (requiresAuth && !isAuthenticated && !isRestoring) {
      router.push('/');
    }
  }, [requiresAuth, isAuthenticated, isRestoring, pathname, router]);

  // Show loading spinner while restoring session
  if (isRestoring || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground" />
      </div>
    );
  }

  // Protected pages use AppLayout (authenticated UI)
  if (requiresAuth) {
    return (
      <>
        <div className={`sally-chat-container ${isDocked ? 'docked' : ''}`}>
          <AppLayout>{children}</AppLayout>
        </div>
        <GlobalSallyChat />
      </>
    );
  }

  // Public pages use PublicLayout (landing, login)
  return (
    <>
      <div className={`sally-chat-container ${isDocked ? 'docked' : ''}`}>
        <PublicLayout>{children}</PublicLayout>
      </div>
      <GlobalSallyChat />
    </>
  );
}

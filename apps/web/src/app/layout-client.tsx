'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { GlobalSallyChat } from '@/components/chat/GlobalSallyChat';
import { useChatStore } from '@/lib/store/chatStore';
import { useAuthStore } from '@/stores/auth-store';
import { isProtectedRoute, getDefaultRouteForRole } from '@/lib/navigation';

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDocked } = useChatStore();
  const { isAuthenticated, _hasHydrated, isInitialized, accessToken, user } = useAuthStore();

  const requiresAuth = pathname ? isProtectedRoute(pathname) : false;

  console.log('[LayoutClient] Render:', {
    pathname,
    requiresAuth,
    isAuthenticated,
    _hasHydrated,
    isInitialized,
    hasAccessToken: !!accessToken,
  });

  // Single auth check - redirect if needed
  useEffect(() => {
    if (!_hasHydrated) return; // Wait for storage to load

    console.log('[LayoutClient] Auth check:', { requiresAuth, isAuthenticated, pathname, userRole: user?.role });

    // Redirect unauthenticated users from protected routes to login
    if (requiresAuth && !isAuthenticated) {
      console.log('[LayoutClient] Redirecting to login');
      router.push('/login');
      return;
    }

    // Redirect authenticated users from login/root to their dashboard
    if (isAuthenticated && (pathname === '/login' || pathname === '/')) {
      const defaultRoute = getDefaultRouteForRole(user?.role as any);
      console.log('[LayoutClient] Redirecting authenticated user to:', defaultRoute);
      router.push(defaultRoute);
    }
  }, [_hasHydrated, requiresAuth, isAuthenticated, pathname, user?.role, router]);

  // Loading state
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground" />
      </div>
    );
  }

  // Render layout based on route type
  const Layout = requiresAuth ? AppLayout : PublicLayout;

  return (
    <>
      <div className={`sally-chat-container ${isDocked ? 'docked' : ''}`}>
        <Layout>{children}</Layout>
      </div>
      <GlobalSallyChat />
    </>
  );
}

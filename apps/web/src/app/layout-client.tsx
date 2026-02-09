"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { PublicLayout } from "@/shared/components/layout/PublicLayout";
import { SallyGlobalProvider, useSallyStore } from "@/features/platform/sally-ai";
import { useAuthStore } from "@/features/auth";
import { isProtectedRoute, getDefaultRouteForRole } from "@/shared/lib/navigation";

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isExpanded } = useSallyStore();
  const { isAuthenticated, _hasHydrated, isInitialized, accessToken, user } =
    useAuthStore();

  const requiresAuth = pathname ? isProtectedRoute(pathname) : false;

  console.log("[LayoutClient] Render:", {
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
    if (!pathname) return; // Wait for pathname to be set

    console.log("[LayoutClient] Auth check:", {
      requiresAuth,
      isAuthenticated,
      pathname,
      userRole: user?.role,
    });

    // Redirect unauthenticated users from protected routes to login
    if (requiresAuth && !isAuthenticated) {
      console.log("[LayoutClient] Redirecting to login");
      router.push("/login");
      return;
    }

    // Only redirect authenticated users from login page (allow viewing landing page)
    if (isAuthenticated && pathname === "/login") {
      const defaultRoute = getDefaultRouteForRole(user?.role as any);
      console.log(
        "[LayoutClient] Redirecting authenticated user from login to:",
        defaultRoute,
      );
      router.push(defaultRoute);
    }
  }, [
    _hasHydrated,
    requiresAuth,
    isAuthenticated,
    pathname,
    user?.role,
    router,
  ]);

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
      <div className={`sally-main-content ${isExpanded ? 'sally-panel-open' : ''}`}>
        <Layout>{children}</Layout>
      </div>
      <SallyGlobalProvider />
    </>
  );
}

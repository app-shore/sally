"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/features/auth";
import { useAuthStore } from "@/features/auth";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for storage to hydrate

    if (isAuthenticated && user) {
      // Redirect authenticated users to their home page
      const redirectMap = {
        SUPER_ADMIN: "/admin/tenants",
        ADMIN: "/users",
        DISPATCHER: "/dispatcher/overview",
        DRIVER: "/driver/dashboard",
      };

      const redirectUrl =
        redirectMap[user.role as keyof typeof redirectMap] || "/";
      router.push(redirectUrl);
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  // Show loading while hydrating
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground" />
      </div>
    );
  }

  // Don't render login form if user is authenticated (they're being redirected)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <LoginForm />
    </div>
  );
}

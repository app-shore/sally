"use client";

/**
 * Driver Route View - Mobile-optimized vertical timeline
 *
 * Purpose: Answer driver's question "What's my day look like?"
 *
 * TODO: Implement when route-planning feature module is built.
 * Requires: @/features/routing/route-planning (store + driver components)
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth";
import { Card } from "@/shared/components/ui/card";

export default function DriverRoutePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "DRIVER") {
      router.push("/");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "DRIVER") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Your Route
          </h1>
          <div className="text-muted-foreground">
            <p>No active route assigned.</p>
            <p className="text-sm mt-2">
              Contact dispatch for your route assignment.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

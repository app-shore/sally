"use client";

/**
 * Driver Route View - Mobile-optimized vertical timeline
 *
 * Purpose: Answer driver's question "What's my day look like?"
 *
 * Features:
 * - Vertical timeline (chronological top to bottom)
 * - Current location/next stop
 * - Simple HOS summary
 * - Driver action buttons
 * - Large touch targets (44px+)
 * - Mobile-first design
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth";
import { useRoutePlanStore } from "@/features/routing/route-planning";
import { Card } from "@/shared/components/ui/card";
import DriverTimeline from "@/features/routing/route-planning/components/driver/DriverTimeline";
import DriverCurrentStatus from "@/features/routing/route-planning/components/driver/DriverCurrentStatus";
import DriverHOSSummary from "@/features/routing/route-planning/components/driver/DriverHOSSummary";
import DriverActions from "@/features/routing/route-planning/components/driver/DriverActions";

export default function DriverRoutePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { currentPlan } = useRoutePlanStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "DRIVER") {
      router.push("/");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "DRIVER") {
    return null;
  }

  if (!currentPlan) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card className="p-8 text-center">
          <div className="space-y-4">
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Your Route
          </h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Current Status */}
        <DriverCurrentStatus plan={currentPlan} />

        {/* HOS Summary */}
        <DriverHOSSummary plan={currentPlan} />

        {/* Full Day Timeline */}
        <DriverTimeline plan={currentPlan} />

        {/* Actions */}
        <DriverActions plan={currentPlan} />
      </div>
    </div>
  );
}

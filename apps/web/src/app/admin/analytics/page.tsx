"use client";

import { FeatureGuard } from "@/features/platform/feature-flags";

export default function AnalyticsPage() {
  return (
    <FeatureGuard featureKey="analytics_enabled">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Business intelligence and operational performance metrics
        </p>
      </div>
    </FeatureGuard>
  );
}

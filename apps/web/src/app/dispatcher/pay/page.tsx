"use client";

import { FeatureGuard } from "@/features/platform/feature-flags";

export default function PayPage() {
  return (
    <FeatureGuard featureKey="driver_pay_enabled">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Pay
        </h1>
        <p className="text-muted-foreground mt-1">
          Calculate and manage driver pay with flexible rate structures
        </p>
      </div>
    </FeatureGuard>
  );
}

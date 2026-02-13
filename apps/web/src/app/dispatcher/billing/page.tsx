"use client";

import { FeatureGuard } from "@/features/platform/feature-flags";

export default function BillingPage() {
  return (
    <FeatureGuard featureKey="billing_enabled">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Billing
        </h1>
        <p className="text-muted-foreground mt-1">
          Create, send, and track invoices for completed loads
        </p>
      </div>
    </FeatureGuard>
  );
}

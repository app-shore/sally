"use client";

/**
 * Consolidated Route Planning Wizard - Single-screen, map-first experience
 * Flow: Load → Driver (auto-suggested) → Vehicle (auto-suggested) → Generate Plan → Map View
 */

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { FeatureGuard } from "@/features/platform/feature-flags";
import { loadsApi } from "@/features/fleet/loads";
import type { Load } from "@/features/fleet/loads";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { MapPin } from "lucide-react";

function CreatePlanContent() {
  const searchParams = useSearchParams();
  const preloadId = searchParams.get("load_id");
  const [load, setLoad] = useState<Load | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (preloadId) {
      loadsApi
        .getById(preloadId)
        .then(setLoad)
        .catch((err) =>
          setLoadError(
            err instanceof Error ? err.message : "Failed to load load details"
          )
        );
    }
  }, [preloadId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Create Route Plan
        </h1>
        <p className="text-muted-foreground mt-1">
          Plan optimized routes with zero HOS violations and automatic rest stop
          insertion
        </p>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {load && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Planning route for Load {load.load_number}
              <Badge variant="outline">{load.status.replace("_", " ")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Customer</span>
                <p className="font-medium text-foreground">
                  {load.customer_name}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Weight</span>
                <p className="font-medium text-foreground">
                  {load.weight_lbs.toLocaleString()} lbs
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Commodity</span>
                <p className="font-medium text-foreground">
                  {load.commodity_type}
                </p>
              </div>
            </div>

            {load.stops.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">
                  Stops ({load.stops.length})
                </span>
                <div className="space-y-2">
                  {load.stops.map((stop, index) => (
                    <div
                      key={stop.id}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                    >
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                          stop.action_type === "pickup"
                            ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                            : "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {stop.stop_name || "Unnamed stop"}
                        {stop.stop_city && stop.stop_state
                          ? ` — ${stop.stop_city}, ${stop.stop_state}`
                          : ""}
                      </span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {stop.action_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!preloadId && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              Route planning wizard coming soon. Navigate from the Loads page to
              plan a route for a specific load.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CreatePlanPage() {
  return (
    <FeatureGuard featureKey="route_planning_enabled">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Create Route Plan
              </h1>
              <p className="text-muted-foreground mt-1">Loading...</p>
            </div>
          </div>
        }
      >
        <CreatePlanContent />
      </Suspense>
    </FeatureGuard>
  );
}

"use client";

/**
 * Fuel Stop Details - Fuel stop analysis
 *
 * Lists each fuel stop with:
 * - Gallons, price per gallon, total cost
 * - Station name
 * - Alternatives (if available)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { RoutePlan } from "@/features/routing/route-planning";
import { Fuel } from "lucide-react";

interface FuelStopDetailsProps {
  plan: RoutePlan;
}

export default function FuelStopDetails({ plan }: FuelStopDetailsProps) {
  const { segments } = plan;

  const fuelStops = segments.filter((s) => s.segment_type === "fuel");

  if (fuelStops.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Fuel Stop Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No fuel stops in this route</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Fuel Stop Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fuelStops.map((stop, idx) => {
            const gallons = stop.fuel_gallons || 0;
            const cost = stop.fuel_cost_estimate || 0;
            const pricePerGallon = gallons > 0 ? cost / gallons : 0;

            return (
              <div
                key={idx}
                className="p-4 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
              >
                <div className="flex items-start gap-3">
                  <Fuel className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="font-medium text-foreground">
                      Stop #{idx + 1}: {stop.fuel_station_name || "Fuel Station"}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Gallons</div>
                        <div className="font-semibold text-foreground">{gallons.toFixed(0)} gal</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Price/Gallon</div>
                        <div className="font-semibold text-foreground">${pricePerGallon.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Total Cost</div>
                        <div className="font-semibold text-foreground">${cost.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Alternative (placeholder - would come from fuel API) */}
                    <div className="mt-3 p-2 rounded-md bg-background/50 text-xs text-muted-foreground">
                      Alternative: Love's +2 miles (+$12 cost)
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

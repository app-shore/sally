"use client";

import { Package, MapPin } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { RoutePlanLoad } from "@/features/routing/route-planning";

interface LoadDetailsProps {
  loads: RoutePlanLoad[];
}

export function LoadDetails({ loads }: LoadDetailsProps) {
  if (!loads || loads.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Loads ({loads.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loads.map((item) => {
          const load = item.load;
          return (
            <div
              key={item.id}
              className="p-3 rounded-md bg-muted/30 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {load.loadNumber}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                    {load.status}
                  </Badge>
                </div>
                {load.rateCents != null && load.rateCents > 0 && (
                  <span className="text-sm font-medium text-foreground flex-shrink-0">
                    ${(load.rateCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{load.customerName}</span>
                  <span>&middot;</span>
                  <span>{load.commodityType}</span>
                  <span>&middot;</span>
                  <span>{load.weightLbs?.toLocaleString()} lbs</span>
                  {load.pieces && (
                    <>
                      <span>&middot;</span>
                      <span>{load.pieces} pcs</span>
                    </>
                  )}
                  {load.equipmentType && (
                    <>
                      <span>&middot;</span>
                      <span>{load.equipmentType}</span>
                    </>
                  )}
                </div>

                {/* Stops */}
                {load.stops && load.stops.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span>
                      {load.stops.map((s, i) => (
                        <span key={i}>
                          {i > 0 && " → "}
                          <span className="capitalize">{s.actionType}</span>{" "}
                          {s.stop.city}, {s.stop.state}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { RouteSegment, RoutePlanResult } from "@/features/routing/route-planning";

interface SallyDecisionsProps {
  plan: RoutePlanResult;
}

function computeDecisions(segments: RouteSegment[]) {
  let restStops = 0;
  let breaks = 0;
  let fuelStops = 0;
  let totalFuelCost = 0;
  let dockRestConversions = 0;

  for (const seg of segments) {
    if (seg.segmentType === "rest") restStops++;
    if (seg.segmentType === "break") breaks++;
    if (seg.segmentType === "fuel") {
      fuelStops++;
      totalFuelCost += seg.fuelCostEstimate || 0;
    }
    if (seg.segmentType === "dock" && seg.isDocktimeConverted) dockRestConversions++;
  }

  return { restStops, breaks, fuelStops, totalFuelCost, dockRestConversions };
}

function formatRestType(type?: string): string {
  switch (type) {
    case "auto": return "Auto";
    case "full": return "Full rest only";
    case "split_8_2": return "Split 8+2";
    case "split_7_3": return "Split 7+3";
    default: return "Auto";
  }
}

function formatPriority(priority?: string): string {
  switch (priority) {
    case "minimize_time": return "Fastest";
    case "minimize_cost": return "Cheapest";
    case "balance": return "Balanced";
    default: return "Balanced";
  }
}

export function SallyDecisions({ plan }: SallyDecisionsProps) {
  const decisions = computeDecisions(plan.segments);
  const params = plan.dispatcherParams;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">SALLY&apos;s Decisions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* HOS Compliance */}
        <div>
          <div className="font-medium text-foreground mb-1">HOS Compliance</div>
          <div className="space-y-0.5 text-muted-foreground">
            <div>
              {plan.isFeasible
                ? "Zero violations"
                : "Feasibility issues detected"}
            </div>
            {decisions.restStops > 0 && (
              <div>{decisions.restStops} rest stop{decisions.restStops > 1 ? "s" : ""} inserted</div>
            )}
            {decisions.breaks > 0 && (
              <div>{decisions.breaks} mandatory break{decisions.breaks > 1 ? "s" : ""}</div>
            )}
            {decisions.dockRestConversions > 0 && (
              <div>{decisions.dockRestConversions} dock-to-rest credit{decisions.dockRestConversions > 1 ? "s" : ""}</div>
            )}
          </div>
        </div>

        {/* Fuel */}
        {decisions.fuelStops > 0 && (
          <div>
            <div className="font-medium text-foreground mb-1">Fuel Optimization</div>
            <div className="space-y-0.5 text-muted-foreground">
              <div>{decisions.fuelStops} fuel stop{decisions.fuelStops > 1 ? "s" : ""}</div>
              <div>
                ${decisions.totalFuelCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} total fuel cost
              </div>
            </div>
          </div>
        )}

        {/* Preferences */}
        <div>
          <div className="font-medium text-foreground mb-1">Your Preferences</div>
          <div className="space-y-0.5 text-muted-foreground">
            <div>Priority: {formatPriority(plan.optimizationPriority)}</div>
            <div>Rest type: {formatRestType(params?.preferredRestType)} (honored)</div>
            {params?.avoidTollRoads && <div>Avoid tolls: yes</div>}
            {params?.maxDetourMilesForFuel && (
              <div>Max fuel detour: {params.maxDetourMilesForFuel}mi</div>
            )}
          </div>
        </div>

        {/* Weather */}
        {plan.weatherAlerts && plan.weatherAlerts.length > 0 && (
          <div>
            <div className="font-medium text-foreground mb-1">Weather</div>
            <div className="space-y-0.5 text-muted-foreground">
              {plan.weatherAlerts.map((alert, i) => (
                <div key={i}>
                  {alert.severity === "severe" ? "SEVERE" : alert.severity === "moderate" ? "WARNING" : "INFO"}{" "}
                  {alert.description}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

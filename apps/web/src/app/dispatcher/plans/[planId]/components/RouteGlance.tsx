"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import type { RouteSegment } from "@/features/routing/route-planning";

interface RouteGlanceProps {
  segments: RouteSegment[];
}

function getDotColor(type: string): string {
  switch (type) {
    case "dock": return "bg-foreground";
    case "rest": return "bg-gray-500 dark:bg-gray-400";
    case "fuel": return "bg-gray-400 dark:bg-gray-500";
    case "break": return "bg-gray-400 dark:bg-gray-500";
    default: return "bg-muted-foreground";
  }
}

function getDotRing(type: string): string {
  switch (type) {
    case "dock": return "ring-2 ring-foreground/20";
    default: return "";
  }
}

function getLabel(segment: RouteSegment): string {
  if (segment.segmentType === "dock") {
    return segment.toLocation?.split(",")[0] || "Stop";
  }
  if (segment.segmentType === "rest") {
    const hours = segment.restDurationHours || 0;
    return `${Math.round(hours)}h Rest`;
  }
  if (segment.segmentType === "fuel") {
    return `Fuel $${segment.fuelPricePerGallon?.toFixed(2) || ""}`;
  }
  if (segment.segmentType === "break") return "Break";
  return "";
}

function getSubLabel(segment: RouteSegment): string {
  if (segment.segmentType === "dock") {
    return segment.actionType?.toUpperCase() || "";
  }
  if (segment.segmentType === "rest" && segment.restType) {
    return segment.restType.replace(/_/g, " ");
  }
  return "";
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Get the drive segment(s) between two non-drive nodes */
function getDriveBetween(
  segments: RouteSegment[],
  currentNodeIndex: number,
  nextNodeIndex: number
): { miles: number; hours: number } {
  let miles = 0;
  let hours = 0;

  const allNonDrive = segments.filter((s) => s.segmentType !== "drive");
  const currentSeg = allNonDrive[currentNodeIndex];
  const nextSeg = allNonDrive[nextNodeIndex];

  if (!currentSeg || !nextSeg) return { miles: 0, hours: 0 };

  const startIdx = segments.indexOf(currentSeg);
  const endIdx = segments.indexOf(nextSeg);

  for (let i = startIdx + 1; i < endIdx; i++) {
    if (segments[i].segmentType === "drive") {
      miles += segments[i].distanceMiles || 0;
      hours += segments[i].driveTimeHours || 0;
    }
  }

  return { miles, hours };
}

export function RouteGlance({ segments }: RouteGlanceProps) {
  const nodes = segments.filter((s) => s.segmentType !== "drive");

  if (nodes.length === 0) return null;

  return (
    <Card>
      <CardContent className="py-4 px-4 overflow-x-auto">
        <div className="flex items-center min-w-max gap-0">
          {nodes.map((node, index) => {
            const drive = index > 0 ? getDriveBetween(segments, index - 1, index) : null;

            return (
              <div
                key={node.segmentId}
                className="flex items-center animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
              >
                {/* Connector line with drive info */}
                {index > 0 && drive && (
                  <div className="flex flex-col items-center flex-shrink-0 mx-1">
                    <div className="text-[9px] text-muted-foreground tabular-nums whitespace-nowrap">
                      {drive.miles > 0 && `${Math.round(drive.miles)} mi`}
                    </div>
                    <div className="w-8 md:w-12 lg:w-16 h-px bg-border" />
                    <div className="text-[9px] text-muted-foreground tabular-nums whitespace-nowrap">
                      {drive.hours > 0 && formatDuration(drive.hours)}
                    </div>
                  </div>
                )}

                {/* Node — small dot matching timeline style */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`h-3 w-3 rounded-full ${getDotColor(node.segmentType)} ${getDotRing(node.segmentType)}`}
                  />
                  <span className="text-[10px] md:text-xs font-medium text-foreground mt-1.5 max-w-[80px] text-center truncate">
                    {getLabel(node)}
                  </span>
                  <span className="text-[9px] md:text-[10px] text-muted-foreground">
                    {getSubLabel(node)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

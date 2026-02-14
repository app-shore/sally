"use client";

import { MapPin, Moon, Fuel, Coffee } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { RouteSegment } from "@/features/routing/route-planning";

interface RouteGlanceProps {
  segments: RouteSegment[];
}

function GlanceIcon({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "dock": return <MapPin className={cls} />;
    case "rest": return <Moon className={cls} />;
    case "fuel": return <Fuel className={cls} />;
    case "break": return <Coffee className={cls} />;
    default: return <MapPin className={cls} />;
  }
}

function getNodeStyle(type: string): string {
  switch (type) {
    case "dock": return "bg-foreground text-background";
    case "rest": return "bg-gray-500 dark:bg-gray-400 text-white dark:text-black";
    case "fuel": return "bg-gray-400 dark:bg-gray-500 text-white";
    case "break": return "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200";
    default: return "bg-muted text-muted-foreground";
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

export function RouteGlance({ segments }: RouteGlanceProps) {
  // Filter to only non-drive segments (the "nodes")
  const nodes = segments.filter((s) => s.segmentType !== "drive");

  if (nodes.length === 0) return null;

  return (
    <Card>
      <CardContent className="py-4 px-4 overflow-x-auto">
        <div className="flex items-center min-w-max gap-0">
          {nodes.map((node, index) => (
            <div
              key={node.segmentId}
              className="flex items-center animate-in fade-in slide-in-from-left-2"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
            >
              {/* Connector line (not before first node) */}
              {index > 0 && (
                <div className="w-8 md:w-12 lg:w-16 h-px bg-border flex-shrink-0" />
              )}

              {/* Node */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center ${getNodeStyle(node.segmentType)}`}
                >
                  <GlanceIcon type={node.segmentType} />
                </div>
                <span className="text-[10px] md:text-xs font-medium text-foreground mt-1 max-w-[80px] text-center truncate">
                  {getLabel(node)}
                </span>
                <span className="text-[9px] md:text-[10px] text-muted-foreground">
                  {getSubLabel(node)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

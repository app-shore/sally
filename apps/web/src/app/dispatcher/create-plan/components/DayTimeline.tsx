"use client";

import { MapPin, Moon, Fuel, Coffee, Truck, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type {
  RouteSegment,
  DayBreakdown,
} from "@/features/routing/route-planning";

interface DayTimelineProps {
  day: DayBreakdown;
  segments: RouteSegment[];
  isLastDay: boolean;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function SegmentIcon({ type }: { type: string }) {
  const iconClass = "h-4 w-4";
  switch (type) {
    case "dock":
      return <MapPin className={iconClass} />;
    case "rest":
      return <Moon className={iconClass} />;
    case "fuel":
      return <Fuel className={iconClass} />;
    case "break":
      return <Coffee className={iconClass} />;
    case "drive":
      return <Truck className={iconClass} />;
    default:
      return <Clock className={iconClass} />;
  }
}

function getSegmentIconBg(type: string): string {
  switch (type) {
    case "dock":
      return "bg-foreground text-background";
    case "rest":
      return "bg-gray-600 dark:bg-gray-400 text-white dark:text-black";
    case "fuel":
      return "bg-gray-500 dark:bg-gray-500 text-white";
    case "break":
      return "bg-gray-400 dark:bg-gray-600 text-white dark:text-gray-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function DriveInfo({ segment }: { segment: RouteSegment }) {
  return (
    <div className="flex items-center gap-2 py-3 pl-[99px] text-sm text-muted-foreground">
      <div className="flex-1 border-t border-dashed border-border" />
      <span>
        {segment.distanceMiles?.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}{" "}
        mi
      </span>
      <span>&middot;</span>
      <span>{formatDuration(segment.driveTimeHours || 0)}</span>
      <div className="flex-1 border-t border-dashed border-border" />
    </div>
  );
}

function StopNode({ segment }: { segment: RouteSegment }) {
  const time = segment.estimatedArrival
    ? formatTime(segment.estimatedArrival)
    : "";

  return (
    <div className="flex items-start gap-3 py-2 group hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
      {/* Time */}
      <div className="w-[72px] text-right flex-shrink-0 pt-0.5">
        <span className="text-xs text-muted-foreground tabular-nums">
          {time}
        </span>
      </div>

      {/* Icon */}
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${getSegmentIconBg(segment.segmentType)}`}
      >
        <SegmentIcon type={segment.segmentType} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {segment.segmentType === "dock" && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 uppercase tracking-wider"
              >
                {segment.actionType || "stop"}
              </Badge>
              <span className="text-sm font-medium text-foreground truncate">
                {segment.toLocation}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatDuration(segment.dockDurationHours || 0)} dock
              {segment.customerName && ` \u00B7 ${segment.customerName}`}
              {segment.isDocktimeConverted && (
                <Badge
                  variant="muted"
                  className="text-[10px] px-1 py-0 ml-2"
                >
                  counts as rest
                </Badge>
              )}
            </div>
          </>
        )}

        {segment.segmentType === "rest" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {segment.toLocation || "Rest Stop"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatDuration(segment.restDurationHours || 0)}{" "}
              {segment.restType?.replace(/_/g, " ")}
            </div>
            {segment.restReason && (
              <div className="text-xs text-muted-foreground mt-0.5 italic">
                {segment.restReason}
              </div>
            )}
          </>
        )}

        {segment.segmentType === "fuel" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {segment.fuelStationName || segment.toLocation || "Fuel Stop"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {segment.fuelGallons} gal @ $
              {segment.fuelPricePerGallon?.toFixed(2)}/gal
              {segment.fuelCostEstimate &&
                ` = $${segment.fuelCostEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              {segment.detourMiles != null && segment.detourMiles > 0 && (
                <span>
                  {" "}
                  &middot; {segment.detourMiles.toFixed(1)} mi detour
                </span>
              )}
            </div>
          </>
        )}

        {segment.segmentType === "break" && (
          <>
            <div className="text-sm font-medium text-foreground">
              Mandatory Break
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatDuration(segment.restDurationHours || 0.5)}
              {segment.restReason && ` \u00B7 ${segment.restReason}`}
            </div>
          </>
        )}

        {/* HOS state indicator for rest/break */}
        {(segment.segmentType === "rest" ||
          segment.segmentType === "break") &&
          segment.hosStateAfter && (
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                HOS after:
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {segment.hosStateAfter.hoursDriven.toFixed(1)}h driven
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {segment.hosStateAfter.onDutyTime.toFixed(1)}h on-duty
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

export function DayTimeline({ day, segments }: DayTimelineProps) {
  // Build interleaved display: stop, drive, stop, drive...
  const renderItems: Array<{
    type: "stop" | "drive";
    segment: RouteSegment;
  }> = [];

  for (const segment of segments) {
    if (segment.segmentType === "drive") {
      renderItems.push({ type: "drive", segment });
    } else {
      renderItems.push({ type: "stop", segment });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-base">
          <span>
            Day {day.day} — {formatDate(day.date)}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {formatDuration(day.driveHours)} driving &middot;{" "}
            {formatDuration(day.onDutyHours)} on-duty &middot; {day.segments}{" "}
            segments
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[99px] top-0 bottom-0 w-px bg-border" />

          {renderItems.map((item) => {
            if (item.type === "drive") {
              return (
                <DriveInfo key={item.segment.segmentId} segment={item.segment} />
              );
            }
            return (
              <StopNode key={item.segment.segmentId} segment={item.segment} />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

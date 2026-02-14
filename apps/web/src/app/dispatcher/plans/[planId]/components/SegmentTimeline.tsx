"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { HOSProgressBars, HOSSummary, isHOSMeaningful } from "./HOSProgressBars";
import type { RouteSegment } from "@/features/routing/route-planning";

interface SegmentTimelineProps {
  segments: RouteSegment[];
  planStatus?: string;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
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

function DriveConnector({ segment }: { segment: RouteSegment }) {
  return (
    <div className="relative flex items-center gap-2 py-1.5 pl-[68px] text-xs text-muted-foreground">
      {/* Timeline continuation */}
      <div className="absolute left-[79px] top-0 bottom-0 w-px bg-border" />
      <div className="ml-[24px] flex items-center gap-2 w-full">
        <div className="flex-1 border-t border-dashed border-border" />
        <span>
          {segment.distanceMiles?.toLocaleString(undefined, { maximumFractionDigits: 0 })} mi
        </span>
        <span>&middot;</span>
        <span>{formatDuration(segment.driveTimeHours || 0)}</span>
        <div className="flex-1 border-t border-dashed border-border" />
      </div>
    </div>
  );
}

function StopSegment({
  segment,
  isLast,
  showCycleHours,
  planStatus,
}: {
  segment: RouteSegment;
  isLast: boolean;
  showCycleHours: boolean;
  planStatus?: string;
}) {
  const time = segment.estimatedArrival ? formatTime(segment.estimatedArrival) : "";
  const date = segment.estimatedArrival ? formatDate(segment.estimatedArrival) : "";
  const isRest = segment.segmentType === "rest";
  const isBreak = segment.segmentType === "break";

  // Decide whether to show full HOS bars or compact summary
  const hosState = segment.hosStateAfter;
  const showFullBars = hosState && (isHOSMeaningful(hosState) || isRest || isBreak);

  return (
    <div className="relative flex items-start gap-3 py-3 px-3 rounded-lg hover:bg-muted/30 transition-colors">
      {/* Timeline line — behind the dot */}
      <div className="absolute left-[79px] top-0 bottom-0 w-px bg-border" />

      {/* Time column */}
      <div className="w-[56px] flex-shrink-0 text-right pt-0.5">
        <div className="text-xs font-medium text-foreground tabular-nums">{time}</div>
        <div className="text-[10px] text-muted-foreground">{date}</div>
      </div>

      {/* Dot — sits on the timeline */}
      <div
        className={`relative z-10 mt-1.5 h-3 w-3 rounded-full flex-shrink-0 ${getDotColor(segment.segmentType)} ${getDotRing(segment.segmentType)}`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Dock segments */}
        {segment.segmentType === "dock" && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase tracking-wider">
                {segment.actionType || "stop"}
              </Badge>
              <span className="text-sm font-medium text-foreground">{segment.toLocation}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {segment.customerName && `${segment.customerName} · `}
              {formatDuration(segment.dockDurationHours || 0)} dock
              {segment.isDocktimeConverted && (
                <Badge variant="muted" className="text-[10px] px-1 py-0 ml-2">
                  counts as rest
                </Badge>
              )}
            </div>
            {segment.isDocktimeConverted && (
              <div className="text-xs text-muted-foreground mt-1 italic border-l-2 border-border pl-2">
                SALLY: Dock time qualifies as off-duty. Credited toward rest requirements.
              </div>
            )}
          </>
        )}

        {/* Rest segments */}
        {segment.segmentType === "rest" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {formatDuration(segment.restDurationHours || 0)} Rest
              </span>
              <span className="text-xs text-muted-foreground">
                {segment.toLocation || "Rest Area"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {segment.restType?.replace(/_/g, " ")}
            </div>
            {segment.restReason && (
              <div className="text-xs text-muted-foreground mt-1 italic border-l-2 border-border pl-2">
                SALLY: {segment.restReason}
              </div>
            )}
          </>
        )}

        {/* Fuel segments */}
        {segment.segmentType === "fuel" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {segment.fuelStationName || segment.toLocation || "Fuel Stop"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {segment.fuelGallons} gal · ${segment.fuelPricePerGallon?.toFixed(2)}/gal · $
              {segment.fuelCostEstimate?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              {segment.detourMiles != null && segment.detourMiles > 0 && (
                <span> · {segment.detourMiles.toFixed(1)} mi detour</span>
              )}
            </div>
          </>
        )}

        {/* Break segments */}
        {segment.segmentType === "break" && (
          <>
            <div className="text-sm font-medium text-foreground">Mandatory Break</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatDuration(segment.restDurationHours || 0.5)}
            </div>
            {segment.restReason && (
              <div className="text-xs text-muted-foreground mt-1 italic border-l-2 border-border pl-2">
                SALLY: {segment.restReason}
              </div>
            )}
          </>
        )}

        {/* Final stop indicator */}
        {isLast && segment.segmentType === "dock" && (
          <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
            {planStatus === "completed" ? "Route complete" : "Final stop"}
          </div>
        )}

        {/* HOS — full bars when meaningful, compact summary otherwise */}
        {hosState && (
          showFullBars ? (
            <HOSProgressBars
              hosState={hosState}
              segmentType={segment.segmentType}
              isReset={isRest || isBreak}
              showCycle={showCycleHours}
            />
          ) : (
            <HOSSummary hosState={hosState} />
          )
        )}
      </div>
    </div>
  );
}

export function SegmentTimeline({ segments, planStatus }: SegmentTimelineProps) {
  const items: Array<{ type: "stop" | "drive"; segment: RouteSegment; isLast: boolean; showCycle: boolean }> = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isLast = i === segments.length - 1 ||
      (seg.segmentType !== "drive" && segments.slice(i + 1).every(s => s.segmentType === "drive"));
    const showCycle = seg.segmentType === "rest" || isLast;

    if (seg.segmentType === "drive") {
      items.push({ type: "drive", segment: seg, isLast: false, showCycle: false });
    } else {
      items.push({ type: "stop", segment: seg, isLast, showCycle });
    }
  }

  return (
    <Card>
      <CardContent className="py-4 px-2 md:px-4">
        <div className="relative">
          {items.map((item) =>
            item.type === "drive" ? (
              <DriveConnector key={item.segment.segmentId} segment={item.segment} />
            ) : (
              <StopSegment
                key={item.segment.segmentId}
                segment={item.segment}
                isLast={item.isLast}
                showCycleHours={item.showCycle}
                planStatus={planStatus}
              />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

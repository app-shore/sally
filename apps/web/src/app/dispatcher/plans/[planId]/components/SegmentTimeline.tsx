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

/**
 * Layout uses CSS grid with 3 columns: [time] [dot+line] [content]
 * The middle column is a fixed 12px wide column that contains the dot and the vertical line.
 * This ensures perfect alignment — the line always runs through dot centers.
 */

function DriveConnector({ segment }: { segment: RouteSegment }) {
  return (
    <div className="grid grid-cols-[60px_12px_1fr] gap-x-3 items-center py-1.5 px-3">
      {/* Empty time column */}
      <div />

      {/* Timeline line through center */}
      <div className="flex justify-center h-full">
        <div className="w-px bg-border" />
      </div>

      {/* Drive info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
  isFirst,
  isLast,
  showCycleHours,
  planStatus,
}: {
  segment: RouteSegment;
  isFirst: boolean;
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
    <div className="grid grid-cols-[60px_12px_1fr] gap-x-3 py-3 px-3 rounded-lg hover:bg-muted/30 transition-colors">
      {/* Time column — align top of text with dot */}
      <div className="flex-shrink-0 text-right pt-px">
        <div className="text-xs font-medium text-foreground tabular-nums leading-none">{time}</div>
        <div className="text-[10px] text-muted-foreground mt-1">{date}</div>
      </div>

      {/* Dot + timeline line */}
      <div className="flex flex-col items-center">
        {/* Line above dot (hidden for first item) */}
        <div className={`flex-1 w-px ${isFirst ? "bg-transparent" : "bg-border"}`} />
        {/* Dot — aligned with first line of text */}
        <div
          className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${getDotColor(segment.segmentType)} ${getDotRing(segment.segmentType)}`}
        />
        {/* Line below dot (hidden for last item) */}
        <div className={`flex-1 w-px ${isLast ? "bg-transparent" : "bg-border"}`} />
      </div>

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
  const items: Array<{ type: "stop" | "drive"; segment: RouteSegment; isFirst: boolean; isLast: boolean; showCycle: boolean }> = [];

  // Build items from non-drive perspective to track first/last stop
  const stopIndices: number[] = [];
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].segmentType !== "drive") stopIndices.push(i);
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isLastStop = seg.segmentType !== "drive" && i === stopIndices[stopIndices.length - 1];
    const isFirstStop = seg.segmentType !== "drive" && i === stopIndices[0];
    const showCycle = seg.segmentType === "rest" || isLastStop;

    if (seg.segmentType === "drive") {
      items.push({ type: "drive", segment: seg, isFirst: false, isLast: false, showCycle: false });
    } else {
      items.push({ type: "stop", segment: seg, isFirst: isFirstStop, isLast: isLastStop, showCycle });
    }
  }

  return (
    <Card>
      <CardContent className="py-4 px-2 md:px-4">
        {items.map((item) =>
          item.type === "drive" ? (
            <DriveConnector key={item.segment.segmentId} segment={item.segment} />
          ) : (
            <StopSegment
              key={item.segment.segmentId}
              segment={item.segment}
              isFirst={item.isFirst}
              isLast={item.isLast}
              showCycleHours={item.showCycle}
              planStatus={planStatus}
            />
          )
        )}
      </CardContent>
    </Card>
  );
}

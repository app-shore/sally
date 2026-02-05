/**
 * Shared segment detail renderers
 * Centralizes how segment details are displayed across components
 */

import type { RouteSegment } from "@/features/routing/route-planning";
import { formatTime } from "../utils/routeTimelineUtils";

/**
 * Get expanded details for a segment (used in popovers/dropdowns)
 */
export function getExpandedDetails(segment: RouteSegment): React.ReactNode {
  switch (segment.segment_type) {
    case "drive":
      return (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>📍 {segment.from_location} → {segment.to_location}</div>
          {segment.distance_miles != null && segment.distance_miles > 0 && (
            <div>
              🚗 {segment.distance_miles.toFixed(0)} miles, {segment.drive_time_hours?.toFixed(1) || "0"}h
            </div>
          )}
          {segment.estimated_departure && (
            <div>⏰ Depart: {formatTime(segment.estimated_departure)}</div>
          )}
        </div>
      );

    case "fuel":
      return (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>⛽ {segment.fuel_gallons?.toFixed(0) || "0"} gallons</div>
          {segment.fuel_cost_estimate != null && segment.fuel_gallons != null && (
            <div>
              💰 ${segment.fuel_cost_estimate.toFixed(2)} ($
              {(segment.fuel_cost_estimate / segment.fuel_gallons).toFixed(2)}/gal)
            </div>
          )}
          <div>⏱️ ~15 minutes</div>
        </div>
      );

    case "rest":
      return (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>🛏️ {segment.rest_type?.replace("_", " ").toUpperCase() || "Rest"}</div>
          {segment.rest_reason && <div>📋 {segment.rest_reason}</div>}
          {segment.hos_state_after && (
            <div>🚫 {segment.hos_state_after.hours_driven?.toFixed(1) || "0"}h driven after</div>
          )}
        </div>
      );

    case "dock":
      return (
        <div className="space-y-1 text-xs text-muted-foreground">
          {segment.customer_name && <div>🏢 {segment.customer_name}</div>}
          {segment.dock_duration_hours != null && (
            <div>⏱️ {segment.dock_duration_hours.toFixed(1)}h loading</div>
          )}
          {segment.estimated_departure && (
            <div>⏰ Depart: {formatTime(segment.estimated_departure)}</div>
          )}
        </div>
      );

    default:
      return null;
  }
}

/**
 * Get full details for a segment (used in always-expanded views)
 */
export function getFullDetails(segment: RouteSegment, index: number, totalSegments: number): React.ReactNode {
  const isOrigin = index === 0;
  const isDestination = index === totalSegments - 1;

  if (isOrigin || isDestination) {
    return (
      <div>
        <div className="font-medium text-foreground mb-1">
          {isOrigin ? segment.from_location || "Start" : segment.to_location || "End"}
        </div>
      </div>
    );
  }

  switch (segment.segment_type) {
    case "drive":
      return (
        <div className="space-y-2">
          <div className="font-medium text-foreground">
            {segment.from_location} → {segment.to_location}
          </div>
          {(segment.distance_miles != null || segment.drive_time_hours != null) && (
            <div className="text-sm text-muted-foreground">
              {segment.distance_miles != null && segment.distance_miles > 0
                ? `${segment.distance_miles.toFixed(0)} miles`
                : "No distance"}
              {segment.drive_time_hours != null && segment.drive_time_hours > 0 && (
                <> • {segment.drive_time_hours.toFixed(1)}h drive</>
              )}
            </div>
          )}
          {segment.hos_state_after && (
            <div className="text-sm text-muted-foreground">
              HOS after: {segment.hos_state_after.hours_driven?.toFixed(1) || "0.0"}h driven • {segment.hos_state_after.on_duty_time?.toFixed(1) || "0.0"}h on-duty
            </div>
          )}
        </div>
      );

    case "fuel":
      return (
        <div className="space-y-2">
          <div className="font-medium text-foreground">{segment.fuel_station_name || "Fuel Stop"}</div>
          {segment.fuel_gallons != null && (
            <div className="text-sm text-muted-foreground">
              {segment.fuel_gallons.toFixed(0)} gallons
              {segment.fuel_cost_estimate != null && <> • ${segment.fuel_cost_estimate.toFixed(2)}</>}
            </div>
          )}
          <div className="text-sm text-muted-foreground">~15 minutes fueling time</div>
          {segment.estimated_departure && (
            <div className="text-sm text-muted-foreground">Depart: {formatTime(segment.estimated_departure)}</div>
          )}
        </div>
      );

    case "rest":
      return (
        <div className="space-y-2">
          <div className="font-medium text-foreground">
            {segment.rest_type?.replace("_", " ").toUpperCase() || "Rest Stop"}
          </div>
          {segment.rest_duration_hours != null && (
            <div className="text-sm text-muted-foreground">{segment.rest_duration_hours.toFixed(1)}h rest</div>
          )}
          {segment.rest_reason && (
            <div className="text-sm text-muted-foreground">{segment.rest_reason}</div>
          )}
          {segment.hos_state_after && (
            <div className="text-sm text-muted-foreground">
              HOS after: {segment.hos_state_after.hours_driven?.toFixed(1) || "0.0"}h driven • {segment.hos_state_after.on_duty_time?.toFixed(1) || "0.0"}h on-duty
            </div>
          )}
          {segment.estimated_departure && (
            <div className="text-sm text-muted-foreground">Depart: {formatTime(segment.estimated_departure)}</div>
          )}
        </div>
      );

    case "dock":
      return (
        <div className="space-y-2">
          <div className="font-medium text-foreground">
            {segment.to_location || "Dock Stop"} - Loading/Unloading
          </div>
          {segment.customer_name && (
            <div className="text-sm text-muted-foreground">{segment.customer_name}</div>
          )}
          {segment.dock_duration_hours != null && (
            <div className="text-sm text-muted-foreground">{segment.dock_duration_hours.toFixed(1)}h dock</div>
          )}
          {segment.hos_state_after && (
            <div className="text-sm text-muted-foreground">
              HOS after: {segment.hos_state_after.hours_driven?.toFixed(1) || "0.0"}h driven • {segment.hos_state_after.on_duty_time?.toFixed(1) || "0.0"}h on-duty
            </div>
          )}
          {segment.estimated_departure && (
            <div className="text-sm text-muted-foreground">Depart: {formatTime(segment.estimated_departure)}</div>
          )}
        </div>
      );

    default:
      return <div className="text-sm text-muted-foreground">Unknown segment</div>;
  }
}

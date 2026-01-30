"use client";

/**
 * Route Timeline Visualizer - SVG-based Gantt chart
 *
 * MOST COMPLEX COMPONENT
 *
 * Features:
 * - Time axis with auto-scaling (0-48h+)
 * - Color-coded segment bars (drive=green, rest=blue, fuel=orange, dock=purple)
 * - HOS overlay showing hours consumed
 * - Interactive click and hover
 * - Responsive (horizontal scroll on mobile)
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoutePlan, RouteSegment } from "@/lib/types/routePlan";
import { motion } from "framer-motion";

interface RouteTimelineVisualizerProps {
  plan: RoutePlan;
}

interface TimelineSegmentData {
  segment: RouteSegment;
  startTime: number; // hours from start
  duration: number; // hours
  color: string;
  darkColor: string;
}

export default function RouteTimelineVisualizer({ plan }: RouteTimelineVisualizerProps) {
  const { segments } = plan;
  const [selectedSegment, setSelectedSegment] = useState<RouteSegment | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<RouteSegment | null>(null);

  // Calculate timeline data
  const timelineData = useMemo((): TimelineSegmentData[] => {
    let currentTime = 0;
    const data: TimelineSegmentData[] = [];

    segments.forEach((segment) => {
      let duration = 0;

      switch (segment.segment_type) {
        case "drive":
          duration = segment.drive_time_hours || 0;
          break;
        case "rest":
          duration = segment.rest_duration_hours || 0;
          break;
        case "fuel":
          duration = 0.25; // 15 minutes
          break;
        case "dock":
          duration = segment.dock_duration_hours || 0;
          break;
      }

      // Segment colors
      const colors = {
        drive: { light: "#22c55e", dark: "#16a34a" }, // green
        rest: { light: "#3b82f6", dark: "#2563eb" }, // blue
        fuel: { light: "#f97316", dark: "#ea580c" }, // orange
        dock: { light: "#a855f7", dark: "#9333ea" }, // purple
      };

      const color = colors[segment.segment_type];

      data.push({
        segment,
        startTime: currentTime,
        duration,
        color: color.light,
        darkColor: color.dark,
      });

      currentTime += duration;
    });

    return data;
  }, [segments]);

  // Calculate total duration
  const totalDuration = Math.ceil(plan.total_time_hours);
  const maxTime = Math.max(totalDuration, 24); // At least 24h scale

  // SVG dimensions
  const width = 1200; // Desktop width
  const height = 400;
  const marginTop = 60;
  const marginBottom = 60;
  const marginLeft = 80;
  const marginRight = 80;
  const chartHeight = height - marginTop - marginBottom;
  const chartWidth = width - marginLeft - marginRight;

  // Time scale
  const timeScale = (time: number) => {
    return (time / maxTime) * chartWidth;
  };

  // Time axis labels (every 3 hours)
  const timeLabels = Array.from({ length: Math.ceil(maxTime / 3) + 1 }, (_, i) => i * 3);

  // Segment bar height
  const segmentBarHeight = 60;
  const segmentBarY = marginTop + (chartHeight - segmentBarHeight) / 2;

  // HOS overlay data (calculate cumulative hours driven)
  const hosData = useMemo(() => {
    let hoursdriven = plan.input_snapshot?.driver_state?.hours_driven || 0;
    const data: { time: number; hours: number }[] = [{ time: 0, hours: hoursdriven }];

    let currentTime = 0;
    segments.forEach((segment) => {
      if (segment.segment_type === "drive") {
        currentTime += segment.drive_time_hours || 0;
        hoursdriven += segment.drive_time_hours || 0;
        data.push({ time: currentTime, hours: hoursdriven });
      } else if (segment.segment_type === "rest" && segment.rest_type === "full_rest") {
        // Full rest resets drive hours
        currentTime += segment.rest_duration_hours || 0;
        hoursdriven = 0;
        data.push({ time: currentTime, hours: 0 });
      } else {
        // Other segments don't affect drive hours
        currentTime += segment.rest_duration_hours || segment.dock_duration_hours || 0.25;
      }
    });

    return data;
  }, [segments, plan.input_snapshot]);

  // HOS scale
  const hosScale = (hours: number) => {
    return marginTop + chartHeight - (hours / 11) * chartHeight;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Route Timeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          Time-based visualization showing all segments chronologically
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 dark:bg-green-600 rounded" />
              <span>Drive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 dark:bg-blue-600 rounded" />
              <span>Rest</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 dark:bg-orange-600 rounded" />
              <span>Fuel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 dark:bg-purple-600 rounded" />
              <span>Dock</span>
            </div>
          </div>

          {/* SVG Timeline */}
          <div className="overflow-x-auto">
            <svg
              width={width}
              height={height}
              className="w-full min-w-[800px]"
              viewBox={`0 0 ${width} ${height}`}
            >
              {/* Time axis */}
              <g>
                {/* Axis line */}
                <line
                  x1={marginLeft}
                  y1={segmentBarY + segmentBarHeight + 20}
                  x2={marginLeft + chartWidth}
                  y2={segmentBarY + segmentBarHeight + 20}
                  stroke="currentColor"
                  strokeWidth="2"
                  className="stroke-border"
                />

                {/* Time labels */}
                {timeLabels.map((time) => (
                  <g key={time}>
                    {/* Tick mark */}
                    <line
                      x1={marginLeft + timeScale(time)}
                      y1={segmentBarY + segmentBarHeight + 20}
                      x2={marginLeft + timeScale(time)}
                      y2={segmentBarY + segmentBarHeight + 30}
                      stroke="currentColor"
                      strokeWidth="1"
                      className="stroke-border"
                    />
                    {/* Label */}
                    <text
                      x={marginLeft + timeScale(time)}
                      y={segmentBarY + segmentBarHeight + 45}
                      textAnchor="middle"
                      className="fill-muted-foreground text-xs"
                    >
                      {time}h
                    </text>
                  </g>
                ))}
              </g>

              {/* Segment bars */}
              <g>
                {timelineData.map((item, index) => {
                  const isHovered = hoveredSegment?.sequence_order === item.segment.sequence_order;
                  const isSelected = selectedSegment?.sequence_order === item.segment.sequence_order;

                  return (
                    <motion.rect
                      key={index}
                      x={marginLeft + timeScale(item.startTime)}
                      y={segmentBarY}
                      width={Math.max(timeScale(item.duration), 2)} // Min 2px width
                      height={segmentBarHeight}
                      fill={item.color}
                      className="cursor-pointer transition-opacity"
                      opacity={isHovered || isSelected ? 1 : 0.85}
                      stroke={isSelected ? "#000" : "transparent"}
                      strokeWidth={isSelected ? 3 : 0}
                      onMouseEnter={() => setHoveredSegment(item.segment)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => setSelectedSegment(item.segment)}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    />
                  );
                })}
              </g>

              {/* HOS overlay (line chart above segments) */}
              <g>
                {/* HOS limit line (11h) */}
                <line
                  x1={marginLeft}
                  y1={hosScale(11)}
                  x2={marginLeft + chartWidth}
                  y2={hosScale(11)}
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />
                <text
                  x={marginLeft - 10}
                  y={hosScale(11)}
                  textAnchor="end"
                  className="fill-red-600 dark:fill-red-400 text-xs"
                >
                  11h limit
                </text>

                {/* HOS consumption line */}
                <polyline
                  points={hosData
                    .map((d) => `${marginLeft + timeScale(d.time)},${hosScale(d.hours)}`)
                    .join(" ")}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2"
                  opacity="0.7"
                />

                {/* HOS data points */}
                {hosData.map((d, index) => (
                  <circle
                    key={index}
                    cx={marginLeft + timeScale(d.time)}
                    cy={hosScale(d.hours)}
                    r="3"
                    fill="#6366f1"
                    opacity="0.7"
                  />
                ))}
              </g>

              {/* Labels */}
              <text x={marginLeft} y={marginTop - 30} className="fill-foreground font-semibold text-sm">
                Segments
              </text>
              <text x={marginLeft} y={marginTop - 10} className="fill-muted-foreground text-xs">
                HOS Drive Hours (purple line)
              </text>
            </svg>
          </div>

          {/* Selected/Hovered segment details */}
          {(selectedSegment || hoveredSegment) && (
            <Card className="bg-muted/50 border-border">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="font-semibold text-foreground">
                    Segment #{(selectedSegment || hoveredSegment)!.sequence_order} -{" "}
                    {(selectedSegment || hoveredSegment)!.segment_type.toUpperCase()}
                  </div>
                  {(selectedSegment || hoveredSegment)!.segment_type === "drive" && (
                    <>
                      <div className="text-muted-foreground">
                        {(selectedSegment || hoveredSegment)!.from_location} →{" "}
                        {(selectedSegment || hoveredSegment)!.to_location}
                      </div>
                      <div>
                        Distance: {(selectedSegment || hoveredSegment)!.distance_miles?.toFixed(0)} miles
                      </div>
                      <div>
                        Time: {(selectedSegment || hoveredSegment)!.drive_time_hours?.toFixed(1)} hours
                      </div>
                    </>
                  )}
                  {(selectedSegment || hoveredSegment)!.segment_type === "rest" && (
                    <>
                      <div>
                        Type: {(selectedSegment || hoveredSegment)!.rest_type} (
                        {(selectedSegment || hoveredSegment)!.rest_duration_hours}h)
                      </div>
                      <div className="text-muted-foreground">
                        Reason: {(selectedSegment || hoveredSegment)!.rest_reason}
                      </div>
                    </>
                  )}
                  {(selectedSegment || hoveredSegment)!.segment_type === "fuel" && (
                    <>
                      <div>{(selectedSegment || hoveredSegment)!.fuel_station_name}</div>
                      <div>
                        Fuel: {(selectedSegment || hoveredSegment)!.fuel_gallons} gallons - $
                        {(selectedSegment || hoveredSegment)!.fuel_cost_estimate?.toFixed(2)}
                      </div>
                    </>
                  )}
                  {(selectedSegment || hoveredSegment)!.segment_type === "dock" && (
                    <>
                      <div>{(selectedSegment || hoveredSegment)!.customer_name}</div>
                      <div>
                        Duration: {(selectedSegment || hoveredSegment)!.dock_duration_hours} hours
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

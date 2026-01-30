"use client";

/**
 * Vertical Compact Timeline - Clickable vertical timeline for Overview
 *
 * For Overview Tab (Vertical Mode):
 * - Smaller icons in circles (10x10)
 * - Minimal info by default
 * - Click to expand details
 * - Matches Route tab styling but compact
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { RoutePlan } from "@/lib/types/routePlan";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { formatTime, getSegmentDisplay, getMinimalSummary } from "../utils/routeTimelineUtils";
import { getFullDetails } from "../utils/segmentDetails";

interface VerticalCompactTimelineProps {
  plan: RoutePlan;
}

export default function VerticalCompactTimeline({ plan }: VerticalCompactTimelineProps) {
  const { segments } = plan;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-border" />

          {/* Timeline items - Clickable */}
          <div className="space-y-4">
            {segments.map((segment, index) => {
              const display = getSegmentDisplay(segment, index, segments.length);
              const Icon = display.Icon;
              const isExpanded = expandedIndex === index;

              return (
                <div key={index} className="relative flex items-start gap-4">
                  {/* Smaller Clickable Icon */}
                  <button
                    onClick={() => toggleExpand(index)}
                    className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${display.bgColor} border-2 ${display.borderColor}
                      flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none
                      ${isExpanded ? 'ring-2 ring-offset-2 ring-offset-background' : ''}`}
                    aria-label={`Toggle details for ${getMinimalSummary(segment, index, segments.length)}`}
                  >
                    <Icon className={`w-5 h-5 ${display.iconColor}`} />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    {/* Time and expand indicator */}
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {formatTime(segment.estimated_arrival || null)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                        #{segment.sequence_order}
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </span>
                    </div>

                    {/* Minimal summary - Always visible */}
                    <div className="text-sm font-medium text-foreground">
                      {getMinimalSummary(segment, index, segments.length)}
                    </div>

                    {/* Expanded details - Shown when clicked */}
                    {isExpanded && (
                      <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                        {getFullDetails(segment, index, segments.length)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

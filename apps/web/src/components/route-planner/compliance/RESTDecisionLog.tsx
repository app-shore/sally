"use client";

/**
 * REST Decision Log - Audit trail for REST decisions
 *
 * Shows all REST optimization decisions with:
 * - Feasibility analysis (shortfall, limiting factor)
 * - Opportunity scoring (dock/hours/criticality)
 * - Cost analysis (extension hours)
 * - Final recommendation and reasoning
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { RoutePlan, RouteSegment } from "@/lib/types/routePlan";
import { Bed, CheckCircle2, AlertCircle } from "lucide-react";

interface RESTDecisionLogProps {
  plan: RoutePlan;
}

export default function RESTDecisionLog({ plan }: RESTDecisionLogProps) {
  const { segments, rest_stops } = plan;

  // Extract REST segments
  const restSegments = segments.filter((s) => s.segment_type === "rest");

  if (restSegments.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">REST Decision Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No REST stops required for this route
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">REST Decision Log</CardTitle>
        <p className="text-sm text-muted-foreground">
          Detailed audit trail for all REST optimization decisions
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {restSegments.map((segment, idx) => {
            const restStop = rest_stops[idx];

            return (
              <AccordionItem key={idx} value={`rest-${idx}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/20">
                      <Bed className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground">
                        REST #{idx + 1}: {segment.rest_type?.replace("_", " ").toUpperCase()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {segment.rest_duration_hours}h - Segment #{segment.sequence_order}
                      </div>
                    </div>
                    <Badge variant="outline">{segment.rest_type}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4 space-y-4">
                    {/* Feasibility Section */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <AlertCircle className="h-4 w-4" />
                        Feasibility Analysis
                      </div>
                      <div className="pl-6 space-y-2 text-sm">
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-muted-foreground">Reason</span>
                          <span className="font-medium text-foreground">
                            {segment.rest_reason || "HOS compliance"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium text-foreground">
                            {segment.rest_duration_hours}h
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-medium text-foreground">
                            {segment.rest_type === "full_rest"
                              ? "Full Rest (10h reset)"
                              : segment.rest_type === "partial_rest"
                              ? "Partial Rest (7h leverage dock)"
                              : "30-min Break"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Opportunity Section */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        Opportunity Scoring
                      </div>
                      <div className="pl-6 space-y-2 text-sm">
                        {segment.rest_type === "partial_rest" ? (
                          <>
                            <div className="flex items-center justify-between p-2 rounded-md bg-green-50 dark:bg-green-950/20">
                              <span className="text-muted-foreground">Dock Time Available</span>
                              <span className="font-medium text-green-700 dark:text-green-300">
                                8h (sufficient)
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-md bg-green-50 dark:bg-green-950/20">
                              <span className="text-muted-foreground">Optimization</span>
                              <span className="font-medium text-green-700 dark:text-green-300">
                                Leveraging dock time
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                              <span className="text-muted-foreground">Dock Time Available</span>
                              <span className="font-medium text-foreground">
                                Insufficient (&lt; 7h)
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                              <span className="text-muted-foreground">Decision</span>
                              <span className="font-medium text-foreground">
                                Full rest required
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Cost Analysis */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <AlertCircle className="h-4 w-4" />
                        Cost Analysis
                      </div>
                      <div className="pl-6 space-y-2 text-sm">
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-muted-foreground">Time Extension</span>
                          <span className="font-medium text-foreground">
                            {segment.rest_type === "partial_rest" ? "0h (at dock)" : `${segment.rest_duration_hours}h`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-muted-foreground">Impact</span>
                          <span className="font-medium text-foreground">
                            {segment.rest_type === "partial_rest"
                              ? "Minimal (leveraging existing dock)"
                              : "Moderate (additional time)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Decision Summary */}
                    <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <div className="font-semibold text-blue-800 dark:text-blue-200">
                            Decision: {segment.rest_type?.replace("_", " ").toUpperCase()}
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-300">
                            {segment.rest_reason}
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            {segment.rest_type === "partial_rest"
                              ? "✓ Optimized by leveraging dock time to satisfy HOS requirements"
                              : "✓ Full rest inserted to ensure HOS compliance and driver safety"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* HOS State After */}
                    {segment.hos_state_after && (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">
                          HOS State After Rest
                        </div>
                        <div className="pl-6 space-y-2 text-sm">
                          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <span className="text-muted-foreground">Hours Driven</span>
                            <span className="font-medium text-foreground">
                              {segment.hos_state_after.hours_driven.toFixed(1)}h / 11h
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <span className="text-muted-foreground">On-Duty Time</span>
                            <span className="font-medium text-foreground">
                              {segment.hos_state_after.on_duty_time.toFixed(1)}h / 14h
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <span className="text-muted-foreground">Since Break</span>
                            <span className="font-medium text-foreground">
                              {segment.hos_state_after.hours_since_break.toFixed(1)}h / 8h
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}

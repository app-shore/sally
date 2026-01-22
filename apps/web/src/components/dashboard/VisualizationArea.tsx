"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, DonutChart, ProgressBar } from "@tremor/react";
import { useEngineStore } from "@/lib/store/engineStore";
import { formatHours } from "@/lib/utils";
import type { RestRecommendation } from "@/lib/types/engine";

export function VisualizationArea() {
  const { latestResult, isLoading, error } = useEngineStore();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Running optimization engine...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-500 mb-2">Error</div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!latestResult) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted-foreground">
            <p>No results yet</p>
            <p className="text-sm mt-2">
              Fill out the form and click &quot;Run Engine&quot; to see recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recommendation Card with Confidence */}
      <RecommendationCard result={latestResult} />

      {/* Intelligent Analytics (if available) */}
      {latestResult.feasibility_analysis && (
        <IntelligentAnalyticsCard result={latestResult} />
      )}

      {/* Compliance Status */}
      <ComplianceCard result={latestResult} />

      {/* Before/After Comparison (if rest recommended) */}
      {latestResult.hours_after_rest_drive && (
        <BeforeAfterCard result={latestResult} />
      )}

      {/* Metrics Visualization */}
      {/* MetricsCard component commented out */}

    </div>
  );
}

function RecommendationCard({ result }: { result: any }) {
  const [showExplanation, setShowExplanation] = useState(false);

  const getRecommendationColor = (rec: RestRecommendation) => {
    switch (rec) {
      case "full_rest":
        return "bg-gray-900 border-gray-700 text-white";
      case "partial_rest":
        return "bg-gray-600 border-gray-400 text-white";
      case "no_rest":
        return "bg-white border-gray-100 text-gray-900";
      default:
        return "bg-gray-100 border-gray-100 text-gray-900";
    }
  };

  const getRecommendationLabel = (rec: RestRecommendation) => {
    switch (rec) {
      case "full_rest":
        return "Full Rest";
      case "partial_rest":
        return "Partial Rest";
      case "no_rest":
        return "No Rest";
      default:
        return "Unknown";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-500";
    if (confidence >= 70) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg">Recommendation</CardTitle>
        {result.confidence !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-500">Confidence:</span>
            <div className="flex items-center gap-2">
              <div className="w-16 sm:w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getConfidenceColor(result.confidence)}`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
              <span className="text-xs sm:text-sm font-semibold">{result.confidence}%</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 rounded-lg p-4 sm:p-6 ${getRecommendationColor(
            result.recommendation
          )}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">
                    {getRecommendationLabel(result.recommendation)}
                  </h3>
                  {result.driver_can_decline !== undefined && (
                    <p className="text-xs sm:text-sm opacity-75 mb-3">
                      {result.driver_can_decline ? "Optional - Driver can decline" : "Mandatory - Compliance required"}
                    </p>
                  )}
                </div>
              </div>

              {result.recommended_duration_hours && (
                <p className="text-base sm:text-lg font-semibold mb-4">
                  Duration: {formatHours(result.recommended_duration_hours)}
                </p>
              )}

              {/* Why Button */}
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-sm font-medium underline hover:no-underline mb-3"
              >
                {showExplanation ? "Hide Details" : "Why?"}
              </button>

              {/* Explanation (collapsible) */}
              {showExplanation && (
                <div className="mt-3 p-4 bg-white/10 rounded-md border border-current/20">
                  <p className="text-sm leading-relaxed">{result.reasoning}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-current/20">
                <p className="text-sm">
                  Post-load drive feasible:{" "}
                  <span className="font-semibold">
                    {result.post_load_drive_feasible ? "Yes" : "No"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceCard({ result }: { result: any }) {
  const { latestInput } = useEngineStore();

  // Calculate used hours - derive from remaining hours and limits
  const driveHours = latestInput?.hours_driven ?? 0;
  const onDutyHours = latestInput?.on_duty_time ?? 0;

  // Calculate percentages
  const drivePercentage = Math.min(100, (Number(driveHours) / 11) * 100);
  const onDutyPercentage = Math.min(100, (Number(onDutyHours) / 14) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Compliance Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-medium text-sm sm:text-base">Overall Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold text-center ${
                result.is_compliant
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-900 border border-gray-300"
              }`}
            >
              {result.is_compliant ? "Compliant" : "Non-Compliant"}
            </span>
          </div>

          {/* Progress Bars */}
          <div className="space-y-4 pt-3 border-t">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Drive Hours</span>
                <span className="text-sm text-gray-600">
                  {Number(driveHours).toFixed(1)} / 11.0 hours
                </span>
              </div>
              <ProgressBar
                value={drivePercentage}
                color={drivePercentage > 90 ? "red" : drivePercentage > 70 ? "yellow" : "gray"}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">On-Duty Hours</span>
                <span className="text-sm text-gray-600">
                  {Number(onDutyHours).toFixed(1)} / 14.0 hours
                </span>
              </div>
              <ProgressBar
                value={onDutyPercentage}
                color={onDutyPercentage > 90 ? "red" : onDutyPercentage > 70 ? "yellow" : "gray"}
              />
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span>Hours remaining to drive:</span>
              <span className="font-semibold">
                {formatHours(result.hours_remaining_to_drive)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Hours remaining on-duty:</span>
              <span className="font-semibold">
                {formatHours(result.hours_remaining_on_duty)}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {result.compliance_details}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IntelligentAnalyticsCard({ result }: { result: any }) {
  const { feasibility_analysis, opportunity_analysis, cost_analysis } = result;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Intelligent Analysis</CardTitle>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          AI-powered breakdown of trip feasibility, rest opportunity value, and time costs
        </p>
        <div className="mt-3 p-2 sm:p-3 bg-gray-50 rounded-md text-xs text-gray-600 space-y-1">
          <p className="font-medium">Quick Guide:</p>
          <p><span className="font-semibold">Feasibility:</span> Can driver complete trips? (Green=Yes, Red=No)</p>
          <p><span className="font-semibold">Opportunity Score:</span> How valuable is rest? (0-30=Poor, 31-60=Moderate, 61-100=Excellent)</p>
          <p><span className="font-semibold">Cost:</span> How much extra time needed? (Lower=Better deal)</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Feasibility Analysis */}
          {feasibility_analysis && (
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-1 text-sm">Trip Feasibility</h4>
              <p className="text-xs text-gray-500 mb-3">Can driver complete upcoming trips with current hours?</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      feasibility_analysis.feasible ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {feasibility_analysis.feasible ? "Feasible" : "Not Feasible"}
                  </span>
                </div>

                {!feasibility_analysis.feasible && feasibility_analysis.limiting_factor && (
                  <div className="text-xs text-gray-600 mt-2">
                    <p className="font-medium">
                      Limiting Factor: <span className="capitalize font-semibold text-red-600">{feasibility_analysis.limiting_factor.replace('_', ' ')}</span>
                    </p>
                    <p className="mt-1">
                      Shortfall: <span className="font-semibold">{feasibility_analysis.shortfall_hours.toFixed(1)}h</span>
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-600 mt-3 pt-3 border-t space-y-1">
                  <div className="flex justify-between">
                    <span>Drive needed:</span>
                    <span className="font-medium">{feasibility_analysis.total_drive_needed.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>On-duty needed:</span>
                    <span className="font-medium">{feasibility_analysis.total_on_duty_needed.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Drive margin:</span>
                    <span className={`font-medium ${feasibility_analysis.drive_margin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {feasibility_analysis.drive_margin.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duty margin:</span>
                    <span className={`font-medium ${feasibility_analysis.duty_margin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {feasibility_analysis.duty_margin.toFixed(1)}h
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Opportunity Analysis */}
          {opportunity_analysis && (
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-1 text-sm">Opportunity Score</h4>
              <p className="text-xs text-gray-500 mb-3">How valuable is taking rest right now? (0=poor, 100=excellent)</p>
              <div className="space-y-3">
                {/* Overall Score */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {Math.round(opportunity_analysis.score)}
                  </div>
                  <div className="text-xs text-gray-500">out of 100</div>
                  <div className="mt-2">
                    <ProgressBar
                      value={opportunity_analysis.score}
                      color={opportunity_analysis.score >= 60 ? "green" : opportunity_analysis.score >= 40 ? "yellow" : "gray"}
                    />
                  </div>
                </div>

                {/* Breakdown */}
                <div className="text-xs text-gray-600 space-y-1 pt-2 border-t">
                  <p className="font-medium mb-2">Score Breakdown:</p>
                  <div className="flex justify-between">
                    <span title="How long is dock time? (longer = more points)">📦 Dock availability:</span>
                    <span className="font-medium">{opportunity_analysis.dock_score.toFixed(0)}/30</span>
                  </div>
                  <div className="flex justify-between">
                    <span title="How many hours would driver gain? (more = more points)">⏱️ Hours gain potential:</span>
                    <span className="font-medium">{opportunity_analysis.hours_score.toFixed(0)}/30</span>
                  </div>
                  <div className="flex justify-between">
                    <span title="How badly does driver need rest? (closer to limits = more points)">⚠️ Need for rest:</span>
                    <span className="font-medium">{opportunity_analysis.criticality_score.toFixed(0)}/40</span>
                  </div>
                </div>

                {opportunity_analysis.hours_gainable > 0 && (
                  <div className="mt-3 pt-3 border-t text-center">
                    <div className="text-sm font-semibold text-gray-900">
                      +{opportunity_analysis.hours_gainable.toFixed(1)}h
                    </div>
                    <div className="text-xs text-gray-500">Hours gainable</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cost Analysis */}
          {cost_analysis && (
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-1 text-sm">Rest Extension Cost</h4>
              <p className="text-xs text-gray-500 mb-3">How much extra time is needed to extend dock to full rest?</p>
              <div className="space-y-3">
                <div className="text-xs text-gray-600 space-y-2">
                  <div>
                    <p className="font-medium mb-1">Current Dock Time:</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {cost_analysis.dock_time_available.toFixed(1)}h
                    </p>
                  </div>

                  <div className="pt-3 border-t space-y-2">
                    <div>
                      <p className="font-medium mb-1">Full Rest (10h):</p>
                      <p className="text-lg font-semibold text-gray-700">
                        {cost_analysis.full_rest_extension_hours === 0 ? (
                          <span className="text-green-600">No extension needed ✓</span>
                        ) : (
                          <>+{cost_analysis.full_rest_extension_hours.toFixed(1)}h needed</>
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="font-medium mb-1">Partial Rest (7h):</p>
                      <p className="text-lg font-semibold text-gray-700">
                        {cost_analysis.partial_rest_extension_hours === 0 ? (
                          <span className="text-green-600">No extension needed ✓</span>
                        ) : (
                          <>+{cost_analysis.partial_rest_extension_hours.toFixed(1)}h needed</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BeforeAfterCard({ result }: { result: any }) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Before/After Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Before */}
          <div className="border rounded-lg p-3 sm:p-4">
            <h4 className="font-semibold mb-3 sm:mb-4 text-xs sm:text-sm text-gray-500">Current Status</h4>
            <div className="space-y-2 sm:space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Drive Hours</p>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">
                  {result.hours_remaining_to_drive.toFixed(1)}h
                </div>
                <p className="text-xs text-gray-500">remaining</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">On-Duty Hours</p>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">
                  {result.hours_remaining_on_duty.toFixed(1)}h
                </div>
                <p className="text-xs text-gray-500">remaining</p>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="border rounded-lg p-3 sm:p-4 bg-green-50">
            <h4 className="font-semibold mb-3 sm:mb-4 text-xs sm:text-sm text-green-700">After Rest</h4>
            <div className="space-y-2 sm:space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Drive Hours</p>
                <div className="text-xl sm:text-2xl font-bold text-green-700 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span>{result.hours_after_rest_drive.toFixed(1)}h</span>
                  <span className="text-xs sm:text-sm text-green-600">
                    (+{(result.hours_after_rest_drive - result.hours_remaining_to_drive).toFixed(1)}h)
                  </span>
                </div>
                <p className="text-xs text-gray-500">available</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">On-Duty Hours</p>
                <div className="text-xl sm:text-2xl font-bold text-green-700 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span>{result.hours_after_rest_duty.toFixed(1)}h</span>
                  <span className="text-xs sm:text-sm text-green-600">
                    (+{(result.hours_after_rest_duty - result.hours_remaining_on_duty).toFixed(1)}h)
                  </span>
                </div>
                <p className="text-xs text-gray-500">available</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Unused function - kept for future reference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MetricsCard({ result }: { result: any }) {
  // Extract hours from input (from engine store)
  const { latestInput } = useEngineStore();

  // Calculate hours data for charts with proper type checking
  const driveHours = typeof (latestInput as any)?.hours_driven === 'number'
    ? (latestInput as any).hours_driven
    : 0;
  const onDutyHours = typeof (latestInput as any)?.on_duty_time === 'number'
    ? (latestInput as any).on_duty_time
    : 0;
  const remainingDriveHours = typeof result.hours_remaining_to_drive === 'number'
    ? result.hours_remaining_to_drive
    : 0;
  const remainingOnDutyHours = typeof result.hours_remaining_on_duty === 'number'
    ? result.hours_remaining_on_duty
    : 0;

  // Bar chart data - HOS limits comparison
  const hoursData = [
    {
      category: "Drive Hours",
      "Used": driveHours,
      "Remaining": remainingDriveHours,
      "Limit": 11,
    },
    {
      category: "On-Duty Hours",
      "Used": onDutyHours,
      "Remaining": remainingOnDutyHours,
      "Limit": 14,
    },
  ];

  // Donut chart data - Overall utilization
  const utilizationData = [
    {
      name: "Hours Used",
      value: Math.round(driveHours * 10) / 10,
    },
    {
      name: "Hours Remaining",
      value: Math.round(remainingDriveHours * 10) / 10,
    },
  ];

  // Calculate percentages for progress bars
  const drivePercentage = Math.min(100, (driveHours / 11) * 100);
  const onDutyPercentage = Math.min(100, (onDutyHours / 14) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metrics & Visualization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* HOS Limits Progress Bars */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">11-Hour Drive Limit</span>
                <span className="text-sm text-gray-600">
                  {driveHours.toFixed(1)} / 11.0 hours ({drivePercentage.toFixed(0)}%)
                </span>
              </div>
              <ProgressBar
                value={drivePercentage}
                color={drivePercentage > 90 ? "red" : drivePercentage > 70 ? "yellow" : "gray"}
                className="mt-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">14-Hour Duty Window</span>
                <span className="text-sm text-gray-600">
                  {onDutyHours.toFixed(1)} / 14.0 hours ({onDutyPercentage.toFixed(0)}%)
                </span>
              </div>
              <ProgressBar
                value={onDutyPercentage}
                color={onDutyPercentage > 90 ? "red" : onDutyPercentage > 70 ? "yellow" : "gray"}
                className="mt-2"
              />
            </div>
          </div>

          {/* Hours Breakdown Bar Chart */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Hours Breakdown</h4>
            <BarChart
              data={hoursData}
              index="category"
              categories={["Used", "Remaining"]}
              colors={["gray", "slate"]}
              valueFormatter={(value) => `${value.toFixed(1)}h`}
              yAxisWidth={48}
              showLegend={true}
              className="h-60"
            />
          </div>

          {/* Drive Hours Utilization Donut */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Drive Hours Utilization</h4>
            <DonutChart
              data={utilizationData}
              category="value"
              index="name"
              valueFormatter={(value) => `${value.toFixed(1)}h`}
              colors={["gray", "slate"]}
              className="h-48"
              showLabel={true}
            />
          </div>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {remainingDriveHours.toFixed(1)}h
              </div>
              <div className="text-xs text-gray-600 mt-1">Hours Until Drive Limit</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {remainingOnDutyHours.toFixed(1)}h
              </div>
              <div className="text-xs text-gray-600 mt-1">Hours Until Duty Limit</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

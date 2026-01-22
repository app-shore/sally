"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, DonutChart, ProgressBar } from "@tremor/react";
import { useEngineStore } from "@/lib/store/engineStore";
import { formatHours, formatDateTime } from "@/lib/utils";
import type { RestRecommendation } from "@/lib/types/engine";

export function VisualizationArea() {
  const { latestResult, isLoading, error, history } = useEngineStore();

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
      {/* Recommendation Card */}
      <RecommendationCard result={latestResult} />

      {/* Compliance Status */}
      <ComplianceCard result={latestResult} />

      {/* Metrics Visualization */}
      {/* <MetricsCard result={latestResult} /> */}

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendation</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 rounded-lg p-6 ${getRecommendationColor(
            result.recommendation
          )}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-3">
                {getRecommendationLabel(result.recommendation)}
              </h3>
              {result.recommended_duration_hours && (
                <p className="text-lg font-semibold mb-4">
                  Duration: {formatHours(result.recommended_duration_hours)}
                </p>
              )}

              {/* Why Button */}
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-sm font-medium underline hover:no-underline mb-3"
              >
                Why?
              </button>

              {/* Explanation (collapsible) */}
              {showExplanation && (
                <div className="mt-3 p-4 bg-gray-100 rounded-md border border-gray-200">
                  <p className="text-sm leading-relaxed text-gray-700">{result.reasoning}</p>
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
        <CardTitle>Compliance Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
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

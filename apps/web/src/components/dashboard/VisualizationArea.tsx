"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      {/* Execution History */}
      {history.length > 0 && <HistoryCard history={history} />}
    </div>
  );
}

function RecommendationCard({ result }: { result: any }) {
  const [showExplanation, setShowExplanation] = useState(false);

  const getRecommendationColor = (rec: RestRecommendation) => {
    switch (rec) {
      case "full_rest":
        return "bg-gray-900 border-gray-900 text-white";
      case "partial_rest":
        return "bg-gray-600 border-gray-600 text-white";
      case "no_rest":
        return "bg-white border-gray-300 text-gray-900";
      default:
        return "bg-gray-100 border-gray-300 text-gray-900";
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

function HistoryCard({ history }: { history: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.slice(0, 5).map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm"
            >
              <div>
                <span className="font-medium">{item.input.driver_id}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {formatDateTime(item.timestamp)}
                </span>
              </div>
              <span className="text-xs font-semibold">
                {item.result.recommendation.replace("_", " ").toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

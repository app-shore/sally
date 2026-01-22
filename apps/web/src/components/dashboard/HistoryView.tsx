"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatHours } from "@/lib/utils";
import type { RestRecommendation } from "@/lib/types/engine";

interface HistoryViewProps {
  history: any[];
}

export function HistoryView({ history }: HistoryViewProps) {
  const getRecommendationBadge = (rec: RestRecommendation) => {
    switch (rec) {
      case "full_rest":
        return "bg-gray-900 text-white border-gray-900";
      case "partial_rest":
        return "bg-gray-600 text-white border-gray-600";
      case "no_rest":
        return "bg-white text-gray-900 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  if (history.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No execution history yet</p>
          <p className="text-sm mt-2">
            Run the engine to see historical results here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Execution History</CardTitle>
          <p className="text-xs sm:text-sm text-gray-500">
            {history.length} execution{history.length !== 1 ? "s" : ""}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 hover:bg-gray-50"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm sm:text-base text-gray-900">
                        {item.input.driver_id}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getRecommendationBadge(
                          item.result.recommendation
                        )}`}
                      >
                        {getRecommendationLabel(item.result.recommendation)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-500">Hours Driven:</span>{" "}
                        <span className="font-medium">
                          {formatHours(item.input.hours_driven)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">On-Duty:</span>{" "}
                        <span className="font-medium">
                          {formatHours(item.input.on_duty_time)}
                        </span>
                      </div>
                      {item.result.recommended_duration_hours && (
                        <div>
                          <span className="text-gray-500">Rest Duration:</span>{" "}
                          <span className="font-medium">
                            {formatHours(item.result.recommended_duration_hours)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Compliant:</span>{" "}
                        <span className="font-medium">
                          {item.result.is_compliant ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-gray-500">
                      {formatDateTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

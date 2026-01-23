"use client";

import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function StopsManager() {
  const { stops, addStop, removeStop } = useRoutePlanStore();

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {stops.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No stops added yet</p>
            <p className="text-xs mt-1">Stops will be loaded from scenario or load</p>
          </div>
        ) : (
          stops.map((stop, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm">{idx + 1}. {stop.name || "Stop"}</div>
                  {(stop as any).action_type && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      (stop as any).action_type === "pickup"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {(stop as any).action_type}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {(stop as any).city ? `${(stop as any).city}, ${(stop as any).state}` : "Location"}
                  {stop.estimated_dock_hours && ` • Dock: ${stop.estimated_dock_hours}h`}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeStop(stop.stop_id)}
              >
                ×
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

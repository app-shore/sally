"use client";

import { useState, useEffect } from "react";
import { useScenarios, useLoads, useInstantiateScenario, useLoad } from "@/lib/hooks/useRoutePlanning";
import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LoadSourceSelector() {
  const [selectedLoadId, setSelectedLoadId] = useState<string>("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");

  const { data: scenarios, isLoading: loadingScenarios } = useScenarios();
  const { data: loads, isLoading: loadingLoads } = useLoads({ status: "pending" });
  const { data: loadDetails, isLoading: isLoadingDetails } = useLoad(selectedLoadId || null);
  const { instantiate, isInstantiating } = useInstantiateScenario();
  const { setStops, selectLoad, selectScenario, setDriverState, setVehicleState } = useRoutePlanStore();

  // Auto-load stops when load details are fetched
  useEffect(() => {
    if (loadDetails?.stops) {
      // Convert load stops to stop inputs
      const stopInputs = loadDetails.stops.map((loadStop) => ({
        stop_id: `STOP-${loadStop.stop_id}`,
        name: loadStop.stop_name || "Unknown Stop",
        city: loadStop.stop_city || "",
        state: loadStop.stop_state || "",
        lat: 0, // Lat/lon not returned by load endpoint
        lon: 0,
        location_type: (loadStop.action_type === "pickup" ? "warehouse" : "customer") as any,
        estimated_dock_hours: loadStop.estimated_dock_hours,
        action_type: loadStop.action_type,
        is_origin: loadStop.sequence_order === 1,
        is_destination: loadStop.sequence_order === loadDetails.stops.length,
      } as any));
      setStops(stopInputs);
      selectLoad(loadDetails);
    }
  }, [loadDetails, setStops, selectLoad]);

  const handleScenarioSelect = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    if (scenarioId) {
      instantiate(scenarioId);
    } else {
      // Clear scenario - reset driver/vehicle state to null (require manual input)
      selectScenario(null);
      setDriverState(null);
      setVehicleState(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Load Selection (REQUIRED) */}
        <div>
          <div className="font-medium text-gray-900 mb-2">
            1. Load Selection <span className="text-red-600">*</span>
          </div>
          <select
            value={selectedLoadId}
            onChange={(e) => setSelectedLoadId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loadingLoads}
          >
            <option value="">Select a load...</option>
            {loads?.map((load) => (
              <option key={load.load_id} value={load.load_id}>
                {load.load_number} - {load.customer_name} ({load.stop_count} stops)
              </option>
            ))}
          </select>

          {/* Load Details */}
          {loadDetails && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="font-medium text-sm text-blue-900">📦 Load Details</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Customer:</span>
                  <div className="font-medium">{loadDetails.customer_name}</div>
                </div>
                <div>
                  <span className="text-gray-600">Weight:</span>
                  <div className="font-medium">{loadDetails.weight_lbs.toLocaleString()} lbs</div>
                </div>
                <div>
                  <span className="text-gray-600">Commodity:</span>
                  <div className="font-medium capitalize">{loadDetails.commodity_type}</div>
                </div>
                <div>
                  <span className="text-gray-600">Stops:</span>
                  <div className="font-medium">{loadDetails.stops.length}</div>
                </div>
              </div>

              {/* Pickup/Delivery Summary */}
              <div className="pt-2 border-t border-blue-200">
                <div className="text-xs space-y-1">
                  {loadDetails.stops.map((stop, idx) => (
                    <div key={stop.stop_id} className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        stop.action_type === "pickup"
                          ? "bg-blue-600 text-white"
                          : "bg-green-600 text-white"
                      }`}>
                        {stop.action_type}
                      </span>
                      <span className="font-medium">
                        {stop.stop_city}, {stop.stop_state}
                      </span>
                      {stop.estimated_dock_hours && (
                        <span className="text-gray-500">({stop.estimated_dock_hours}h dock)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {loadDetails.special_requirements && (
                <div className="pt-2 border-t border-blue-200">
                  <span className="text-gray-600 text-xs">Special Requirements:</span>
                  <div className="text-xs font-medium">{loadDetails.special_requirements}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scenario Selection (OPTIONAL) */}
        <div>
          <div className="font-medium text-gray-900 mb-2">
            2. Scenario (Optional)
          </div>
          <select
            value={selectedScenarioId}
            onChange={(e) => handleScenarioSelect(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loadingScenarios || isInstantiating}
          >
            <option value="">None (Manual entry)</option>
            {scenarios?.map((scenario) => (
              <option key={scenario.scenario_id} value={scenario.scenario_id}>
                {scenario.name}
              </option>
            ))}
          </select>

          {selectedScenarioId && scenarios && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              ℹ️ {scenarios.find((s) => s.scenario_id === selectedScenarioId)?.description}
            </div>
          )}

          {!selectedScenarioId && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
              ⚠️ No scenario selected - you must manually set driver and vehicle state below
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRoutePlanStore } from "@/stores/routePlanStore";
import { useTriggerSimulation } from "@/lib/hooks/useRoutePlanning";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { TriggerInput } from "@/lib/types/trigger";

export function SimulationPanel() {
  const { currentPlan, selectedTriggers, addTrigger, removeTrigger, exitSimulationMode } =
    useRoutePlanStore();
  const { applyTriggers, isApplying } = useTriggerSimulation();

  const [activeTriggers, setActiveTriggers] = useState<{
    dock_time_change: boolean;
    traffic_delay: boolean;
    driver_rest_request: boolean;
  }>({
    dock_time_change: false,
    traffic_delay: false,
    driver_rest_request: false,
  });

  const [triggerData, setTriggerData] = useState<Record<string, any>>({});

  const handleToggleTrigger = (type: string) => {
    setActiveTriggers((prev) => ({
      ...prev,
      [type]: !prev[type as keyof typeof prev],
    }));
  };

  const handleApply = () => {
    if (!currentPlan?.plan_id) return;

    const triggers: TriggerInput[] = [];

    if (activeTriggers.dock_time_change) {
      triggers.push({
        trigger_type: "dock_time_change",
        segment_id: triggerData.dock_segment_id,
        data: {
          estimated_dock_hours: triggerData.estimated_dock || 2,
          actual_dock_hours: triggerData.actual_dock || 4,
        },
      });
    }

    if (activeTriggers.traffic_delay) {
      triggers.push({
        trigger_type: "traffic_delay",
        segment_id: triggerData.traffic_segment_id,
        data: {
          delay_minutes: triggerData.delay_minutes || 45,
        },
      });
    }

    if (activeTriggers.driver_rest_request) {
      triggers.push({
        trigger_type: "driver_rest_request",
        data: {
          location: triggerData.rest_location || "current location",
          reason: triggerData.rest_reason || "fatigue",
        },
      });
    }

    applyTriggers({
      planId: currentPlan.plan_id,
      triggers,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Simulation Mode</h2>
            <button
              onClick={exitSimulationMode}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg text-sm text-blue-900 dark:text-blue-100">
            Current Plan: v{currentPlan?.plan_version || 1}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Select Triggers to Simulate:</h3>

            {/* Dock Time Change */}
            <label className="flex items-start gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
              <input
                type="checkbox"
                checked={activeTriggers.dock_time_change}
                onChange={() => handleToggleTrigger("dock_time_change")}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">Dock Time Change</div>
                {activeTriggers.dock_time_change && (
                  <div className="mt-3 space-y-2">
                    <Input
                      type="number"
                      placeholder="Actual dock hours (e.g., 4.0)"
                      value={triggerData.actual_dock || ""}
                      onChange={(e) =>
                        setTriggerData({ ...triggerData, actual_dock: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
              </div>
            </label>

            {/* Traffic Delay */}
            <label className="flex items-start gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
              <input
                type="checkbox"
                checked={activeTriggers.traffic_delay}
                onChange={() => handleToggleTrigger("traffic_delay")}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">Traffic Delay</div>
                {activeTriggers.traffic_delay && (
                  <div className="mt-3">
                    <Input
                      type="number"
                      placeholder="Delay in minutes (e.g., 45)"
                      value={triggerData.delay_minutes || ""}
                      onChange={(e) =>
                        setTriggerData({ ...triggerData, delay_minutes: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
              </div>
            </label>

            {/* Driver Rest Request */}
            <label className="flex items-start gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
              <input
                type="checkbox"
                checked={activeTriggers.driver_rest_request}
                onChange={() => handleToggleTrigger("driver_rest_request")}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">Driver Rest Request</div>
                {activeTriggers.driver_rest_request && (
                  <div className="mt-3 space-y-2">
                    <Input
                      placeholder="Location"
                      value={triggerData.rest_location || ""}
                      onChange={(e) =>
                        setTriggerData({ ...triggerData, rest_location: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Reason (e.g., fatigue)"
                      value={triggerData.rest_reason || ""}
                      onChange={(e) =>
                        setTriggerData({ ...triggerData, rest_reason: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={exitSimulationMode} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={isApplying || Object.values(activeTriggers).every((v) => !v)}
              className="flex-1"
            >
              {isApplying ? "Applying..." : "Apply Triggers"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

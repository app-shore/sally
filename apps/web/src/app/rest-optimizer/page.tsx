"use client";

import { useState } from "react";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { VisualizationArea } from "@/components/dashboard/VisualizationArea";
import { ResizableSidebar } from "@/components/dashboard/ResizableSidebar";
import { useEngineRun } from "@/lib/hooks/useEngineRun";

export default function RestOptimizerPage() {
  const { mutate: runEngine, isPending } = useEngineRun();

  const [formData, setFormData] = useState({
    driver_id: "DRV-001",
    hours_driven: "8.5",
    on_duty_time: "10",
    hours_since_break: "6",
    dock_duration_hours: "12",
    dock_location: "Atlanta Distribution Center",
    remaining_distance_miles: "150",
    destination: "Miami, FL",
  });

  const handleRunEngine = () => {
    runEngine({
      driver_id: formData.driver_id,
      hours_driven: parseFloat(formData.hours_driven) || 0,
      on_duty_time: parseFloat(formData.on_duty_time) || 0,
      hours_since_break: parseFloat(formData.hours_since_break) || 0,
      dock_duration_hours: formData.dock_duration_hours
        ? parseFloat(formData.dock_duration_hours)
        : undefined,
      dock_location: formData.dock_location || undefined,
      remaining_distance_miles: formData.remaining_distance_miles
        ? parseFloat(formData.remaining_distance_miles)
        : undefined,
      destination: formData.destination || undefined,
    });
  };

  return (
    <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
      {/* Desktop Resizable Sidebar */}
      <div className="hidden lg:block">
        <ResizableSidebar defaultWidth={340} minWidth={300} maxWidth={700}>
          <ControlPanel
            formData={formData}
            setFormData={setFormData}
            onRunEngine={handleRunEngine}
            isRunning={isPending}
          />
        </ResizableSidebar>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile Control Panel - show as card on mobile */}
        <div className="lg:hidden mb-4">
          <ControlPanel
            formData={formData}
            setFormData={setFormData}
            onRunEngine={handleRunEngine}
            isRunning={isPending}
          />
        </div>
        <VisualizationArea />
      </div>
    </div>
  );
}

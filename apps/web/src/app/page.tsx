"use client";

import { useState } from "react";
import { LandingPage } from "@/components/landing/LandingPage";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { VisualizationArea } from "@/components/dashboard/VisualizationArea";
import { HistoryView } from "@/components/dashboard/HistoryView";
import { TopNavigation } from "@/components/dashboard/TopNavigation";
import { ResizableSidebar } from "@/components/dashboard/ResizableSidebar";
import { useEngineRun } from "@/lib/hooks/useEngineRun";
import { useEngineStore } from "@/lib/store/engineStore";

export default function DashboardPage() {
  const [currentPage, setCurrentPage] = useState<"landing" | "engine" | "history">("landing");
  const { mutate: runEngine, isPending } = useEngineRun();
  const { history } = useEngineStore();

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

  const handleNavigate = (page: "landing" | "engine" | "history") => {
    setCurrentPage(page);
  };

  // Landing page view
  if (currentPage === "landing") {
    return (
      <div className="flex h-screen flex-col">
        <TopNavigation currentPage={currentPage} onNavigate={handleNavigate} />
        <LandingPage
          onGetStarted={() => setCurrentPage("engine")}
          onViewHistory={() => setCurrentPage("history")}
        />
      </div>
    );
  }

  // Engine or History view with sidebar
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <TopNavigation currentPage={currentPage} onNavigate={handleNavigate} />

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Desktop Resizable Sidebar - only show on engine page for desktop */}
        {currentPage === "engine" && (
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
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {currentPage === "engine" ? (
            <>
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
            </>
          ) : (
            <HistoryView history={history} />
          )}
        </main>
      </div>
    </div>
  );
}

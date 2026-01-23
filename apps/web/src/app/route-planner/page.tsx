"use client";

/**
 * Route Planner Page - Full-screen layout with scenario selection and simulation
 */

import { useState } from "react";
import { LoadSourceSelector } from "@/components/route-planner/LoadSourceSelector";
import { DriverStateInput } from "@/components/route-planner/DriverStateInput";
import { VehicleStateInput } from "@/components/route-planner/VehicleStateInput";
import { StopsManager } from "@/components/route-planner/StopsManager";
import { RouteSummaryCard } from "@/components/route-planner/RouteSummaryCard";
import { SegmentsTimeline } from "@/components/route-planner/SegmentsTimeline";
import { ComplianceStatus } from "@/components/route-planner/ComplianceStatus";
import { SimulationPanel } from "@/components/route-planner/SimulationPanel";
import { VersionComparison } from "@/components/route-planner/VersionComparison";
import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { useRoutePlanning } from "@/lib/hooks/useRoutePlanning";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function RoutePlannerPage() {
  const {
    currentPlan,
    isLoading,
    error,
    stops,
    driverId,
    vehicleId,
    driverState,
    vehicleState,
    optimizationPriority,
    isSimulationMode,
    currentVersion,
    planVersions,
    enterSimulationMode,
  } = useRoutePlanStore();

  const { optimizeRoute, isOptimizing } = useRoutePlanning();
  const [showVersionComparison, setShowVersionComparison] = useState(false);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    load: true,
    driver: true,
    vehicle: true,
    stops: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Validation: Enable Generate Plan if:
  // 1. Load is selected (stops.length > 0)
  // 2. Driver ID and Vehicle ID are set
  // 3. Driver state is set (even if all zeros)
  // 4. Vehicle state is set (even if all zeros)
  const canGeneratePlan =
    stops.length > 0 &&
    !!driverId &&
    !!vehicleId &&
    driverState !== null &&
    vehicleState !== null;

  const handleGeneratePlan = () => {
    if (!canGeneratePlan) {
      const missing = [];
      if (stops.length === 0) missing.push("load with stops");
      if (!driverId) missing.push("Driver ID");
      if (!vehicleId) missing.push("Vehicle ID");
      if (driverState === null) missing.push("driver state");
      if (vehicleState === null) missing.push("vehicle state");

      alert(`Please provide: ${missing.join(", ")}`);
      return;
    }

    optimizeRoute({
      driver_id: driverId,
      vehicle_id: vehicleId,
      driver_state: driverState,
      vehicle_state: vehicleState,
      stops,
      optimization_priority: optimizationPriority,
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Route Planner</h1>
            <p className="text-sm text-gray-500 mt-1">
              Plan HOS-compliant routes with REST optimization
            </p>
          </div>

          {/* Version Selector */}
          {planVersions.length > 1 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Version:</span>
                <select
                  value={currentVersion}
                  onChange={(e) => useRoutePlanStore.getState().setCurrentVersion(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                >
                  {planVersions.map((plan, idx) => (
                    <option key={idx} value={plan.plan_version || idx + 1}>
                      v{plan.plan_version || idx + 1}
                    </option>
                  ))}
                </select>
              </div>

              {planVersions.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVersionComparison(!showVersionComparison)}
                >
                  {showVersionComparison ? "Hide" : "Compare"} Versions
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Setup (40%) */}
        <div className="w-2/5 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Load Source Selection - Collapsible */}
            <section>
              <button
                onClick={() => toggleSection('load')}
                className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 mb-3 hover:text-blue-600 transition-colors"
              >
                <span>Load Selection {!expandedSections.load && stops.length > 0 && <span className="text-sm text-green-600 ml-2">✓</span>}</span>
                <svg
                  className={`w-5 h-5 transition-transform ${expandedSections.load ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.load && <LoadSourceSelector />}
            </section>

            {/* Driver State - Collapsible */}
            <section>
              <button
                onClick={() => toggleSection('driver')}
                className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 mb-3 hover:text-blue-600 transition-colors"
              >
                <span>Driver State {!expandedSections.driver && driverState !== null && !!driverId && <span className="text-sm text-green-600 ml-2">✓</span>}</span>
                <svg
                  className={`w-5 h-5 transition-transform ${expandedSections.driver ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.driver && <DriverStateInput />}
            </section>

            {/* Vehicle State - Collapsible */}
            <section>
              <button
                onClick={() => toggleSection('vehicle')}
                className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 mb-3 hover:text-blue-600 transition-colors"
              >
                <span>Vehicle State {!expandedSections.vehicle && vehicleState !== null && !!vehicleId && <span className="text-sm text-green-600 ml-2">✓</span>}</span>
                <svg
                  className={`w-5 h-5 transition-transform ${expandedSections.vehicle ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.vehicle && <VehicleStateInput />}
            </section>

            {/* Stops - Collapsible */}
            <section>
              <button
                onClick={() => toggleSection('stops')}
                className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 mb-3 hover:text-blue-600 transition-colors"
              >
                <span>Stops ({stops.length}) {!expandedSections.stops && stops.length > 0 && <span className="text-sm text-green-600 ml-2">✓</span>}</span>
                <svg
                  className={`w-5 h-5 transition-transform ${expandedSections.stops ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.stops && <StopsManager />}
            </section>

            {/* Generate Button */}
            <Button
              onClick={handleGeneratePlan}
              disabled={isOptimizing || !canGeneratePlan}
              className="w-full"
              size="lg"
            >
              {isOptimizing ? "Generating Plan..." : "Generate Plan"}
            </Button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Visualization (60%) */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {showVersionComparison && planVersions.length > 1 ? (
            <VersionComparison />
          ) : currentPlan ? (
            <div className="p-6 space-y-6">
              {/* Route Summary */}
              <RouteSummaryCard />

              {/* Simulation Button */}
              {!isSimulationMode && (
                <Button
                  onClick={enterSimulationMode}
                  variant="outline"
                  className="w-full"
                >
                  Simulate Triggers
                </Button>
              )}

              {/* Segments Timeline */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Timeline</h3>
                <SegmentsTimeline />
              </section>

              {/* Compliance Status */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">HOS Compliance</h3>
                <ComplianceStatus />
              </section>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Route Plan</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Select a load source, configure driver and vehicle state, add stops, and generate a plan to get started.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulation Panel (Slide-in Overlay) */}
      {isSimulationMode && <SimulationPanel />}
    </div>
  );
}

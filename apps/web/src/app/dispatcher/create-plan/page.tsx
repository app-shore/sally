'use client';

/**
 * Consolidated Route Planning Wizard - Single-screen, map-first experience
 * Flow: Load → Driver (auto-suggested) → Vehicle (auto-suggested) → Generate Plan → Map View
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useRoutePlanStore } from '@/lib/store/routePlanStore';
import { useRoutePlanning } from '@/lib/hooks/useRoutePlanning';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadSelector } from '@/components/route-planner/LoadSelector';
import { DriverSelector } from '@/components/route-planner/DriverSelector';
import { VehicleSelector } from '@/components/route-planner/VehicleSelector';
import { RouteMapView } from '@/components/route-planner/RouteMapView';

export default function CreatePlanPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSessionStore();

  const {
    currentPlan,
    stops,
    driverId,
    vehicleId,
    driverState,
    vehicleState,
    optimizationPriority,
    selectedLoadId,
  } = useRoutePlanStore();

  const { optimizeRoute, isOptimizing } = useRoutePlanning();

  // Compute form validity
  const isFormValid = !!(
    selectedLoadId &&
    driverId &&
    vehicleId &&
    driverState &&
    vehicleState &&
    stops &&
    stops.length >= 2
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'DISPATCHER' && user?.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || (user?.role !== 'DISPATCHER' && user?.role !== 'ADMIN')) {
    return null;
  }

  const handleGeneratePlan = () => {
    // Form should already be valid due to button disabled state
    if (!isFormValid) {
      return;
    }

    // Generate plan
    optimizeRoute({
      driver_id: driverId!,
      vehicle_id: vehicleId!,
      driver_state: driverState!,
      vehicle_state: vehicleState!,
      stops,
      optimization_priority: optimizationPriority,
    });
  };

  const handleStartOver = () => {
    useRoutePlanStore.getState().reset();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Full-width container (max-w-[1400px] with edge breathing room) */}
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Route Plan</h1>
          <p className="text-muted-foreground mt-1">
            Plan optimized routes with zero HOS violations and automatic rest stop insertion
          </p>
        </div>

        {/* Input Section - Minimal, spacious */}
        <Card className="p-6">
          <div className="space-y-6">
            {/* Hero message */}
            <div className="text-center py-4">
              <div className="text-sm font-medium text-muted-foreground">
                🗺️ Map-first visualization • 🚫 Zero HOS violations
              </div>
            </div>

            {/* 3 inputs in a row (desktop) or stacked (mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LoadSelector />
              <DriverSelector />
              <VehicleSelector />
            </div>

            {/* Generate button - only enabled when valid */}
            <div className="flex justify-between items-center pt-4 border-t border-border">
              {currentPlan && (
                <Button
                  variant="outline"
                  onClick={handleStartOver}
                >
                  Start Over
                </Button>
              )}
              <Button
                onClick={handleGeneratePlan}
                disabled={!isFormValid || isOptimizing}
                className="ml-auto"
                size="lg"
              >
                {isOptimizing ? 'Generating Plan...' : 'Generate Plan'}
              </Button>
            </div>

            {/* Validation hints */}
            {!isFormValid && !currentPlan && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                <div className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Complete the following to generate your route:
                </div>
                <ul className="space-y-1 text-blue-700 dark:text-blue-300 text-xs">
                  {!selectedLoadId && <li>• Select a load</li>}
                  {!driverId && <li>• Select a driver (auto-suggested after load selection)</li>}
                  {!vehicleId && <li>• Select a vehicle (auto-suggested after driver selection)</li>}
                  {stops.length < 2 && selectedLoadId && <li>• Load must have at least 2 stops</li>}
                </ul>
              </div>
            )}
          </div>
        </Card>

        {/* Results Section - Map-first with timeline drawer */}
        {currentPlan && (
          <div className="space-y-4">
            {/* Success message */}
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-2xl">✓</div>
                <div>
                  <div className="font-semibold text-green-800 dark:text-green-200">
                    Route Plan Generated Successfully
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    HOS-compliant route with automatic rest stop insertion
                  </div>
                </div>
              </div>
            </div>

            {/* Map-first visualization */}
            <RouteMapView />
          </div>
        )}
      </div>
    </div>
  );
}

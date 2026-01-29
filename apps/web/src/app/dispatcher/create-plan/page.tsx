'use client';

/**
 * Create Plan Page - Wizard-style route planning for dispatchers
 * Flow: Select Load → Select Driver → Select Vehicle → Generate Plan → View Results
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { LoadSourceSelector } from '@/components/route-planner/LoadSourceSelector';
import { DriverStateInput } from '@/components/route-planner/DriverStateInput';
import { VehicleStateInput } from '@/components/route-planner/VehicleStateInput';
import { StopsManager } from '@/components/route-planner/StopsManager';
import { RouteSummaryCard } from '@/components/route-planner/RouteSummaryCard';
import { SegmentsTimeline } from '@/components/route-planner/SegmentsTimeline';
import { ComplianceStatus } from '@/components/route-planner/ComplianceStatus';
import { SimulationPanel } from '@/components/route-planner/SimulationPanel';
import { VersionComparison } from '@/components/route-planner/VersionComparison';
import { PlanInputSummary } from '@/components/route-planner/PlanInputSummary';
import { useRoutePlanStore } from '@/lib/store/routePlanStore';
import { useRoutePlanning } from '@/lib/hooks/useRoutePlanning';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';

type WizardStep = 'load' | 'driver' | 'vehicle' | 'review' | 'results';

export default function CreatePlanPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSessionStore();
  const [currentStep, setCurrentStep] = useState<WizardStep>('load');
  const [showVersionComparison, setShowVersionComparison] = useState(false);

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

  // Redirect if not authenticated
  if (!isAuthenticated || (user?.role !== 'DISPATCHER' && user?.role !== 'ADMIN')) {
    router.push('/');
    return null;
  }

  // Step validation
  const isLoadStepValid = stops.length > 0;
  const isDriverStepValid = !!driverId && driverState !== null;
  const isVehicleStepValid = !!vehicleId && vehicleState !== null;
  const canGeneratePlan = isLoadStepValid && isDriverStepValid && isVehicleStepValid;

  const handleNext = () => {
    if (currentStep === 'load' && isLoadStepValid) {
      setCurrentStep('driver');
    } else if (currentStep === 'driver' && isDriverStepValid) {
      setCurrentStep('vehicle');
    } else if (currentStep === 'vehicle' && isVehicleStepValid) {
      setCurrentStep('review');
    } else if (currentStep === 'review' && canGeneratePlan) {
      handleGeneratePlan();
    }
  };

  const handleBack = () => {
    if (currentStep === 'driver') setCurrentStep('load');
    else if (currentStep === 'vehicle') setCurrentStep('driver');
    else if (currentStep === 'review') setCurrentStep('vehicle');
    else if (currentStep === 'results') setCurrentStep('review');
  };

  const handleGeneratePlan = () => {
    if (!canGeneratePlan) {
      alert('Please complete all steps before generating a plan.');
      return;
    }

    optimizeRoute({
      driver_id: driverId!,
      vehicle_id: vehicleId!,
      driver_state: driverState!,
      vehicle_state: vehicleState!,
      stops,
      optimization_priority: optimizationPriority,
    });

    // Move to results step
    setCurrentStep('results');
  };

  const handleStartOver = () => {
    useRoutePlanStore.getState().reset();
    setCurrentStep('load');
    setShowVersionComparison(false);
  };

  // Step indicator component
  const StepIndicator = () => {
    const steps = [
      { id: 'load', label: 'Select Load', completed: isLoadStepValid },
      { id: 'driver', label: 'Select Driver', completed: isDriverStepValid },
      { id: 'vehicle', label: 'Select Vehicle', completed: isVehicleStepValid },
      { id: 'review', label: 'Review & Generate', completed: false },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  index < currentStepIndex || step.completed
                    ? 'bg-green-600 dark:bg-green-500 text-white'
                    : index === currentStepIndex
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {step.completed ? '✓' : index + 1}
              </div>
              <span
                className={`text-xs mt-2 font-medium ${
                  index === currentStepIndex
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 h-1 mx-2 transition-colors ${
                  index < currentStepIndex
                    ? 'bg-green-600 dark:bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Results view (after plan generation)
  if (currentStep === 'results') {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartOver}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Start Over</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Route Plan Generated</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  HOS-compliant route with automatic rest stop insertion
                </p>
              </div>
            </div>

            {/* Version Selector */}
            {planVersions.length > 1 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Version:</span>
                  <select
                    value={currentVersion}
                    onChange={(e) =>
                      useRoutePlanStore.getState().setCurrentVersion(Number(e.target.value))
                    }
                    className="px-3 py-2 border border-border rounded-lg text-sm font-medium bg-background text-foreground"
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
                    {showVersionComparison ? 'Hide' : 'Compare'} Versions
                  </Button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Results Panel */}
        <div className="flex-1 bg-background overflow-y-auto">
          {showVersionComparison && planVersions.length > 1 ? (
            <VersionComparison />
          ) : currentPlan ? (
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
              {/* Plan Input Summary */}
              <PlanInputSummary />

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
                <h3 className="text-lg font-semibold text-foreground mb-4">Route Timeline</h3>
                <SegmentsTimeline />
              </section>

              {/* Compliance Status */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-4">HOS Compliance</h3>
                <ComplianceStatus />
              </section>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground">Generating plan...</p>
              </div>
            </div>
          )}
        </div>

        {/* Simulation Panel (Slide-in Overlay) */}
        {isSimulationMode && <SimulationPanel />}
      </div>
    );
  }

  // Wizard view (steps 1-4)
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Route Plan</h1>
          <p className="text-muted-foreground mt-1">
            Plan optimized routes with HOS compliance and rest stop insertion
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator />

        {/* Step Content */}
        <Card className="p-6">
          {currentStep === 'load' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Step 1: Select Load</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a load from the database or manually add stops
              </p>
              <LoadSourceSelector />
              {stops.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Stops ({stops.length})</h3>
                  <StopsManager />
                </div>
              )}
            </div>
          )}

          {currentStep === 'driver' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Step 2: Select Driver</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a driver and review their current HOS status
              </p>
              <DriverStateInput />
            </div>
          )}

          {currentStep === 'vehicle' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Step 3: Select Vehicle</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a vehicle and review fuel status
              </p>
              <VehicleStateInput />
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Step 4: Review & Generate</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Review your selections and generate the optimized route plan
              </p>

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Load:</span>
                  <span className="text-sm text-muted-foreground">{stops.length} stops</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Driver:</span>
                  <span className="text-sm text-muted-foreground">{driverId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Vehicle:</span>
                  <span className="text-sm text-muted-foreground">{vehicleId}</span>
                </div>
              </div>

              {/* Stops Preview */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Route Stops</h3>
                <div className="space-y-2">
                  {stops.map((stop, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-2 bg-background rounded border border-border"
                    >
                      <div className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {stop.city || stop.name}, {stop.state}
                        </p>
                        <p className="text-xs text-muted-foreground">{stop.action_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 'load'}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 'load' && !isLoadStepValid) ||
                (currentStep === 'driver' && !isDriverStepValid) ||
                (currentStep === 'vehicle' && !isVehicleStepValid) ||
                isOptimizing
              }
            >
              {currentStep === 'review'
                ? isOptimizing
                  ? 'Generating...'
                  : 'Generate Plan'
                : 'Next'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

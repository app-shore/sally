"use client";

import { useRoutePlanStore } from "@/features/routing/route-planning";
import { Card } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Slider } from "@/shared/components/ui/slider";
import { useQuery } from "@tanstack/react-query";
import { listVehicles } from "@/features/fleet/vehicles";

export function VehicleStateInput() {
  const { vehicleId, setVehicleId, vehicleState, setVehicleState, selectedScenario } = useRoutePlanStore();

  // Fetch available vehicles
  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => listVehicles(),
    staleTime: 5 * 60 * 1000,
  });

  // Handle vehicle selection - load vehicle's current state
  const handleVehicleSelect = (selectedVehicleId: string) => {
    setVehicleId(selectedVehicleId);

    if (selectedVehicleId && vehicles) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (vehicle) {
        // Load vehicle's actual current state
        setVehicleState({
          fuel_capacity_gallons: vehicle.fuel_capacity_gallons || 200,
          current_fuel_gallons: vehicle.current_fuel_gallons || 0,
          mpg: vehicle.mpg || 6.5,
        });
      }
    }
  };

  const updateField = (field: string, value: number) => {
    const currentState = vehicleState || {
      fuel_capacity_gallons: 200,
      current_fuel_gallons: 180,
      mpg: 6.5,
    };
    setVehicleState({
      ...currentState,
      [field]: value,
    } as any);
  };

  const fuelCapacity = vehicleState?.fuel_capacity_gallons ?? 200;
  const currentFuel = vehicleState?.current_fuel_gallons ?? 180;
  const mpg = vehicleState?.mpg ?? 6.5;

  const fuelPercentage = (currentFuel / fuelCapacity) * 100;
  const range = currentFuel * mpg;

  const isManualEntry = !selectedScenario;
  const isComplete = vehicleState !== null;

  return (
    <Card className={`p-4 ${isManualEntry && !isComplete ? 'border-2 border-yellow-400' : ''}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="font-medium text-foreground">
            4. Vehicle State {isManualEntry && <span className="text-red-600">*</span>}
          </div>
          {selectedScenario && (
            <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded">
              From scenario (editable)
            </span>
          )}
        </div>

        {/* Vehicle Selection */}
        <div>
          <Label htmlFor="id">Vehicle <span className="text-red-600">*</span></Label>
          <select
            id="id"
            value={vehicleId || ""}
            onChange={(e) => handleVehicleSelect(e.target.value)}
            disabled={loadingVehicles}
            className="mt-2 w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select vehicle...</option>
            {vehicleId && selectedScenario && !vehicles?.find(v => v.id === vehicleId) && (
              <option value={vehicleId}>{vehicleId} (from scenario)</option>
            )}
            {vehicles?.map((vehicle) => {
              const fuelCapacity = vehicle.fuel_capacity_gallons || 200;
              const currentFuel = vehicle.current_fuel_gallons || 0;
              const fuelPercent = fuelCapacity > 0 ? ((currentFuel / fuelCapacity) * 100).toFixed(0) : 0;

              return (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.id} - {vehicle.unit_number} ({currentFuel.toFixed(0)}/{fuelCapacity.toFixed(0)} gal, {fuelPercent}%)
                </option>
              );
            })}
          </select>
          {selectedScenario && !vehicleId && (
            <p className="text-xs text-yellow-600 mt-1">
              ℹ️ This scenario doesn't specify a vehicle - please select one manually
            </p>
          )}
        </div>

        {/* Manual entry warning */}
        {isManualEntry && !isComplete && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg text-xs text-yellow-800 dark:text-yellow-200">
            ⚠️ Please set vehicle state manually (adjust values below)
          </div>
        )}

        {/* Fuel Level */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Fuel Level</Label>
            <span className="text-sm font-semibold text-foreground">
              {currentFuel.toFixed(0)} / {fuelCapacity.toFixed(0)} gallons ({fuelPercentage.toFixed(0)}%)
            </span>
          </div>
          <Slider
            value={[currentFuel]}
            onValueChange={([value]) => updateField("current_fuel_gallons", value)}
            max={fuelCapacity}
            step={5}
            className="mt-2"
          />
          {fuelPercentage < 25 && (
            <p className="text-xs text-yellow-600 mt-1">⚠ Low fuel</p>
          )}
        </div>

        {/* Fuel Capacity */}
        <div>
          <Label htmlFor="fuel_capacity">Fuel Capacity (gallons)</Label>
          <Input
            id="fuel_capacity"
            type="number"
            value={fuelCapacity}
            onChange={(e) => updateField("fuel_capacity_gallons", Number(e.target.value))}
            className="mt-2"
          />
        </div>

        {/* MPG */}
        <div>
          <Label htmlFor="mpg">Fuel Economy (MPG)</Label>
          <Input
            id="mpg"
            type="number"
            step="0.1"
            value={mpg}
            onChange={(e) => updateField("mpg", Number(e.target.value))}
            className="mt-2"
          />
        </div>

        {/* Calculated Range */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Estimated Range: ~{range.toFixed(0)} miles
          </div>
        </div>
      </div>
    </Card>
  );
}

export default VehicleStateInput;

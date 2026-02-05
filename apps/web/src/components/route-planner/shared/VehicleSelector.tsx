"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { listVehicles, type Vehicle } from "@/lib/api/vehicles";
import { useRoutePlanStore } from "@/stores/routePlanStore";
import type { VehicleStateInput } from "@/lib/types/routePlan";

export function VehicleSelector() {
  const {
    driverId,
    vehicleId,
    setVehicleId,
    driverAssignedVehicleId,
    isVehicleOverridden,
    setVehicleOverridden,
    setVehicleState,
  } = useRoutePlanStore();

  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch vehicles list
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: listVehicles,
  });

  // Auto-suggest driver's assigned vehicle (for now, just pick first vehicle)
  // In production, this would come from driver.assigned_vehicle_id
  useEffect(() => {
    if (driverId && vehicles.length > 0 && !vehicleId) {
      // For POC: auto-select first vehicle as "assigned"
      const assignedVehicle = vehicles[0];
      setVehicleId(assignedVehicle.id);
      setVehicleOverridden(false);

      // Auto-populate vehicle state
      const vehicleState: VehicleStateInput = {
        fuel_capacity_gallons: assignedVehicle.fuel_capacity_gallons,
        current_fuel_gallons: assignedVehicle.current_fuel_gallons || assignedVehicle.fuel_capacity_gallons,
        mpg: assignedVehicle.mpg || 6.5, // Default MPG if not set
      };
      setVehicleState(vehicleState);
    }
  }, [driverId, vehicles, vehicleId, setVehicleId, setVehicleOverridden, setVehicleState]);

  const handleVehicleChange = (newVehicleId: string) => {
    setVehicleId(newVehicleId);

    // Mark as overridden if user changes from assigned vehicle
    if (driverAssignedVehicleId && newVehicleId !== driverAssignedVehicleId) {
      setVehicleOverridden(true);
    } else {
      setVehicleOverridden(false);
    }

    // Update vehicle state from selected vehicle
    const vehicle = vehicles.find((v) => v.id === newVehicleId);
    if (vehicle) {
      const vehicleState: VehicleStateInput = {
        fuel_capacity_gallons: vehicle.fuel_capacity_gallons,
        current_fuel_gallons: vehicle.current_fuel_gallons || vehicle.fuel_capacity_gallons,
        mpg: vehicle.mpg || 6.5,
      };
      setVehicleState(vehicleState);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  // Calculate range
  const calculateRange = (vehicle: Vehicle) => {
    const fuelGallons = vehicle.current_fuel_gallons || vehicle.fuel_capacity_gallons;
    const mpg = vehicle.mpg || 6.5;
    return Math.floor(fuelGallons * mpg);
  };

  return (
    <div className="space-y-2">
      <Label>Vehicle</Label>
      <Select
        value={vehicleId || undefined}
        onValueChange={handleVehicleChange}
        disabled={isLoading || !driverId}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              isLoading
                ? "Loading vehicles..."
                : !driverId
                ? "Select driver first..."
                : "Select vehicle..."
            }
          />
        </SelectTrigger>
        <SelectContent>
          {vehicles.map((vehicle) => {
            // For POC: treat first vehicle as "assigned" to driver
            const isAssigned = vehicles[0]?.id === vehicle.id;
            const range = calculateRange(vehicle);

            return (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{vehicle.unit_number}</span>
                  {isAssigned && (
                    <Badge variant="outline">Default Truck</Badge>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {vehicle.current_fuel_gallons || vehicle.fuel_capacity_gallons}gal (~{range}mi)
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Fuel summary (collapsible) */}
      {selectedVehicle && (
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <span>{detailsOpen ? '▼' : '▶'}</span>
            <span>Fuel Details</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-3 bg-muted/30 rounded-md space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Current Fuel:</span>
              <span className="font-medium">
                {selectedVehicle.current_fuel_gallons || selectedVehicle.fuel_capacity_gallons}gal / {selectedVehicle.fuel_capacity_gallons}gal
              </span>
            </div>
            <div className="flex justify-between">
              <span>Range:</span>
              <span className="font-medium">
                ~{calculateRange(selectedVehicle)} miles
              </span>
            </div>
            <div className="flex justify-between">
              <span>MPG:</span>
              <span className="font-medium">
                {selectedVehicle.mpg || 6.5}
              </span>
            </div>
            {selectedVehicle.make && selectedVehicle.model && (
              <div className="pt-2 mt-2 border-t border-border flex justify-between">
                <span>Vehicle:</span>
                <span className="font-medium">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </span>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Override warning */}
      {isVehicleOverridden && (
        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
          ⚠️ Using non-default vehicle
        </div>
      )}
    </div>
  );
}

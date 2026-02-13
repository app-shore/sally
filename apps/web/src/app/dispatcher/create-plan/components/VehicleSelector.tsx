"use client";

import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useVehicles } from "@/features/fleet/vehicles/hooks/use-vehicles";

interface VehicleSelectorProps {
  value: string;
  onChange: (vehicleId: string) => void;
}

function getFuelPercent(
  current?: number | null,
  capacity?: number | null
): number | null {
  if (!current || !capacity || capacity === 0) return null;
  return Math.round((current / capacity) * 100);
}

export function VehicleSelector({ value, onChange }: VehicleSelectorProps) {
  const { data: vehicles, isLoading } = useVehicles();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Vehicle</Label>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">Vehicle</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select vehicle" />
        </SelectTrigger>
        <SelectContent>
          {vehicles && vehicles.length > 0 ? (
            vehicles
              .filter((v) => v.status === 'AVAILABLE' || v.status === undefined)
              .map((vehicle) => {
                const fuelPct = getFuelPercent(
                  vehicle.current_fuel_gallons,
                  vehicle.fuel_capacity_gallons
                );
                const label = [vehicle.make, vehicle.model]
                  .filter(Boolean)
                  .join(" ");
                const eqType = vehicle.equipment_type
                  ? vehicle.equipment_type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
                  : '';
                return (
                  <SelectItem
                    key={vehicle.vehicle_id}
                    value={vehicle.vehicle_id}
                  >
                    <div className="flex items-center gap-2">
                      <span>{vehicle.unit_number}</span>
                      {eqType && (
                        <span className="text-xs text-muted-foreground">
                          {eqType}
                        </span>
                      )}
                      {label && (
                        <span className="text-xs text-muted-foreground">
                          ({label})
                        </span>
                      )}
                      {fuelPct !== null && (
                        <span className="text-xs text-muted-foreground">
                          {fuelPct}% fuel
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })
          ) : (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No vehicles available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

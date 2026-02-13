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
import { useDrivers } from "@/features/fleet/drivers/hooks/use-drivers";

interface DriverSelectorProps {
  value: string;
  onChange: (driverId: string) => void;
}

function getHosColor(driveRemaining: number): string {
  if (driveRemaining >= 6) return "bg-green-500 dark:bg-green-400";
  if (driveRemaining >= 2) return "bg-yellow-500 dark:bg-yellow-400";
  return "bg-red-500 dark:bg-red-400";
}

export function DriverSelector({ value, onChange }: DriverSelectorProps) {
  const { data: drivers, isLoading } = useDrivers();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Driver</Label>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">Driver</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select driver" />
        </SelectTrigger>
        <SelectContent>
          {drivers && drivers.length > 0 ? (
            drivers.map((driver) => {
              const driveRemaining =
                driver.current_hos?.drive_remaining ?? 11;
              return (
                <SelectItem key={driver.driver_id} value={driver.driver_id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span>{driver.name}</span>
                      {driver.cdl_class && (
                        <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
                          CDL-{driver.cdl_class}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`h-2 w-2 rounded-full ${getHosColor(driveRemaining)}`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {driveRemaining.toFixed(1)}h left
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })
          ) : (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No drivers available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { listDrivers, getDriverHOS, type Driver } from "@/lib/api/drivers";
import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { formatRelativeTime } from "@/lib/api/integrations";
import type { DriverStateInput } from "@/lib/types/routePlan";

export function DriverSelector() {
  const {
    selectedLoadId,
    driverId,
    setDriverId,
    suggestedDriverId,
    setSuggestedDriverId,
    setDriverState,
    setDriverAssignedVehicleId,
  } = useRoutePlanStore();

  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch drivers list
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: listDrivers,
  });

  // Auto-suggest best driver when load is selected
  useEffect(() => {
    if (selectedLoadId && drivers.length > 0) {
      const suggestedDriver = suggestBestDriver(drivers);
      if (suggestedDriver) {
        setSuggestedDriverId(suggestedDriver.id);
        setDriverId(suggestedDriver.id);

        // Auto-populate driver state from HOS data
        if (suggestedDriver.current_hos) {
          const driverState: DriverStateInput = {
            hours_driven: 11 - suggestedDriver.current_hos.drive_remaining,
            on_duty_time: 14 - suggestedDriver.current_hos.shift_remaining,
            hours_since_break: suggestedDriver.current_hos.break_required ? 8 : 0,
          };
          setDriverState(driverState);
        } else {
          // Default state if no HOS data
          setDriverState({
            hours_driven: 0,
            on_duty_time: 0,
            hours_since_break: 0,
          });
        }
      }
    }
  }, [selectedLoadId, drivers, setSuggestedDriverId, setDriverId, setDriverState]);

  const suggestBestDriver = (driversList: Driver[]): Driver | null => {
    if (driversList.length === 0) return null;

    // Sort drivers by availability
    const sortedDrivers = [...driversList].sort((a, b) => {
      // Priority 1: Most hours remaining (HOS availability)
      const aHoursRemaining = a.current_hos?.drive_remaining || 11;
      const bHoursRemaining = b.current_hos?.drive_remaining || 11;
      if (aHoursRemaining !== bHoursRemaining) {
        return bHoursRemaining - aHoursRemaining; // Descending
      }

      // Priority 2: On-duty time remaining
      const aOnDutyRemaining = a.current_hos?.shift_remaining || 14;
      const bOnDutyRemaining = b.current_hos?.shift_remaining || 14;
      return bOnDutyRemaining - aOnDutyRemaining;
    });

    return sortedDrivers[0];
  };

  const handleDriverChange = async (newDriverId: string) => {
    setDriverId(newDriverId);

    // Try to fetch live HOS data from integration
    try {
      const hosData = await getDriverHOS(newDriverId);
      const driverState: DriverStateInput = {
        hours_driven: hosData.hours_driven,
        on_duty_time: hosData.on_duty_time,
        hours_since_break: hosData.hours_since_break,
      };
      setDriverState(driverState);
      console.log(`✅ Auto-fetched HOS for driver ${newDriverId} from ${hosData.data_source}`);
    } catch (error) {
      // Fallback to static data from driver object if integration fails
      console.warn('Failed to fetch live HOS, using static data:', error);
      const driver = drivers.find((d) => d.id === newDriverId);
      if (driver?.current_hos) {
        const driverState: DriverStateInput = {
          hours_driven: 11 - driver.current_hos.drive_remaining,
          on_duty_time: 14 - driver.current_hos.shift_remaining,
          hours_since_break: driver.current_hos.break_required ? 8 : 0,
        };
        setDriverState(driverState);
      } else {
        // Default state if no data available
        setDriverState({
          hours_driven: 0,
          on_duty_time: 0,
          hours_since_break: 0,
        });
      }
    }
  };

  const selectedDriver = drivers.find((d) => d.id === driverId);

  return (
    <div className="space-y-2">
      <Label>Driver</Label>
      <Select
        value={driverId || undefined}
        onValueChange={handleDriverChange}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading drivers..." : "Select driver..."} />
        </SelectTrigger>
        <SelectContent>
          {drivers.map((driver) => (
            <SelectItem key={driver.id} value={driver.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{driver.name}</span>
                {driver.id === suggestedDriverId && (
                  <Badge variant="secondary">✨ Suggested</Badge>
                )}
                {driver.current_hos && (
                  <span className="text-muted-foreground text-xs">
                    {driver.current_hos.drive_remaining.toFixed(1)}h available
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* HOS summary (collapsible) */}
      {selectedDriver && selectedDriver.current_hos && (
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <span>{detailsOpen ? '▼' : '▶'}</span>
            <span>HOS Details</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-3 bg-muted/30 rounded-md space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Drive Remaining:</span>
              <span className="font-medium">
                {selectedDriver.current_hos.drive_remaining.toFixed(1)}h / 11h
              </span>
            </div>
            <div className="flex justify-between">
              <span>Shift Remaining:</span>
              <span className="font-medium">
                {selectedDriver.current_hos.shift_remaining.toFixed(1)}h / 14h
              </span>
            </div>
            <div className="flex justify-between">
              <span>Cycle Remaining:</span>
              <span className="font-medium">
                {selectedDriver.current_hos.cycle_remaining.toFixed(1)}h / 70h
              </span>
            </div>
            {selectedDriver.current_hos.break_required && (
              <div className="pt-2 mt-2 border-t border-border">
                <Badge variant="destructive" className="text-xs">
                  Break Required
                </Badge>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

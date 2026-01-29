"use client";

import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useQuery } from "@tanstack/react-query";
import { listDrivers } from "@/lib/api/drivers";

export function DriverStateInput() {
  const { driverId, setDriverId, driverState, setDriverState, selectedScenario } = useRoutePlanStore();

  // Fetch available drivers
  const { data: drivers, isLoading: loadingDrivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => listDrivers(),
    staleTime: 5 * 60 * 1000,
  });

  // Handle driver selection - load driver's current state
  const handleDriverSelect = (selectedDriverId: string) => {
    setDriverId(selectedDriverId);

    if (selectedDriverId && drivers) {
      const driver = drivers.find(d => d.id === selectedDriverId);
      if (driver && driver.current_hos) {
        // Load driver's actual current state
        setDriverState({
          hours_driven: 11 - driver.current_hos.drive_remaining,
          on_duty_time: 14 - driver.current_hos.shift_remaining,
          hours_since_break: driver.current_hos.break_required ? 8 : 0,
        });
      }
    }
  };

  const updateField = (field: string, value: number) => {
    // Initialize state if it doesn't exist (first interaction)
    if (!driverState) {
      setDriverState({
        hours_driven: field === "hours_driven" ? value : 0,
        on_duty_time: field === "on_duty_time" ? value : 0,
        hours_since_break: field === "hours_since_break" ? value : 0,
      });
    } else {
      setDriverState({
        ...driverState,
        [field]: value,
      });
    }
  };

  const hoursdriven = driverState?.hours_driven ?? 0;
  const onDutyTime = driverState?.on_duty_time ?? 0;
  const hoursSinceBreak = driverState?.hours_since_break ?? 0;

  const isManualEntry = !selectedScenario;
  // Consider complete if user has interacted with it (state is set, even if all zeros)
  const isComplete = driverState !== null;

  const getDriveWarning = (hours: number) => {
    if (hours >= 10) return "text-red-600";
    if (hours >= 9) return "text-yellow-600";
    return "text-foreground";
  };

  const getDutyWarning = (hours: number) => {
    if (hours >= 13) return "text-red-600";
    if (hours >= 12) return "text-yellow-600";
    return "text-foreground";
  };

  return (
    <Card className={`p-4 ${isManualEntry && !isComplete ? 'border-2 border-yellow-400' : ''}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="font-medium text-foreground">
            3. Driver State {isManualEntry && <span className="text-red-600">*</span>}
          </div>
          {selectedScenario && (
            <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded">
              From scenario (editable)
            </span>
          )}
        </div>

        {/* Driver Selection */}
        <div>
          <Label htmlFor="id">Driver <span className="text-red-600">*</span></Label>
          <select
            id="id"
            value={driverId || ""}
            onChange={(e) => handleDriverSelect(e.target.value)}
            disabled={loadingDrivers}
            className="mt-2 w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select driver...</option>
            {driverId && selectedScenario && !drivers?.find(d => d.id === driverId) && (
              <option value={driverId}>{driverId} (from scenario)</option>
            )}
            {drivers?.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.id} - {driver.name} {driver.current_hos ? `(${(11 - driver.current_hos.drive_remaining).toFixed(1)}h driven)` : ''}
              </option>
            ))}
          </select>
          {selectedScenario && !driverId && (
            <p className="text-xs text-yellow-600 mt-1">
              ℹ️ This scenario doesn't specify a driver - please select one manually
            </p>
          )}
        </div>

        {/* Manual entry warning */}
        {isManualEntry && !isComplete && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg text-xs text-yellow-800 dark:text-yellow-200">
            ⚠️ Please set driver state manually (adjust sliders below)
          </div>
        )}

        {/* Hours Driven */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Hours Driven</Label>
            <span className={`text-sm font-semibold ${getDriveWarning(hoursdriven)}`}>
              {hoursdriven.toFixed(1)}h / 11.0h
            </span>
          </div>
          <Slider
            value={[hoursdriven]}
            onValueChange={([value]) => updateField("hours_driven", value)}
            max={11}
            step={0.5}
            className="mt-2"
          />
          {hoursdriven >= 10 && (
            <p className="text-xs text-red-600 mt-1">⚠ Approaching drive limit</p>
          )}
        </div>

        {/* On-Duty Time */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>On-Duty Time</Label>
            <span className={`text-sm font-semibold ${getDutyWarning(onDutyTime)}`}>
              {onDutyTime.toFixed(1)}h / 14.0h
            </span>
          </div>
          <Slider
            value={[onDutyTime]}
            onValueChange={([value]) => updateField("on_duty_time", value)}
            max={14}
            step={0.5}
            className="mt-2"
          />
          {onDutyTime >= 13 && (
            <p className="text-xs text-red-600 mt-1">⚠ Approaching duty window limit</p>
          )}
        </div>

        {/* Hours Since Break */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Hours Since Break</Label>
            <span className="text-sm font-semibold text-foreground">
              {hoursSinceBreak.toFixed(1)}h / 8.0h
            </span>
          </div>
          <Slider
            value={[hoursSinceBreak]}
            onValueChange={([value]) => updateField("hours_since_break", value)}
            max={8}
            step={0.5}
            className="mt-2"
          />
          {hoursSinceBreak >= 7.5 && (
            <p className="text-xs text-yellow-600 mt-1">⚠ Break required soon</p>
          )}
        </div>
      </div>
    </Card>
  );
}

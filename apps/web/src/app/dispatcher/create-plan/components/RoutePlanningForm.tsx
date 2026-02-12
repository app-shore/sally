"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { LoadSelector } from "./LoadSelector";
import { DriverSelector } from "./DriverSelector";
import { VehicleSelector } from "./VehicleSelector";
import type { CreateRoutePlanRequest } from "@/features/routing/route-planning";

interface RoutePlanningFormProps {
  onSubmit: (data: CreateRoutePlanRequest) => void;
  isSubmitting: boolean;
}

function getDefaultDepartureTime(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  // Round to nearest 15 min
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function RoutePlanningForm({
  onSubmit,
  isSubmitting,
}: RoutePlanningFormProps) {
  const [selectedLoadIds, setSelectedLoadIds] = useState<string[]>([]);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [departureTime, setDepartureTime] = useState(getDefaultDepartureTime());
  const [priority, setPriority] = useState<string>("balance");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [preferredRestType, setPreferredRestType] = useState("auto");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [maxFuelDetour, setMaxFuelDetour] = useState("15");

  const isValid =
    selectedLoadIds.length > 0 && driverId !== "" && vehicleId !== "";

  const handleSubmit = () => {
    if (!isValid) return;

    const request: CreateRoutePlanRequest = {
      driverId,
      vehicleId,
      loadIds: selectedLoadIds,
      departureTime: new Date(departureTime).toISOString(),
      optimizationPriority: priority as CreateRoutePlanRequest["optimizationPriority"],
      dispatcherParams: {
        preferredRestType: preferredRestType as "auto" | "full" | "split_8_2" | "split_7_3",
        avoidTollRoads: avoidTolls,
        maxDetourMilesForFuel: Number(maxFuelDetour) || 15,
      },
    };

    onSubmit(request);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Load Selection */}
      <LoadSelector
        selectedLoadIds={selectedLoadIds}
        onSelectionChange={setSelectedLoadIds}
      />

      {/* Driver + Vehicle row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DriverSelector value={driverId} onChange={setDriverId} />
        <VehicleSelector value={vehicleId} onChange={setVehicleId} />
      </div>

      {/* Departure Time */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          Departure Time
        </Label>
        <Input
          type="datetime-local"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="max-w-[260px]"
        />
      </div>

      {/* Optimization Priority */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          Optimization Priority
        </Label>
        <RadioGroup
          value={priority}
          onValueChange={setPriority}
          className="flex gap-1"
        >
          {[
            { value: "minimize_time", label: "Fastest" },
            { value: "balance", label: "Balanced" },
            { value: "minimize_cost", label: "Cheapest" },
          ].map((option) => (
            <Label
              key={option.value}
              htmlFor={`priority-${option.value}`}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border cursor-pointer transition-colors text-sm ${
                priority === option.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <RadioGroupItem
                value={option.value}
                id={`priority-${option.value}`}
                className="sr-only"
              />
              {option.label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Advanced Options */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {advancedOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Advanced Options
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-4 pl-5 border-l border-border">
          <div className="space-y-2">
            <Label className="text-sm text-foreground">
              Rest Preference
            </Label>
            <Select
              value={preferredRestType}
              onValueChange={setPreferredRestType}
            >
              <SelectTrigger className="max-w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (recommended)</SelectItem>
                <SelectItem value="full">Full rest only</SelectItem>
                <SelectItem value="split_8_2">Split 8+2</SelectItem>
                <SelectItem value="split_7_3">Split 7+3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="avoid-tolls"
              checked={avoidTolls}
              onCheckedChange={(checked) => setAvoidTolls(checked === true)}
            />
            <Label
              htmlFor="avoid-tolls"
              className="text-sm text-foreground cursor-pointer"
            >
              Avoid toll roads
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-foreground">
              Max fuel detour (miles)
            </Label>
            <Input
              type="number"
              value={maxFuelDetour}
              onChange={(e) => setMaxFuelDetour(e.target.value)}
              min={0}
              max={50}
              className="max-w-[120px]"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting}
        className="w-full h-12 text-base"
        size="lg"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Planning...
          </div>
        ) : (
          "Plan Route"
        )}
      </Button>
    </div>
  );
}

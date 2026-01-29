"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEngineStore } from "@/lib/store/engineStore";
import { ChevronDown, Database } from "lucide-react";
import type React from "react";

interface SliderFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  futureSource?: "ELD" | "TMS";
  description?: string;
}

function SliderField({
  id,
  name,
  label,
  value,
  onChange,
  min = 0,
  max = 24,
  step = 0.1,
  unit = "h",
  futureSource,
  description,
}: SliderFieldProps) {
  const numValue = parseFloat(value) || 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          {futureSource && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              {futureSource}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            id={id}
            name={name}
            type="number"
            step={step}
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="h-8 w-20 text-right text-sm"
          />
          <span className="text-sm text-muted-foreground w-6">{unit}</span>
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <Slider
        id={`${id}-slider`}
        min={min}
        max={max}
        step={step}
        value={[numValue]}
        onValueChange={(values) => onChange(values[0])}
        className="mt-2"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

interface FieldWithSourceProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  futureSource?: "ELD" | "TMS";
}

function FieldWithSource({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  futureSource,
}: FieldWithSourceProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        {futureSource && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Database className="h-3 w-3" />
            {futureSource}
          </span>
        )}
      </div>
      <Input
        id={id}
        name={name}
        type={type}
        step={step}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  // On mobile (< 1024px), default to closed; on desktop, use defaultOpen prop
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? defaultOpen : false;
    }
    return defaultOpen;
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-gray-50 dark:bg-gray-900 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ControlPanelProps {
  formData: {
    driver_id: string;
    hours_driven: string;
    on_duty_time: string;
    hours_since_break: string;
    dock_duration_hours: string;
    dock_location: string;
    remaining_distance_miles: string;
    destination: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    driver_id: string;
    hours_driven: string;
    on_duty_time: string;
    hours_since_break: string;
    dock_duration_hours: string;
    dock_location: string;
    remaining_distance_miles: string;
    destination: string;
  }>>;
  onRunEngine: () => void;
  isRunning?: boolean;
}

export function ControlPanel({ formData, setFormData, onRunEngine, isRunning = false }: ControlPanelProps) {
  const { clearForm } = useEngineStore();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSliderChange = (name: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value.toString(),
    }));
  };

  const handleClear = () => {
    setFormData({
      driver_id: "",
      hours_driven: "",
      on_duty_time: "",
      hours_since_break: "",
      dock_duration_hours: "",
      dock_location: "",
      remaining_distance_miles: "",
      destination: "",
    });
    clearForm();
  };

  return (
    <div className="h-full p-3 sm:p-4">
      <Card className="border-0 shadow-none lg:shadow-sm lg:border">
        <CardHeader className="px-0 pt-0 lg:px-6 lg:pt-6">
          <CardTitle className="text-base sm:text-lg font-semibold">
            Engine Parameters
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Configure driver and trip details
          </p>
        </CardHeader>
        <CardContent className="space-y-4 px-0 lg:px-6">
          {/* Driver Status Section */}
          <Section title="Driver Status">
            <FieldWithSource
              id="driver_id"
              name="driver_id"
              label="Driver ID"
              value={formData.driver_id}
              onChange={handleInputChange}
              placeholder="DRV-001"
              futureSource="ELD"
            />
            <SliderField
              id="hours_driven"
              name="hours_driven"
              label="Hours Driven"
              value={formData.hours_driven}
              onChange={(val) => handleSliderChange("hours_driven", val)}
              min={0}
              max={11}
              step={0.5}
              unit="h"
              futureSource="ELD"
              description="Hours driven in current duty period (max 11h)"
            />
            <SliderField
              id="on_duty_time"
              name="on_duty_time"
              label="On-Duty Time"
              value={formData.on_duty_time}
              onChange={(val) => handleSliderChange("on_duty_time", val)}
              min={0}
              max={14}
              step={0.5}
              unit="h"
              futureSource="ELD"
              description="Total on-duty time including driving (max 14h)"
            />
            <SliderField
              id="hours_since_break"
              name="hours_since_break"
              label="Since Last Break"
              value={formData.hours_since_break}
              onChange={(val) => handleSliderChange("hours_since_break", val)}
              min={0}
              max={10}
              step={0.5}
              unit="h"
              futureSource="ELD"
              description="Hours driven since last 30-min break (required after 8h)"
            />
          </Section>

          <Separator className="my-4" />

          {/* Route & Dock Information Section */}
          <Section title="Route & Dock Information">
            <FieldWithSource
              id="dock_location"
              name="dock_location"
              label="Dock Location"
              value={formData.dock_location}
              onChange={handleInputChange}
              placeholder="Atlanta Distribution Center"
              futureSource="TMS"
            />
            <SliderField
              id="dock_duration_hours"
              name="dock_duration_hours"
              label="Dock Duration"
              value={formData.dock_duration_hours}
              onChange={(val) => handleSliderChange("dock_duration_hours", val)}
              min={0}
              max={12}
              step={0.5}
              unit="h"
              futureSource="TMS"
              description="Expected or actual dock time (loading/unloading)"
            />
            <FieldWithSource
              id="destination"
              name="destination"
              label="Destination"
              value={formData.destination}
              onChange={handleInputChange}
              placeholder="Miami, FL"
              futureSource="TMS"
            />
            <SliderField
              id="remaining_distance_miles"
              name="remaining_distance_miles"
              label="Remaining Distance"
              value={formData.remaining_distance_miles}
              onChange={(val) => handleSliderChange("remaining_distance_miles", val)}
              min={0}
              max={500}
              step={10}
              unit="mi"
              futureSource="TMS"
              description="Distance to destination for post-load drive prediction"
            />
          </Section>

          <Separator className="my-4" />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={onRunEngine}
              disabled={isRunning}
              className="flex-1 bg-gray-900 hover:bg-gray-800 w-full"
            >
              {isRunning ? "Running..." : "Run Engine"}
            </Button>
            <Button
              onClick={handleClear}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Clear
            </Button>
          </div>

          {/* Future Integration Notice */}
          <div className="rounded-md bg-gray-50 dark:bg-gray-900 p-3">
            <div className="flex items-start gap-2">
              <Database className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Parameters marked with <span className="font-medium">ELD</span> and{" "}
                  <span className="font-medium">TMS</span> are expected to be
                  automatically populated from your Electronic Logging Device and
                  Transportation Management System in actual system.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

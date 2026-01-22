"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEngineStore } from "@/lib/store/engineStore";
import { ChevronDown, Database } from "lucide-react";
import type React from "react";

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
          <span className="flex items-center gap-1 text-xs text-gray-500">
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
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-gray-50 px-3 py-2 hover:bg-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
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
    <div className="h-full p-4">
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-lg font-semibold">
            Engine Parameters
          </CardTitle>
          <p className="text-xs text-gray-500">
            Configure driver and trip details
          </p>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
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
            <FieldWithSource
              id="hours_driven"
              name="hours_driven"
              label="Hours Driven Today"
              value={formData.hours_driven}
              onChange={handleInputChange}
              placeholder="8.5"
              type="number"
              step="0.1"
              futureSource="ELD"
            />
            <FieldWithSource
              id="on_duty_time"
              name="on_duty_time"
              label="Total On-Duty Time"
              value={formData.on_duty_time}
              onChange={handleInputChange}
              placeholder="10"
              type="number"
              step="0.1"
              futureSource="ELD"
            />
            <FieldWithSource
              id="hours_since_break"
              name="hours_since_break"
              label="Hours Since Last Break"
              value={formData.hours_since_break}
              onChange={handleInputChange}
              placeholder="6"
              type="number"
              step="0.1"
              futureSource="ELD"
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
            <FieldWithSource
              id="dock_duration_hours"
              name="dock_duration_hours"
              label="Dock Duration (hours)"
              value={formData.dock_duration_hours}
              onChange={handleInputChange}
              placeholder="12"
              type="number"
              step="0.1"
              futureSource="TMS"
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
            <FieldWithSource
              id="remaining_distance_miles"
              name="remaining_distance_miles"
              label="Remaining Distance (miles)"
              value={formData.remaining_distance_miles}
              onChange={handleInputChange}
              placeholder="150"
              type="number"
              step="1"
              futureSource="TMS"
            />
          </Section>

          <Separator className="my-4" />

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onRunEngine}
              disabled={isRunning}
              className="flex-1 bg-gray-900 hover:bg-gray-800"
            >
              {isRunning ? "Running..." : "Run Engine"}
            </Button>
            <Button
              onClick={handleClear}
              variant="outline"
              className="border-gray-300"
            >
              Clear
            </Button>
          </div>

          {/* Future Integration Notice */}
          <div className="rounded-md bg-gray-50 p-3">
            <div className="flex items-start gap-2">
              <Database className="h-4 w-4 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-600 leading-relaxed">
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

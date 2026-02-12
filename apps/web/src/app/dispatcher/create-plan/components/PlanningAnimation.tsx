"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

const PLANNING_STEPS = [
  "Optimizing stop sequence",
  "Simulating HOS compliance",
  "Finding optimal fuel stops",
  "Checking weather conditions",
  "Building route plan",
];

const STEP_DELAY_MS = 800;

export function PlanningAnimation() {
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCompletedSteps((prev) => {
        if (prev >= PLANNING_STEPS.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, STEP_DELAY_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Spinner */}
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-foreground" />

      {/* Title */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">
          SALLY is planning your route
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          This usually takes a few seconds
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3 w-full max-w-xs">
        {PLANNING_STEPS.map((step, index) => {
          const isCompleted = index < completedSteps;
          const isCurrent = index === completedSteps;

          return (
            <div
              key={step}
              className={`flex items-center gap-3 transition-opacity duration-300 ${
                index <= completedSteps ? "opacity-100" : "opacity-0"
              }`}
            >
              {isCompleted ? (
                <div className="h-5 w-5 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-background" />
                </div>
              ) : isCurrent ? (
                <div className="h-5 w-5 rounded-full border-2 border-foreground flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  isCompleted || isCurrent
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { usePlanRoute } from "@/features/routing/route-planning";
import type { CreateRoutePlanRequest, RoutePlanResult } from "@/features/routing/route-planning";
import { RoutePlanningForm } from "../../create-plan/components/RoutePlanningForm";
import { PlanningAnimation } from "../../create-plan/components/PlanningAnimation";

type Phase = "form" | "planning";

export default function CreatePlanPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const planRoute = usePlanRoute();

  const handleSubmit = async (data: CreateRoutePlanRequest) => {
    setPhase("planning");

    const minDelay = new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const [result] = await Promise.all([
        planRoute.mutateAsync(data),
        minDelay,
      ]);
      // Navigate to the plan detail page
      router.push(`/dispatcher/plans/${(result as RoutePlanResult).planId}`);
    } catch {
      setPhase("form");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950">
      {phase === "form" && (
        <div className="py-6 px-4 md:px-6">
          {/* Back navigation */}
          <div className="max-w-2xl mx-auto mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dispatcher/plans")}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Route Plans
            </Button>
          </div>

          {/* Centered card */}
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                  Create Route Plan
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Select loads, assign a driver and vehicle, and SALLY will plan the optimal route
                </p>
              </div>

              {planRoute.isError && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>
                    {(planRoute.error as Error)?.message ||
                      "Failed to plan route. Please check your inputs and try again."}
                  </AlertDescription>
                </Alert>
              )}

              <RoutePlanningForm
                onSubmit={handleSubmit}
                isSubmitting={planRoute.isPending}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "planning" && (
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <PlanningAnimation />
        </div>
      )}
    </div>
  );
}

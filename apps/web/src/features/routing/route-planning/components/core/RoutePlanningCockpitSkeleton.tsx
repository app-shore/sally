"use client";

/**
 * Route Planning Cockpit Skeleton - Loading state
 *
 * Shows skeleton while route is being generated
 */

import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function RoutePlanningCockpitSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-16 w-20" />
              <Skeleton className="h-16 w-20" />
              <Skeleton className="h-16 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs skeleton */}
      <Card>
        <CardHeader>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    </div>
  );
}

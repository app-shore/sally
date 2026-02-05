"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeatureGuard } from "@/components/feature-flags/FeatureGuard";

export default function ActiveRoutesPage() {
  return (
    <FeatureGuard featureKey="live_tracking_enabled">
      <ActiveRoutesPageContent />
    </FeatureGuard>
  );
}

function ActiveRoutesPageContent() {
  const { isAuthenticated, user } = useAuthStore();

  // Auth is handled by layout-client, just check role
  if (
    !isAuthenticated ||
    (user?.role !== "DISPATCHER" &&
      user?.role !== "ADMIN" &&
      user?.role !== "OWNER")
  ) {
    return null;
  }

  // Mock data for demonstration
  const mockRoutes = [
    {
      id: "RT-1234",
      driver: "Driver #45",
      origin: "Los Angeles, CA",
      destination: "Phoenix, AZ",
      status: "in_transit",
      progress: 65,
      eta: "4:30 PM",
    },
    {
      id: "RT-1235",
      driver: "Driver #12",
      origin: "Seattle, WA",
      destination: "Portland, OR",
      status: "in_transit",
      progress: 85,
      eta: "2:15 PM",
    },
    {
      id: "RT-1236",
      driver: "Driver #78",
      origin: "Denver, CO",
      destination: "Salt Lake City, UT",
      status: "rest_stop",
      progress: 45,
      eta: "11:00 PM",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_transit":
        return <Badge variant="default">In Transit</Badge>;
      case "rest_stop":
        return <Badge variant="muted">Rest Stop</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Active Routes</h1>
        <p className="text-muted-foreground mt-1">
          Monitor ongoing routes and driver progress in real-time
        </p>
      </div>

      <div className="space-y-4">
        {mockRoutes.map((route) => (
          <Card key={route.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Route {route.id}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {route.driver}
                  </p>
                </div>
                {getStatusBadge(route.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Origin</p>
                    <p className="font-medium">{route.origin}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Destination</p>
                    <p className="font-medium">{route.destination}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{route.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${route.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">ETA: </span>
                    <span className="font-medium">{route.eta}</span>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockRoutes.length === 0 && (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            <p className="text-lg font-medium">No Active Routes</p>
            <p className="text-sm mt-2">
              Create a new route plan to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

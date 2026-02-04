"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/lib/store/sessionStore";
import { getDriver, type Driver } from "@/lib/api/drivers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, AlertCircle } from "lucide-react";
import { FeatureGuard } from "@/components/feature-flags/FeatureGuard";

export default function DriverDashboardPage() {
  return (
    <FeatureGuard featureKey="driver_dashboard_enabled">
      <DriverDashboardPageContent />
    </FeatureGuard>
  );
}

function DriverDashboardPageContent() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSessionStore();

  useEffect(() => {
    // Auth is handled by layout-client.tsx
    if (user?.driverId) {
      loadDriver();
    }
  }, [user]);

  const loadDriver = async () => {
    if (!user?.driverId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await getDriver(user.driverId);
      setDriver(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load driver data",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {driver?.name || "Driver"}
        </p>
      </div>

      {/* Quick status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Status
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">On Duty</div>
            <Badge variant="default" className="mt-2">
              Active
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Stop</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5 hrs</div>
            <p className="text-xs text-muted-foreground mt-2">Phoenix, AZ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-2">
              No active alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Driver info */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{driver?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">License Number</p>
              <p className="font-medium">{driver?.license_number}</p>
            </div>
            {driver?.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{driver.phone}</p>
              </div>
            )}
            {driver?.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{driver.email}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* HOS Status */}
      {driver?.current_hos && (
        <Card>
          <CardHeader>
            <CardTitle>Hours of Service Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">
                  Drive Time Remaining
                </span>
                <span className="text-sm text-muted-foreground">
                  {driver.current_hos.drive_remaining.toFixed(1)}h / 11h
                </span>
              </div>
              <Progress
                value={(driver.current_hos.drive_remaining / 11) * 100}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">
                  Shift Time Remaining
                </span>
                <span className="text-sm text-muted-foreground">
                  {driver.current_hos.shift_remaining.toFixed(1)}h / 14h
                </span>
              </div>
              <Progress
                value={(driver.current_hos.shift_remaining / 14) * 100}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">
                  Cycle Time Remaining
                </span>
                <span className="text-sm text-muted-foreground">
                  {driver.current_hos.cycle_remaining.toFixed(1)}h / 70h
                </span>
              </div>
              <Progress
                value={(driver.current_hos.cycle_remaining / 70) * 100}
              />
            </div>

            {driver.current_hos.break_required && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-800">
                  Break Required Soon
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
              <div className="flex-1">
                <p className="font-medium">Departed from Los Angeles</p>
                <p className="text-muted-foreground text-xs">
                  Today at 8:30 AM
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
              <div className="flex-1">
                <p className="font-medium">Rest stop scheduled</p>
                <p className="text-muted-foreground text-xs">
                  Today at 2:00 PM
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { OnboardingWidget } from "@/features/platform/onboarding";
import { useOnboardingStore } from "@/features/platform/onboarding";
import { useAuth } from "@/features/auth";
import {
  BarChart3,
  Users,
  Truck,
  Activity,
  Database,
  Server,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function AdminDashboard() {
  // Auth is handled by layout-client.tsx
  const { user } = useAuth();
  const { status } = useOnboardingStore();
  const showOnboardingWidget =
    (user?.role === "OWNER" || user?.role === "ADMIN") && status;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          System Overview
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor system health, performance metrics, and user activity
        </p>
      </div>

      {/* Onboarding Widget - Prominent placement at top */}
      {showOnboardingWidget && <OnboardingWidget status={status} />}

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Status
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">
                Operational
              </div>
              <Badge variant="default" className="bg-green-500 text-white">
                <CheckCircle className="h-3 w-3 mr-1" />
                Healthy
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All services running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">12</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600 dark:text-green-400">+2</span>{" "}
              from last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Routes
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">8</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-blue-600 dark:text-blue-400">3</span> in
              planning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Load
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">23%</div>
            <p className="text-xs text-muted-foreground mt-1">
              CPU utilization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Users</span>
              <span className="text-lg font-semibold text-foreground">45</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dispatchers</span>
              <span className="text-lg font-semibold text-foreground">8</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Drivers</span>
              <span className="text-lg font-semibold text-foreground">35</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Admins</span>
              <span className="text-lg font-semibold text-foreground">2</span>
            </div>
          </CardContent>
        </Card>

        {/* Service Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Service Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <div className="font-medium text-foreground">
                      Route Planning Engine
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Last checked: 1 min ago
                    </div>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-500 text-white">
                  Operational
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <div className="font-medium text-foreground">
                      Monitoring Service
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Last checked: 30 sec ago
                    </div>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-500 text-white">
                  Operational
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <div className="font-medium text-foreground">Database</div>
                    <div className="text-sm text-muted-foreground">
                      Last checked: 15 sec ago
                    </div>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-500 text-white">
                  Operational
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

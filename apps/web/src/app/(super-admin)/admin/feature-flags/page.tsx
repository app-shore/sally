"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFeatureFlags } from "@/lib/hooks/useFeatureFlags";
import { useFeatureFlagsStore } from "@/stores/featureFlagsStore";
import { updateFeatureFlag } from "@/lib/api/featureFlags";
import { Loader2, XCircle, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FeatureFlagsAdminPage() {
  const { isAuthenticated, user } = useAuthStore();
  const { flags, isLoading, error, refetch } = useFeatureFlags();
  const { toast } = useToast();

  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});
  const [savingFlags, setSavingFlags] = useState<Set<string>>(new Set());

  // Initialize local state from store
  useEffect(() => {
    const initialState: Record<string, boolean> = {};
    flags.forEach((flag) => {
      initialState[flag.key] = flag.enabled;
    });
    setLocalFlags(initialState);
  }, [flags]);

  // Auth check - SUPER_ADMIN only (affects all tenants globally)
  if (!isAuthenticated || user?.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-2">
              Only super admins can manage global feature flags
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggle = async (key: string, enabled: boolean) => {
    // Optimistically update local state
    setLocalFlags((prev) => ({
      ...prev,
      [key]: enabled,
    }));

    // Mark flag as saving
    setSavingFlags((prev) => new Set(prev).add(key));

    try {
      // Save to backend
      await updateFeatureFlag(key, enabled);

      // Show success toast
      const flag = flags.find((f) => f.key === key);
      toast({
        title: "Feature Flag Updated",
        description: `${flag?.name || key} has been ${enabled ? "enabled" : "disabled"}`,
      });

      // Refetch to sync with backend
      await refetch();
    } catch (err) {
      // Revert on error
      setLocalFlags((prev) => ({
        ...prev,
        [key]: !enabled,
      }));

      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update feature flag",
        variant: "destructive",
      });
    } finally {
      // Remove from saving state
      setSavingFlags((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "dispatcher":
        return "📊";
      case "driver":
        return "🚛";
      case "admin":
        return "⚙️";
      default:
        return "🏳️";
    }
  };

  const categorizedFlags = {
    dispatcher: flags.filter((f) => f.category === "dispatcher"),
    driver: flags.filter((f) => f.category === "driver"),
    admin: flags.filter((f) => f.category === "admin"),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading feature flags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Flag className="h-8 w-8" />
          Feature Flags Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Enable or disable features across the platform. Changes are saved
          automatically.
        </p>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">
                {flags.length}
              </p>
              <p className="text-sm text-muted-foreground">Total Flags</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {flags.filter((f) => localFlags[f.key]).length}
              </p>
              <p className="text-sm text-muted-foreground">Enabled</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                {flags.filter((f) => !localFlags[f.key]).length}
              </p>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispatcher Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Dispatcher Features
          </CardTitle>
          <CardDescription>
            Features available to dispatchers and fleet managers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categorizedFlags.dispatcher.map((flag, index) => (
            <div key={flag.key}>
              {index > 0 && <Separator className="my-4" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label
                      htmlFor={flag.key}
                      className="text-base font-semibold cursor-pointer"
                    >
                      {flag.name}
                    </Label>
                    <Badge
                      variant={localFlags[flag.key] ? "default" : "muted"}
                      className="text-xs"
                    >
                      {localFlags[flag.key] ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {flag.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    Key: {flag.key}
                  </p>
                </div>
                <Switch
                  id={flag.key}
                  checked={localFlags[flag.key] || false}
                  onCheckedChange={(checked) => handleToggle(flag.key, checked)}
                  disabled={savingFlags.has(flag.key)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Driver Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Driver Features
          </CardTitle>
          <CardDescription>
            Features available to drivers in the mobile/web app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categorizedFlags.driver.map((flag, index) => (
            <div key={flag.key}>
              {index > 0 && <Separator className="my-4" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label
                      htmlFor={flag.key}
                      className="text-base font-semibold cursor-pointer"
                    >
                      {flag.name}
                    </Label>
                    <Badge
                      variant={localFlags[flag.key] ? "default" : "muted"}
                      className="text-xs"
                    >
                      {localFlags[flag.key] ? "Enabled" : "Disabled"}
                    </Badge>
                    {savingFlags.has(flag.key) && (
                      <Badge
                        variant="outline"
                        className="text-xs border-blue-500 text-blue-600 dark:text-blue-400"
                      >
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Saving
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {flag.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    Key: {flag.key}
                  </p>
                </div>
                <Switch
                  id={flag.key}
                  checked={localFlags[flag.key] || false}
                  onCheckedChange={(checked) => handleToggle(flag.key, checked)}
                  disabled={savingFlags.has(flag.key)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Admin Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Admin Features
          </CardTitle>
          <CardDescription>
            Administrative and integration features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categorizedFlags.admin.map((flag, index) => (
            <div key={flag.key}>
              {index > 0 && <Separator className="my-4" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label
                      htmlFor={flag.key}
                      className="text-base font-semibold cursor-pointer"
                    >
                      {flag.name}
                    </Label>
                    <Badge
                      variant={localFlags[flag.key] ? "default" : "muted"}
                      className="text-xs"
                    >
                      {localFlags[flag.key] ? "Enabled" : "Disabled"}
                    </Badge>
                    {savingFlags.has(flag.key) && (
                      <Badge
                        variant="outline"
                        className="text-xs border-blue-500 text-blue-600 dark:text-blue-400"
                      >
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Saving
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {flag.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    Key: {flag.key}
                  </p>
                </div>
                <Switch
                  id={flag.key}
                  checked={localFlags[flag.key] || false}
                  onCheckedChange={(checked) => handleToggle(flag.key, checked)}
                  disabled={savingFlags.has(flag.key)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Warning Card */}
      <Card className="border-orange-200 ">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-orange-500 mt-0.5">⚠️</div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Important Notes
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>
                  Changes are saved automatically when you toggle a feature flag
                </li>
                <li>
                  Frontend cache (5min) and backend cache (30s) may cause brief
                  delay
                </li>
                <li>
                  Disabling a feature will show "Coming Soon" banners to users
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

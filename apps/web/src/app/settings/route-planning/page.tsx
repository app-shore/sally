'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSessionStore } from '@/lib/store/sessionStore';
import { usePreferencesStore } from '@/lib/store/preferencesStore';
import { DispatcherPreferences } from '@/lib/api/preferences';
import { Loader2, Save, RotateCcw, Route } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

export default function RoutePlanningPage() {
  const router = useRouter();
  const { user } = useSessionStore();
  const { dispatcherPreferences, updateDispatcherPrefs, resetToDefaults, loadAllPreferences, isSaving } = usePreferencesStore();
  const [formData, setFormData] = useState<Partial<DispatcherPreferences>>(dispatcherPreferences || {});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isDispatcher = user?.role === 'DISPATCHER' || user?.role === 'ADMIN' || user?.role === 'OWNER';

  useEffect(() => {
    if (user) {
      loadAllPreferences(user.role);
    }
  }, [user, loadAllPreferences]);

  // Redirect non-dispatchers
  useEffect(() => {
    if (user && !isDispatcher) {
      router.push('/settings/preferences');
    }
  }, [user, isDispatcher, router]);

  useEffect(() => {
    if (dispatcherPreferences) {
      setFormData(dispatcherPreferences);
    }
  }, [dispatcherPreferences]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateDispatcherPrefs(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all route planning preferences to defaults?')) {
      try {
        await resetToDefaults('dispatcher');
        // Reload from store after reset
        const resetPrefs = usePreferencesStore.getState().dispatcherPreferences;
        if (resetPrefs) {
          setFormData(resetPrefs);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error('Failed to reset preferences:', error);
      }
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isDispatcher) {
    return null; // Will redirect in useEffect
  }

  if (!dispatcherPreferences) {
    return (
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 max-w-5xl">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Route className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold">Route Planning Configuration</h1>
        </div>
        <p className="text-muted-foreground">
          Configure how SALLY plans routes for your organization. These settings apply to all dispatchers and route planning operations.
        </p>
      </div>

      <div className="space-y-6">
        {saveSuccess && (
          <Alert>
            <AlertDescription>Route planning preferences saved successfully!</AlertDescription>
          </Alert>
        )}

        {/* HOS Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>HOS Default Values</CardTitle>
            <CardDescription>
              Default hours of service values for new route planning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Default Drive Hours (0-11)</Label>
                <Input
                  type="number"
                  min="0"
                  max="11"
                  step="0.5"
                  value={formData.defaultDriveHours || 0}
                  onChange={(e) => handleChange('defaultDriveHours', parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Default On-Duty Hours (0-14)</Label>
                <Input
                  type="number"
                  min="0"
                  max="14"
                  step="0.5"
                  value={formData.defaultOnDutyHours || 0}
                  onChange={(e) => handleChange('defaultOnDutyHours', parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Default Since-Break Hours (0-8)</Label>
                <Input
                  type="number"
                  min="0"
                  max="8"
                  step="0.5"
                  value={formData.defaultSinceBreakHours || 0}
                  onChange={(e) => handleChange('defaultSinceBreakHours', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HOS Compliance Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>HOS Compliance Thresholds</CardTitle>
            <CardDescription>
              Warning and critical alert thresholds (percentage of limit)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Drive Hours Warning %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.driveHoursWarningPct || 75}
                  onChange={(e) => handleChange('driveHoursWarningPct', parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Drive Hours Critical %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.driveHoursCriticalPct || 90}
                  onChange={(e) => handleChange('driveHoursCriticalPct', parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optimization Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Route Optimization Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Optimization Mode</Label>
              <Select
                value={formData.defaultOptimizationMode || 'BALANCE'}
                onValueChange={(value) => handleChange('defaultOptimizationMode', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MINIMIZE_TIME">Minimize Time</SelectItem>
                  <SelectItem value="MINIMIZE_COST">Minimize Cost</SelectItem>
                  <SelectItem value="BALANCE">Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Per Mile ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPerMile || 1.85}
                  onChange={(e) => handleChange('costPerMile', parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Labor Cost Per Hour ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.laborCostPerHour || 25}
                  onChange={(e) => handleChange('laborCostPerHour', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rest Insertion Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Rest Insertion Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Prefer Full Rest (10h)</Label>
                <p className="text-sm text-muted-foreground">Prefer 10-hour rest over 7-hour partial rest</p>
              </div>
              <Switch
                checked={formData.preferFullRest !== false}
                onCheckedChange={(checked) => handleChange('preferFullRest', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Dock Rest</Label>
                <p className="text-sm text-muted-foreground">Use dock time for rest when possible</p>
              </div>
              <Switch
                checked={formData.allowDockRest !== false}
                onCheckedChange={(checked) => handleChange('allowDockRest', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label>Rest Stop Buffer (minutes)</Label>
              <Input
                type="number"
                min="0"
                max="120"
                value={formData.restStopBuffer || 30}
                onChange={(e) => handleChange('restStopBuffer', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fuel Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Fuel Stop Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fuel Price Threshold ($/gal)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.fuelPriceThreshold || 0.15}
                  onChange={(e) => handleChange('fuelPriceThreshold', parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Fuel Detour (miles)</Label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.maxFuelDetour || 10}
                  onChange={(e) => handleChange('maxFuelDetour', parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

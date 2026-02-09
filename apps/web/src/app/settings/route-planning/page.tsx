'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useAuthStore } from '@/features/auth';
import { usePreferencesStore } from '@/features/platform/settings';
import type { OperationsSettings } from '@/features/platform/settings';
import { Loader2, Save, RotateCcw } from 'lucide-react';

export default function RoutePlanningSettingsPage() {
  const { user } = useAuthStore();
  const { operationsSettings, updateOperationsSettings, resetToDefaults, loadAllPreferences, isSaving, isLoading } = usePreferencesStore();
  const [formData, setFormData] = useState<Partial<OperationsSettings>>(operationsSettings || {});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'OWNER';

  useEffect(() => {
    if (user) {
      loadAllPreferences(user.role);
    }
  }, [user, loadAllPreferences]);

  useEffect(() => {
    if (operationsSettings) setFormData(operationsSettings);
  }, [operationsSettings]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateOperationsSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save route planning settings:', error);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset route planning settings to defaults?')) {
      try {
        await resetToDefaults('operations');
        const resetSettings = usePreferencesStore.getState().operationsSettings;
        if (resetSettings) setFormData(resetSettings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error('Failed to reset route planning settings:', error);
      }
    }
  };

  if (isLoading || !operationsSettings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Route Planning</h2>
          <p className="text-sm text-muted-foreground">Company-wide defaults for how Sally plans routes. These apply to all dispatchers unless overridden per-route.</p>
        </div>
        <Badge variant={canEdit ? 'default' : 'muted'}>
          {canEdit ? 'Admin / Owner' : 'Read Only'}
        </Badge>
      </div>

      {saveSuccess && (
        <Alert>
          <AlertDescription>Route planning settings saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* HOS Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>HOS Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Drive Hours</Label>
              <p className="text-xs text-muted-foreground">Hours already driven today when the driver starts a new route. Usually 0 unless mid-shift.</p>
              <Input type="number" step="0.5" min="0" max="11" value={formData.defaultDriveHours ?? 0} onChange={(e) => handleChange('defaultDriveHours', parseFloat(e.target.value))} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Default On-Duty Hours</Label>
              <p className="text-xs text-muted-foreground">On-duty hours already used today. Includes driving, loading, and paperwork.</p>
              <Input type="number" step="0.5" min="0" max="14" value={formData.defaultOnDutyHours ?? 0} onChange={(e) => handleChange('defaultOnDutyHours', parseFloat(e.target.value))} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Default Since Last Break</Label>
              <p className="text-xs text-muted-foreground">Hours since the driver&apos;s last 30-minute break. Used for break scheduling.</p>
              <Input type="number" step="0.5" min="0" max="8" value={formData.defaultSinceBreakHours ?? 0} onChange={(e) => handleChange('defaultSinceBreakHours', parseFloat(e.target.value))} disabled={!canEdit} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Optimization Mode</Label>
              <p className="text-xs text-muted-foreground">Controls the trade-off between time and cost. &ldquo;Balance&rdquo; weights both equally.</p>
              <Select value={formData.defaultOptimizationMode || 'BALANCE'} onValueChange={(v) => handleChange('defaultOptimizationMode', v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MINIMIZE_TIME">Minimize Time</SelectItem>
                  <SelectItem value="MINIMIZE_COST">Minimize Cost</SelectItem>
                  <SelectItem value="BALANCE">Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cost Per Mile ($)</Label>
              <p className="text-xs text-muted-foreground">All-in cost including fuel, maintenance, and tires. Used for cost-optimized routes.</p>
              <Input type="number" step="0.05" min="0" value={formData.costPerMile ?? 1.85} onChange={(e) => handleChange('costPerMile', parseFloat(e.target.value))} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Labor Cost Per Hour ($)</Label>
              <p className="text-xs text-muted-foreground">Hourly driver cost including wages and benefits. Used for time vs cost trade-offs.</p>
              <Input type="number" step="0.50" min="0" value={formData.laborCostPerHour ?? 25.0} onChange={(e) => handleChange('laborCostPerHour', parseFloat(e.target.value))} disabled={!canEdit} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rest Stops */}
      <Card>
        <CardHeader>
          <CardTitle>Rest Stops</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Prefer Full Rest</Label>
                <p className="text-xs text-muted-foreground">When a rest stop is needed, prefer 10-hour full rest over 7-hour partial rest.</p>
              </div>
              <Switch checked={formData.preferFullRest ?? true} onCheckedChange={(c) => handleChange('preferFullRest', c)} disabled={!canEdit} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Dock Rest</Label>
                <p className="text-xs text-muted-foreground">Allow drivers to take their rest period at the destination dock if timing works.</p>
              </div>
              <Switch checked={formData.allowDockRest ?? true} onCheckedChange={(c) => handleChange('allowDockRest', c)} disabled={!canEdit} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rest Stop Buffer (minutes)</Label>
              <p className="text-xs text-muted-foreground">Extra time added before and after a rest stop for parking and settling in.</p>
              <Input type="number" min="0" max="120" value={formData.restStopBuffer ?? 30} onChange={(e) => handleChange('restStopBuffer', parseInt(e.target.value))} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Minimum Rest Duration (hours)</Label>
              <p className="text-xs text-muted-foreground">Shortest rest Sally will schedule. 7 = partial rest, 10 = full rest.</p>
              <Select value={String(formData.minRestDuration ?? 7)} onValueChange={(v) => handleChange('minRestDuration', parseInt(v))} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 hours (partial)</SelectItem>
                  <SelectItem value="10">10 hours (full)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fuel Stops */}
      <Card>
        <CardHeader>
          <CardTitle>Fuel Stops</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fuel Price Threshold ($/gal)</Label>
              <p className="text-xs text-muted-foreground">Only suggest a detour for fuel if savings exceed this amount per gallon.</p>
              <Input type="number" step="0.01" min="0" value={formData.fuelPriceThreshold ?? 0.15} onChange={(e) => handleChange('fuelPriceThreshold', parseFloat(e.target.value))} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Max Fuel Detour (miles)</Label>
              <p className="text-xs text-muted-foreground">Furthest Sally will detour from the route to reach a cheaper fuel stop.</p>
              <Input type="number" min="0" max="50" value={formData.maxFuelDetour ?? 10} onChange={(e) => handleChange('maxFuelDetour', parseInt(e.target.value))} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Min Fuel Savings ($)</Label>
              <p className="text-xs text-muted-foreground">Minimum dollar savings to justify a fuel detour. Prevents tiny savings for big detours.</p>
              <Input type="number" step="0.50" min="0" value={formData.minFuelSavings ?? 10.0} onChange={(e) => handleChange('minFuelSavings', parseFloat(e.target.value))} disabled={!canEdit} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Load Assignment</Label>
              <p className="text-xs text-muted-foreground">How loads are assigned to routes. &ldquo;Manual&rdquo; = dispatcher picks. &ldquo;Auto&rdquo; = Sally assigns.</p>
              <Select value={formData.defaultLoadAssignment || 'MANUAL'} onValueChange={(v) => handleChange('defaultLoadAssignment', v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="AUTO_ASSIGN">Auto Assign</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Driver Selection</Label>
              <p className="text-xs text-muted-foreground">How drivers are selected for routes. &ldquo;Auto Suggest&rdquo; recommends the best match.</p>
              <Select value={formData.defaultDriverSelection || 'AUTO_SUGGEST'} onValueChange={(v) => handleChange('defaultDriverSelection', v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="AUTO_SUGGEST">Auto Suggest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vehicle Selection</Label>
              <p className="text-xs text-muted-foreground">How vehicles are assigned. &ldquo;Driver Default&rdquo; uses the driver&apos;s usual truck.</p>
              <Select value={formData.defaultVehicleSelection || 'AUTO_ASSIGN'} onValueChange={(v) => handleChange('defaultVehicleSelection', v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="AUTO_ASSIGN">Auto Assign</SelectItem>
                  <SelectItem value="DRIVER_DEFAULT">Driver Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reporting */}
      <Card>
        <CardHeader>
          <CardTitle>Reporting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Report Timezone</Label>
              <p className="text-xs text-muted-foreground">Timezone used for all timestamps in generated reports.</p>
              <Select value={formData.reportTimezone || 'America/New_York'} onValueChange={(v) => handleChange('reportTimezone', v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Include Map in Reports</Label>
                <p className="text-xs text-muted-foreground">Embed a static map image in PDF and email reports.</p>
              </div>
              <Switch checked={formData.includeMapInReports ?? true} onCheckedChange={(c) => handleChange('includeMapInReports', c)} disabled={!canEdit} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save Changes</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

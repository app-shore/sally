'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useAuthStore } from '@/features/auth';
import { usePreferencesStore } from '@/features/platform/settings';
import type { DriverPreferences } from '@/features/platform/settings';
import { Loader2, Save, RotateCcw } from 'lucide-react';

export default function DriverRouteDisplayPage() {
  const { user } = useAuthStore();
  const { driverPreferences, updateDriverPrefs, resetToDefaults, loadAllPreferences, isSaving, isLoading } = usePreferencesStore();
  const [formData, setFormData] = useState<Partial<DriverPreferences>>(driverPreferences || {});
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      loadAllPreferences(user.role);
    }
  }, [user, loadAllPreferences]);

  useEffect(() => {
    if (driverPreferences) setFormData(driverPreferences);
  }, [driverPreferences]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateDriverPrefs(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save driver display settings:', error);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset route display settings to defaults?')) {
      try {
        await resetToDefaults('driver');
        const resetPrefs = usePreferencesStore.getState().driverPreferences;
        if (resetPrefs) setFormData(resetPrefs);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error('Failed to reset driver display settings:', error);
      }
    }
  };

  if (isLoading || !driverPreferences) {
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
      <div>
        <h2 className="text-xl font-semibold text-foreground">Route Display</h2>
        <p className="text-sm text-muted-foreground">Customize how routes appear in your driver view.</p>
      </div>

      {saveSuccess && (
        <Alert>
          <AlertDescription>Route display settings saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* Route Display */}
      <Card>
        <CardHeader>
          <CardTitle>Route Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Timeline View</Label>
            <p className="text-xs text-muted-foreground">How your route timeline is displayed. &ldquo;Detailed&rdquo; shows every stop and segment, &ldquo;Summary&rdquo; shows only key stops.</p>
            <Select value={formData.timelineView || 'DETAILED'} onValueChange={(v) => handleChange('timelineView', v)}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DETAILED">Detailed</SelectItem>
                <SelectItem value="SUMMARY">Summary</SelectItem>
                <SelectItem value="COMPACT">Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Rest Reasoning</Label>
              <p className="text-xs text-muted-foreground">Display why Sally inserted each rest stop (e.g., &ldquo;HOS limit reached at 10.5h&rdquo;).</p>
            </div>
            <Switch checked={formData.showRestReasoning ?? true} onCheckedChange={(c) => handleChange('showRestReasoning', c)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Cost Details</Label>
              <p className="text-xs text-muted-foreground">Show fuel cost, toll cost, and total cost breakdown on the route view.</p>
            </div>
            <Switch checked={formData.showCostDetails ?? false} onCheckedChange={(c) => handleChange('showCostDetails', c)} />
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
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />Save Changes</>
          )}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { usePreferencesStore } from '@/features/platform/preferences';
import { DriverPreferences } from '@/features/platform/preferences';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

export default function DriverPreferencesTab() {
  const { driverPreferences, updateDriverPrefs, resetToDefaults, isSaving } = usePreferencesStore();
  const [formData, setFormData] = useState<Partial<DriverPreferences>>(driverPreferences || {});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateDriverPrefs(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all driver preferences to defaults?')) {
      try {
        await resetToDefaults('driver');
        // Reload from store after reset
        const resetPrefs = usePreferencesStore.getState().driverPreferences;
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

  if (!driverPreferences) {
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
      {saveSuccess && (
        <Alert>
          <AlertDescription>Driver preferences saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* Break Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Break Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preferred Break Duration (minutes)</Label>
              <Input
                type="number"
                min="10"
                max="60"
                value={formData.preferredBreakDuration || 30}
                onChange={(e) => handleChange('preferredBreakDuration', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Break Reminder Advance (minutes)</Label>
              <Input
                type="number"
                min="10"
                max="60"
                value={formData.breakReminderAdvance || 30}
                onChange={(e) => handleChange('breakReminderAdvance', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Display */}
      <Card>
        <CardHeader>
          <CardTitle>Route Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Timeline View</Label>
            <Select
              value={formData.timelineView || 'VERTICAL'}
              onValueChange={(value) => handleChange('timelineView', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VERTICAL">Vertical</SelectItem>
                <SelectItem value="HORIZONTAL">Horizontal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Rest Reasoning</Label>
              <p className="text-sm text-muted-foreground">Display why rest stops were inserted</p>
            </div>
            <Switch
              checked={formData.showRestReasoning !== false}
              onCheckedChange={(checked) => handleChange('showRestReasoning', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Cost Details</Label>
              <p className="text-sm text-muted-foreground">Display cost information</p>
            </div>
            <Switch
              checked={formData.showCostDetails || false}
              onCheckedChange={(checked) => handleChange('showCostDetails', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mobile Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Mobile Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Large Text Mode</Label>
              <p className="text-sm text-muted-foreground">Enable larger fonts for better readability</p>
            </div>
            <Switch
              checked={formData.largeTextMode || false}
              onCheckedChange={(checked) => handleChange('largeTextMode', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Offline Mode</Label>
              <p className="text-sm text-muted-foreground">Cache data for offline access</p>
            </div>
            <Switch
              checked={formData.offlineMode || false}
              onCheckedChange={(checked) => handleChange('offlineMode', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Usage Mode</Label>
            <Select
              value={formData.dataUsageMode || 'NORMAL'}
              onValueChange={(value) => handleChange('dataUsageMode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low (save data)</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="HIGH">High (best quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Communication */}
      <Card>
        <CardHeader>
          <CardTitle>Communication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Emergency Contact</Label>
            <Input
              type="tel"
              placeholder="+1234567890"
              value={formData.emergencyContact || ''}
              onChange={(e) => handleChange('emergencyContact', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred Contact Method</Label>
            <Select
              value={formData.preferredContactMethod || 'IN_APP'}
              onValueChange={(value) => handleChange('preferredContactMethod', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_APP">In-App</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="PHONE">Phone</SelectItem>
              </SelectContent>
            </Select>
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
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

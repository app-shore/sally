'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePreferencesStore } from '@/lib/store/preferencesStore';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UserPreferencesTab() {
  const { userPreferences, updateUserPrefs, resetToDefaults, isSaving } = usePreferencesStore();
  const [formData, setFormData] = useState(userPreferences || {});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateUserPrefs(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all general preferences to defaults?')) {
      try {
        const resetPrefs = await resetToDefaults('user');
        setFormData(resetPrefs);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error('Failed to reset preferences:', error);
      }
    }
  };

  if (!userPreferences) {
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
          <AlertDescription>Preferences saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Distance Unit</Label>
              <Select
                value={formData.distanceUnit || 'MILES'}
                onValueChange={(value) => handleChange('distanceUnit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILES">Miles</SelectItem>
                  <SelectItem value="KILOMETERS">Kilometers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Format</Label>
              <Select
                value={formData.timeFormat || '12H'}
                onValueChange={(value) => handleChange('timeFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12H">12-hour</SelectItem>
                  <SelectItem value="24H">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Temperature Unit</Label>
              <Select
                value={formData.temperatureUnit || 'F'}
                onValueChange={(value) => handleChange('temperatureUnit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">Fahrenheit</SelectItem>
                  <SelectItem value="C">Celsius</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={formData.currency || 'USD'}
                onValueChange={(value) => handleChange('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Auto Refresh Interval</Label>
              <Select
                value={String(formData.autoRefreshInterval || 30)}
                onValueChange={(value) => handleChange('autoRefreshInterval', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Manual</SelectItem>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">60 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default View</Label>
              <Select
                value={formData.defaultView || 'OVERVIEW'}
                onValueChange={(value) => handleChange('defaultView', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OVERVIEW">Overview</SelectItem>
                  <SelectItem value="TIMELINE">Timeline</SelectItem>
                  <SelectItem value="MAP">Map</SelectItem>
                  <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                  <SelectItem value="COSTS">Costs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Compact Mode</Label>
            <Switch
              checked={formData.compactMode || false}
              onCheckedChange={(checked) => handleChange('compactMode', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>High Contrast Mode</Label>
            <Switch
              checked={formData.highContrastMode || false}
              onCheckedChange={(checked) => handleChange('highContrastMode', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Minimum Alert Priority</Label>
            <Select
              value={formData.minAlertPriority || 'MEDIUM'}
              onValueChange={(value) => handleChange('minAlertPriority', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Desktop Notifications</Label>
            <Switch
              checked={formData.desktopNotifications !== false}
              onCheckedChange={(checked) => handleChange('desktopNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Sound Enabled</Label>
            <Switch
              checked={formData.soundEnabled !== false}
              onCheckedChange={(checked) => handleChange('soundEnabled', checked)}
            />
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

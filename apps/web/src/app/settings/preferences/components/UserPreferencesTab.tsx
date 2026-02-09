'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { usePreferencesStore } from '@/features/platform/settings';
import { UserPreferences } from '@/features/platform/settings';
import { Loader2, Save, RotateCcw, Bell, Volume2, Lock, Moon, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

const PRIORITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
const CHANNEL_TYPES = ['inApp', 'email', 'push', 'sms'] as const;
const CHANNEL_LABELS: Record<string, string> = {
  inApp: 'In-App',
  email: 'Email',
  push: 'Push',
  sms: 'SMS',
};
const SNOOZE_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
];

const DEFAULT_SOUND_SETTINGS: Record<string, boolean> = {
  critical: true,
  high: true,
  medium: false,
  low: false,
};

const DEFAULT_ALERT_CHANNELS: Record<string, { inApp: boolean; email: boolean; push: boolean; sms: boolean }> = {
  critical: { inApp: true, email: true, push: true, sms: true },
  high: { inApp: true, email: true, push: false, sms: false },
  medium: { inApp: true, email: false, push: false, sms: false },
  low: { inApp: true, email: false, push: false, sms: false },
};

export default function UserPreferencesTab() {
  const { userPreferences, updateUserPrefs, resetToDefaults, isSaving } = usePreferencesStore();
  const [formData, setFormData] = useState<Partial<UserPreferences>>(userPreferences || {});
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
    if (confirm('Reset all preferences to defaults?')) {
      try {
        await resetToDefaults('user');
        const resetPrefs = usePreferencesStore.getState().userPreferences;
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

  // Channel helpers
  const getChannelValue = (priority: string, channel: string): boolean => {
    const channels = (formData.alertChannels as Record<string, any>) || {};
    const defaults = DEFAULT_ALERT_CHANNELS[priority] as Record<string, boolean> | undefined;
    return channels[priority]?.[channel] ?? defaults?.[channel] ?? false;
  };

  const setChannelValue = (priority: string, channel: string, value: boolean) => {
    const current = (formData.alertChannels as Record<string, any>) || {};
    const priorityChannels = current[priority] || { ...DEFAULT_ALERT_CHANNELS[priority] };
    setFormData((prev) => ({
      ...prev,
      alertChannels: {
        ...current,
        [priority]: { ...priorityChannels, [channel]: value },
      },
    }));
  };

  // Sound helpers
  const getSoundValue = (priority: string): boolean => {
    const settings = (formData.soundSettings as Record<string, boolean>) || {};
    return settings[priority] ?? DEFAULT_SOUND_SETTINGS[priority] ?? false;
  };

  const setSoundValue = (priority: string, value: boolean) => {
    const current = (formData.soundSettings as Record<string, boolean>) || { ...DEFAULT_SOUND_SETTINGS };
    setFormData((prev) => ({
      ...prev,
      soundSettings: { ...current, [priority]: value },
    }));
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
                value={String(formData.autoRefreshInterval ?? 30)}
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

      {/* Alert Delivery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Alert Delivery
          </CardTitle>
          <CardDescription>
            Choose how you receive alerts by priority level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Minimum Alert Priority */}
          <div className="space-y-2">
            <Label>Minimum Alert Priority</Label>
            <p className="text-sm text-muted-foreground">Alerts below this level are hidden from your dashboard</p>
            <Select
              value={formData.minAlertPriority || 'LOW'}
              onValueChange={(value) => handleChange('minAlertPriority', value)}
            >
              <SelectTrigger className="w-full md:w-48">
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

          {/* Channel Grid */}
          <div className="space-y-3">
            <Label>Notification Channels</Label>
            <p className="text-sm text-muted-foreground">
              Select which channels deliver alerts for each priority level
            </p>
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-5 gap-0 bg-muted px-4 py-2">
                <div className="text-sm font-medium text-muted-foreground">Priority</div>
                {CHANNEL_TYPES.map((channel) => (
                  <div key={channel} className="text-sm font-medium text-muted-foreground text-center">
                    {CHANNEL_LABELS[channel]}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {PRIORITY_LEVELS.map((priority) => {
                const isCritical = priority === 'critical';
                return (
                  <div
                    key={priority}
                    className="grid grid-cols-5 gap-0 px-4 py-3 border-t border-border items-center"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{priority}</span>
                      {isCritical && (
                        <span title="Enforced by your organization">
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    {CHANNEL_TYPES.map((channel) => {
                      const isMandatory = isCritical && channel === 'inApp';
                      return (
                        <div key={channel} className="flex justify-center">
                          <Switch
                            checked={isMandatory ? true : getChannelValue(priority, channel)}
                            onCheckedChange={(checked) => setChannelValue(priority, channel, checked)}
                            disabled={isMandatory}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" /> Enforced by your organization
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sound Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Sound Notifications
          </CardTitle>
          <CardDescription>
            Choose which alert priorities play a sound
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {PRIORITY_LEVELS.map((priority) => {
            const isMandatory = priority === 'critical';
            return (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="capitalize">{priority} Priority</Label>
                  {isMandatory && (
                    <span title="Required by your organization"><Lock className="h-3 w-3 text-muted-foreground" /></span>
                  )}
                </div>
                <Switch
                  checked={isMandatory ? true : getSoundValue(priority)}
                  onCheckedChange={(checked) => setSoundValue(priority, checked)}
                  disabled={isMandatory}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Browser & Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Browser & Display
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Browser Notifications</Label>
              <p className="text-sm text-muted-foreground">Show browser push notifications for alerts</p>
            </div>
            <Switch
              checked={formData.browserNotifications !== false}
              onCheckedChange={(checked) => handleChange('browserNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Flash Tab on Critical</Label>
              <p className="text-sm text-muted-foreground">Flash browser tab title when critical alerts are active</p>
            </div>
            <Switch
              checked={formData.flashTabOnCritical !== false}
              onCheckedChange={(checked) => handleChange('flashTabOnCritical', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Default Snooze Duration</Label>
            <Select
              value={String(formData.defaultSnoozeDuration ?? 15)}
              onValueChange={(value) => handleChange('defaultSnoozeDuration', parseInt(value))}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SNOOZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Suppress push notifications and sounds during quiet hours. Critical alerts are always delivered.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Quiet Hours</Label>
            <Switch
              checked={formData.quietHoursEnabled || false}
              onCheckedChange={(checked) => handleChange('quietHoursEnabled', checked)}
            />
          </div>

          {formData.quietHoursEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.quietHoursStart || '22:00'}
                  onChange={(e) => handleChange('quietHoursStart', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.quietHoursEnd || '06:00'}
                  onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Font Size</Label>
            <Select
              value={formData.fontSize || 'MEDIUM'}
              onValueChange={(value) => handleChange('fontSize', value)}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMALL">Small</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LARGE">Large</SelectItem>
                <SelectItem value="XL">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Reduce Motion</Label>
            <Switch
              checked={formData.reduceMotion || false}
              onCheckedChange={(checked) => handleChange('reduceMotion', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Screen Reader Optimized</Label>
            <Switch
              checked={formData.screenReaderOptimized || false}
              onCheckedChange={(checked) => handleChange('screenReaderOptimized', checked)}
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

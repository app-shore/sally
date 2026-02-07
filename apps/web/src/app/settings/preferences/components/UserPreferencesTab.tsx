'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { usePreferencesStore } from '@/features/platform/preferences';
import { UserPreferences } from '@/features/platform/preferences';
import { Loader2, Save, RotateCcw, Bell, Volume2, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { apiClient } from '@/shared/lib/api';

interface NotificationPrefs {
  soundEnabled: Record<string, boolean>;
  browserNotifications: boolean;
  flashTabOnCritical: boolean;
  defaultSnoozeDuration: number;
}

const PRIORITY_LEVELS = ['critical', 'high', 'medium', 'low'];
const SNOOZE_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
];

export default function UserPreferencesTab() {
  const { userPreferences, updateUserPrefs, resetToDefaults, isSaving } = usePreferencesStore();
  const [formData, setFormData] = useState<Partial<UserPreferences>>(userPreferences || {});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaveSuccess, setNotifSaveSuccess] = useState(false);

  useEffect(() => {
    apiClient<NotificationPrefs>('/preferences/notifications')
      .then(setNotifPrefs)
      .catch(() => {
        // Set defaults if endpoint not available
        setNotifPrefs({
          soundEnabled: { critical: true, high: true, medium: false, low: false },
          browserNotifications: true,
          flashTabOnCritical: true,
          defaultSnoozeDuration: 15,
        });
      });
  }, []);

  const handleSaveNotifPrefs = async () => {
    if (!notifPrefs) return;
    setNotifSaving(true);
    try {
      const updated = await apiClient<NotificationPrefs>('/preferences/notifications', {
        method: 'PUT',
        body: JSON.stringify(notifPrefs),
      });
      setNotifPrefs(updated);
      setNotifSaveSuccess(true);
      setTimeout(() => setNotifSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
    } finally {
      setNotifSaving(false);
    }
  };

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
        await resetToDefaults('user');
        // Reload from store after reset
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

      {/* Notification Preferences */}
      {notifPrefs && (
        <>
          {notifSaveSuccess && (
            <Alert>
              <AlertDescription>Notification preferences saved!</AlertDescription>
            </Alert>
          )}

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
                      checked={isMandatory ? true : (notifPrefs.soundEnabled?.[priority] ?? false)}
                      onCheckedChange={(checked) =>
                        setNotifPrefs({
                          ...notifPrefs,
                          soundEnabled: { ...notifPrefs.soundEnabled, [priority]: checked },
                        })
                      }
                      disabled={isMandatory}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

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
                  checked={notifPrefs.browserNotifications}
                  onCheckedChange={(checked) =>
                    setNotifPrefs({ ...notifPrefs, browserNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Flash Tab on Critical</Label>
                  <p className="text-sm text-muted-foreground">Flash browser tab title when critical alerts are active</p>
                </div>
                <Switch
                  checked={notifPrefs.flashTabOnCritical}
                  onCheckedChange={(checked) =>
                    setNotifPrefs({ ...notifPrefs, flashTabOnCritical: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Default Snooze Duration</Label>
                <Select
                  value={String(notifPrefs.defaultSnoozeDuration)}
                  onValueChange={(value) =>
                    setNotifPrefs({ ...notifPrefs, defaultSnoozeDuration: parseInt(value) })
                  }
                >
                  <SelectTrigger>
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

          <div className="flex justify-end">
            <Button onClick={handleSaveNotifPrefs} disabled={notifSaving}>
              {notifSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Preferences
                </>
              )}
            </Button>
          </div>
        </>
      )}

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

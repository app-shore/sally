'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { useAuthStore } from '@/features/auth';
import { usePreferencesStore } from '@/features/platform/settings';
import type { UserPreferences } from '@/features/platform/settings';
import { Loader2, Save, RotateCcw, Lock } from 'lucide-react';

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

export default function NotificationsSettingsPage() {
  const { user } = useAuthStore();
  const { userPreferences, updateUserPrefs, resetToDefaults, loadAllPreferences, isSaving, isLoading } = usePreferencesStore();
  const [formData, setFormData] = useState<Partial<UserPreferences>>(userPreferences || {});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadAllPreferences(user.role);
    }
  }, [user, loadAllPreferences]);

  useEffect(() => {
    if (userPreferences) setFormData(userPreferences);
  }, [userPreferences]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const handleSave = async () => {
    try {
      await updateUserPrefs(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  const handleReset = async () => {
    setResetConfirmOpen(false);
    try {
      await resetToDefaults('user');
      const resetPrefs = usePreferencesStore.getState().userPreferences;
      if (resetPrefs) setFormData(resetPrefs);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to reset notification settings:', error);
    }
  };

  if (isLoading || !userPreferences) {
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
        <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground">Control how and when Sally notifies you about alerts and events.</p>
      </div>

      {saveSuccess && (
        <Alert>
          <AlertDescription>Notification settings saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* Delivery Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Channels</CardTitle>
          <CardDescription>Choose how you receive alerts by priority level.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Minimum Alert Priority */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label>Minimum Alert Priority</Label>
              <p className="text-xs text-muted-foreground">Alerts below this level are hidden from your dashboard.</p>
            </div>
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
            <Label>Per-Priority Channels</Label>
            <p className="text-xs text-muted-foreground">Select which channels deliver alerts for each priority level.</p>
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

      {/* Sound */}
      <Card>
        <CardHeader>
          <CardTitle>Sound</CardTitle>
          <CardDescription>Choose which alert priorities play a notification sound.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {PRIORITY_LEVELS.map((priority) => {
            const isMandatory = priority === 'critical';
            return (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <Label className="capitalize">{priority} Priority</Label>
                    <p className="text-xs text-muted-foreground">
                      {isMandatory
                        ? 'Always plays a sound. Required by your organization.'
                        : `Play a sound when a ${priority}-priority alert arrives.`}
                    </p>
                  </div>
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

      {/* Browser */}
      <Card>
        <CardHeader>
          <CardTitle>Browser</CardTitle>
          <CardDescription>Control browser-level notification behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Desktop Notifications</Label>
              <p className="text-xs text-muted-foreground">Show browser push notifications when alerts arrive. Your browser may ask for permission.</p>
            </div>
            <Switch
              checked={formData.browserNotifications !== false}
              onCheckedChange={(checked) => handleChange('browserNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Flash Tab on Critical</Label>
              <p className="text-xs text-muted-foreground">Flashes the browser tab title when a critical alert is unread so you notice it even in another tab.</p>
            </div>
            <Switch
              checked={formData.flashTabOnCritical !== false}
              onCheckedChange={(checked) => handleChange('flashTabOnCritical', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>Suppress push notifications and sounds during quiet hours. Critical alerts are always delivered.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Quiet Hours</Label>
              <p className="text-xs text-muted-foreground">When enabled, non-critical notifications are muted between the start and end times.</p>
            </div>
            <Switch
              checked={formData.quietHoursEnabled || false}
              onCheckedChange={(checked) => handleChange('quietHoursEnabled', checked)}
            />
          </div>

          {formData.quietHoursEnabled && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Label>Start Time</Label>
                  <p className="text-xs text-muted-foreground">When quiet hours begin each day.</p>
                </div>
                <Input
                  type="time"
                  className="w-full md:w-48"
                  value={formData.quietHoursStart || '22:00'}
                  onChange={(e) => handleChange('quietHoursStart', e.target.value)}
                />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Label>End Time</Label>
                  <p className="text-xs text-muted-foreground">When quiet hours end each day.</p>
                </div>
                <Input
                  type="time"
                  className="w-full md:w-48"
                  value={formData.quietHoursEnd || '06:00'}
                  onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Snooze & Digest */}
      <Card>
        <CardHeader>
          <CardTitle>Snooze & Digest</CardTitle>
          <CardDescription>Configure alert snooze behavior and email digest frequency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label>Default Snooze Duration</Label>
              <p className="text-xs text-muted-foreground">How long an alert is snoozed when you click &ldquo;Snooze&rdquo; without choosing a duration.</p>
            </div>
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

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label>Email Digest Frequency</Label>
              <p className="text-xs text-muted-foreground">Receive a summary email of all alerts you missed. &ldquo;None&rdquo; disables the digest.</p>
            </div>
            <Select
              value={formData.emailDigestFrequency || 'DAILY'}
              onValueChange={(value) => handleChange('emailDigestFrequency', value)}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setResetConfirmOpen(true)} disabled={isSaving}>
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

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Defaults</AlertDialogTitle>
            <AlertDialogDescription>
              Reset notification settings to defaults? This will overwrite your current preferences.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

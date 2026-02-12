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
import type { UserPreferences, DriverPreferences } from '@/features/platform/settings';
import { Loader2, Save, RotateCcw } from 'lucide-react';

export default function GeneralSettingsPage() {
  const { user } = useAuthStore();
  const { userPreferences, driverPreferences, updateUserPrefs, updateDriverPrefs, resetToDefaults, loadAllPreferences, isSaving, isLoading } = usePreferencesStore();
  const [formData, setFormData] = useState<Partial<UserPreferences>>(userPreferences || {});
  const [driverFormData, setDriverFormData] = useState<Partial<DriverPreferences>>(driverPreferences || {});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const isDriver = user?.role === 'DRIVER';

  useEffect(() => {
    if (user) {
      loadAllPreferences(user.role);
    }
  }, [user, loadAllPreferences]);

  useEffect(() => {
    if (userPreferences) setFormData(userPreferences);
  }, [userPreferences]);

  useEffect(() => {
    if (driverPreferences) setDriverFormData(driverPreferences);
  }, [driverPreferences]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDriverChange = (field: string, value: any) => {
    setDriverFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateUserPrefs(formData);
      if (isDriver) {
        await updateDriverPrefs(driverFormData);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleReset = async () => {
    setResetConfirmOpen(false);
    try {
      await resetToDefaults('user');
      const resetPrefs = usePreferencesStore.getState().userPreferences;
      if (resetPrefs) setFormData(resetPrefs);
      if (isDriver) {
        await resetToDefaults('driver');
        const resetDriverPrefs = usePreferencesStore.getState().driverPreferences;
        if (resetDriverPrefs) setDriverFormData(resetDriverPrefs);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to reset settings:', error);
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
        <h2 className="text-xl font-semibold text-foreground">General</h2>
        <p className="text-sm text-muted-foreground">Personalize how Sally looks and feels.</p>
      </div>

      {saveSuccess && (
        <Alert>
          <AlertDescription>Settings saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* Units & Formats */}
      <Card>
        <CardHeader>
          <CardTitle>Units & Formats</CardTitle>
          <CardDescription>Choose measurement units and display formats used throughout Sally.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label>Distance Unit</Label>
              <p className="text-xs text-muted-foreground">How distances are shown on routes and trip summaries.</p>
            </div>
            <Select value={formData.distanceUnit || 'MILES'} onValueChange={(v) => handleChange('distanceUnit', v)}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MILES">Miles</SelectItem>
                <SelectItem value="KILOMETERS">Kilometers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label>Time Format</Label>
              <p className="text-xs text-muted-foreground">Applies to ETAs, schedules, and alert timestamps.</p>
            </div>
            <Select value={formData.timeFormat || '12H'} onValueChange={(v) => handleChange('timeFormat', v)}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="12H">12-hour</SelectItem>
                <SelectItem value="24H">24-hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label>Temperature Unit</Label>
              <p className="text-xs text-muted-foreground">Used in weather alerts and route condition reports.</p>
            </div>
            <Select value={formData.temperatureUnit || 'F'} onValueChange={(v) => handleChange('temperatureUnit', v)}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="F">Fahrenheit</SelectItem>
                <SelectItem value="C">Celsius</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label>Currency</Label>
              <p className="text-xs text-muted-foreground">Fuel costs, route costs, and financial reports.</p>
            </div>
            <Select value={formData.currency || 'USD'} onValueChange={(v) => handleChange('currency', v)}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Customize the default dashboard view and refresh behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label>Auto Refresh Interval</Label>
              <p className="text-xs text-muted-foreground">How often the dashboard pulls fresh data. Set to &ldquo;Manual&rdquo; to refresh only when you click.</p>
            </div>
            <Select value={String(formData.autoRefreshInterval ?? 30)} onValueChange={(v) => handleChange('autoRefreshInterval', parseInt(v))}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Manual</SelectItem>
                <SelectItem value="5">5 seconds</SelectItem>
                <SelectItem value="10">10 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">60 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label>Default View</Label>
              <p className="text-xs text-muted-foreground">The view shown when you first open the dashboard.</p>
            </div>
            <Select value={formData.defaultView || 'OVERVIEW'} onValueChange={(v) => handleChange('defaultView', v)}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OVERVIEW">Overview</SelectItem>
                <SelectItem value="TIMELINE">Timeline</SelectItem>
                <SelectItem value="MAP">Map</SelectItem>
                <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                <SelectItem value="COSTS">Costs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Compact Mode</Label>
              <p className="text-xs text-muted-foreground">Reduces spacing to fit more information on screen. Best for large monitors.</p>
            </div>
            <Switch checked={formData.compactMode || false} onCheckedChange={(c) => handleChange('compactMode', c)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>High Contrast Mode</Label>
              <p className="text-xs text-muted-foreground">Increases contrast for better readability in bright environments.</p>
            </div>
            <Switch checked={formData.highContrastMode || false} onCheckedChange={(c) => handleChange('highContrastMode', c)} />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility</CardTitle>
          <CardDescription>Adjust display settings for readability and assistive technology support.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label>Font Size</Label>
              <p className="text-xs text-muted-foreground">Adjusts text size across the entire app.</p>
            </div>
            <Select value={formData.fontSize || 'MEDIUM'} onValueChange={(v) => handleChange('fontSize', v)}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SMALL">Small</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LARGE">Large</SelectItem>
                <SelectItem value="XL">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Reduce Motion</Label>
              <p className="text-xs text-muted-foreground">Minimizes animations and transitions for users sensitive to motion.</p>
            </div>
            <Switch checked={formData.reduceMotion || false} onCheckedChange={(c) => handleChange('reduceMotion', c)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Screen Reader Optimized</Label>
              <p className="text-xs text-muted-foreground">Optimizes layout and labels for assistive technology like JAWS or VoiceOver.</p>
            </div>
            <Switch checked={formData.screenReaderOptimized || false} onCheckedChange={(c) => handleChange('screenReaderOptimized', c)} />
          </div>
        </CardContent>
      </Card>

      {/* Driver-only sections */}
      {isDriver && driverPreferences && (
        <>
          {/* Break Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Break Preferences</CardTitle>
              <CardDescription>Customize how Sally schedules and reminds you about breaks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Label>Preferred Break Duration (minutes)</Label>
                  <p className="text-xs text-muted-foreground">Your preferred break length when Sally inserts breaks into your route.</p>
                </div>
                <Input type="number" min="10" max="60" className="w-full md:w-48" value={driverFormData.preferredBreakDuration || 30} onChange={(e) => handleDriverChange('preferredBreakDuration', parseInt(e.target.value))} />
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Label>Break Reminder Advance (minutes)</Label>
                  <p className="text-xs text-muted-foreground">How many minutes before your break is due to send you a reminder.</p>
                </div>
                <Input type="number" min="10" max="60" className="w-full md:w-48" value={driverFormData.breakReminderAdvance || 30} onChange={(e) => handleDriverChange('breakReminderAdvance', parseInt(e.target.value))} />
              </div>
            </CardContent>
          </Card>

          {/* Mobile Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Mobile</CardTitle>
              <CardDescription>Configure display and data usage for the mobile driver view.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Large Text Mode</Label>
                  <p className="text-xs text-muted-foreground">Increases text and button sizes for easier reading while driving.</p>
                </div>
                <Switch checked={driverFormData.largeTextMode || false} onCheckedChange={(c) => handleDriverChange('largeTextMode', c)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Offline Mode</Label>
                  <p className="text-xs text-muted-foreground">Cache route data for areas with poor cell coverage. Uses more device storage.</p>
                </div>
                <Switch checked={driverFormData.offlineMode || false} onCheckedChange={(c) => handleDriverChange('offlineMode', c)} />
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Label>Data Usage</Label>
                  <p className="text-xs text-muted-foreground">Controls how much data Sally uses. &ldquo;Low&rdquo; minimizes map tile downloads and disables real-time updates.</p>
                </div>
                <Select value={driverFormData.dataUsageMode || 'NORMAL'} onValueChange={(v) => handleDriverChange('dataUsageMode', v)}>
                  <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
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
              <CardDescription>Set your contact preferences and emergency information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Label>Emergency Contact</Label>
                  <p className="text-xs text-muted-foreground">Phone number to contact in case of emergency. Shared with dispatchers.</p>
                </div>
                <Input type="tel" placeholder="+1234567890" className="w-full md:w-48" value={driverFormData.emergencyContact || ''} onChange={(e) => handleDriverChange('emergencyContact', e.target.value)} />
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Label>Preferred Contact Method</Label>
                  <p className="text-xs text-muted-foreground">How dispatchers should reach you.</p>
                </div>
                <Select value={driverFormData.preferredContactMethod || 'IN_APP'} onValueChange={(v) => handleDriverChange('preferredContactMethod', v)}>
                  <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN_APP">In-App</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="PHONE">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </>
      )}

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
              Reset general settings to defaults? This will overwrite your current preferences.
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

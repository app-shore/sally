'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import { useAuthStore } from '@/features/auth';
import { usePreferencesStore } from '@/features/platform/settings';
import { OperationsSettings, AlertConfiguration, getAlertConfig, updateAlertConfig } from '@/features/platform/settings';
import { Loader2, Save, RotateCcw, Route, Bell, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useRouter } from 'next/navigation';

const ALERT_TYPE_LABELS: Record<string, string> = {
  HOS_VIOLATION: 'HOS Violation',
  HOS_APPROACHING_LIMIT: 'HOS Approaching Limit',
  BREAK_REQUIRED: 'Break Required',
  CYCLE_APPROACHING_LIMIT: 'Cycle Approaching Limit',
  MISSED_APPOINTMENT: 'Missed Appointment',
  APPOINTMENT_AT_RISK: 'Appointment at Risk',
  DOCK_TIME_EXCEEDED: 'Dock Time Exceeded',
  ROUTE_DELAY: 'Route Delay',
  DRIVER_NOT_MOVING: 'Driver Not Moving',
  FUEL_LOW: 'Fuel Low',
};

const CHANNEL_LABELS = ['In-App', 'Email', 'Push', 'SMS'];
const CHANNEL_KEYS = ['inApp', 'email', 'push', 'sms'] as const;
const PRIORITY_LEVELS = ['critical', 'high', 'medium', 'low'];

export default function OperationsSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { operationsSettings, updateOperationsSettings, resetToDefaults, loadAllPreferences, isSaving, isLoading, error } = usePreferencesStore();
  const [formData, setFormData] = useState<Partial<OperationsSettings>>(operationsSettings || {});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Alert config state
  const [alertConfig, setAlertConfig] = useState<AlertConfiguration | null>(null);
  const [alertConfigLoading, setAlertConfigLoading] = useState(false);
  const [alertConfigSaving, setAlertConfigSaving] = useState(false);
  const [alertSaveSuccess, setAlertSaveSuccess] = useState(false);

  const canView = user?.role === 'DISPATCHER' || user?.role === 'ADMIN' || user?.role === 'OWNER';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'OWNER';

  useEffect(() => {
    if (user) {
      loadAllPreferences(user.role);
    }
  }, [user, loadAllPreferences]);

  // Load alert config
  useEffect(() => {
    if (user && canView) {
      setAlertConfigLoading(true);
      getAlertConfig()
        .then(setAlertConfig)
        .catch((err) => console.error('Failed to load alert config:', err))
        .finally(() => setAlertConfigLoading(false));
    }
  }, [user, canView]);

  // Redirect non-dispatchers
  useEffect(() => {
    if (user && !canView) {
      router.push('/settings/preferences');
    }
  }, [user, canView, router]);

  useEffect(() => {
    if (operationsSettings) {
      setFormData(operationsSettings);
    }
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
      console.error('Failed to save preferences:', error);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all route planning preferences to defaults?')) {
      try {
        await resetToDefaults('operations');
        const resetPrefs = usePreferencesStore.getState().operationsSettings;
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

  // Alert config handlers
  const handleAlertTypeToggle = (typeKey: string, enabled: boolean) => {
    if (!alertConfig) return;
    const currentType = alertConfig.alertTypes[typeKey];
    if (currentType?.mandatory) return; // Cannot disable mandatory alerts
    setAlertConfig({
      ...alertConfig,
      alertTypes: {
        ...alertConfig.alertTypes,
        [typeKey]: { ...currentType, enabled },
      },
    });
  };

  const handleAlertThresholdChange = (typeKey: string, field: 'thresholdMinutes' | 'thresholdPercent', value: number) => {
    if (!alertConfig) return;
    setAlertConfig({
      ...alertConfig,
      alertTypes: {
        ...alertConfig.alertTypes,
        [typeKey]: { ...alertConfig.alertTypes[typeKey], [field]: value },
      },
    });
  };

  const handleChannelToggle = (priority: string, channel: typeof CHANNEL_KEYS[number], enabled: boolean) => {
    if (!alertConfig) return;
    setAlertConfig({
      ...alertConfig,
      defaultChannels: {
        ...alertConfig.defaultChannels,
        [priority]: { ...alertConfig.defaultChannels[priority], [channel]: enabled },
      },
    });
  };

  const handleSaveAlertConfig = async () => {
    if (!alertConfig) return;
    setAlertConfigSaving(true);
    try {
      const updated = await updateAlertConfig(alertConfig);
      setAlertConfig(updated);
      setAlertSaveSuccess(true);
      setTimeout(() => setAlertSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save alert config:', err);
    } finally {
      setAlertConfigSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!canView) {
    return null;
  }

  if (!operationsSettings && !isLoading && error) {
    return (
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 max-w-5xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <p className="text-sm text-destructive">Failed to load operations settings: {error}</p>
            <Button variant="outline" onClick={() => user && loadAllPreferences(user.role)}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!operationsSettings) {
    return (
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 max-w-5xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading operations settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Fleet Operations Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Configure how SALLY manages fleet operations for your organization.
        </p>
        {!canEdit && (
          <p className="text-sm text-muted-foreground mt-2">
            You have read-only access. Contact an admin or owner to make changes.
          </p>
        )}
      </div>

      <Tabs defaultValue="route-planning">
        <TabsList>
          <TabsTrigger value="route-planning" className="gap-2">
            <Route className="h-4 w-4" />
            Route Planning
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            Alerts & Notifications
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* ROUTE PLANNING TAB */}
        {/* ============================================================ */}
        <TabsContent value="route-planning" className="space-y-6 mt-6">
          {saveSuccess && (
            <Alert>
              <AlertDescription>Operations settings saved successfully!</AlertDescription>
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                  disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                  disabled={!canEdit}
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
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label>Rest Stop Buffer (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
                    value={formData.maxFuelDetour || 10}
                    onChange={(e) => handleChange('maxFuelDetour', parseInt(e.target.value))}
                  />
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
          )}
        </TabsContent>

        {/* ============================================================ */}
        {/* ALERTS & NOTIFICATIONS TAB */}
        {/* ============================================================ */}
        <TabsContent value="alerts" className="space-y-6 mt-6">
          {alertSaveSuccess && (
            <Alert>
              <AlertDescription>Alert configuration saved successfully!</AlertDescription>
            </Alert>
          )}

          {alertConfigLoading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading alert configuration...</p>
              </CardContent>
            </Card>
          ) : !alertConfig ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-sm text-muted-foreground">Failed to load alert configuration.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAlertConfigLoading(true);
                    getAlertConfig()
                      .then(setAlertConfig)
                      .catch(() => {})
                      .finally(() => setAlertConfigLoading(false));
                  }}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Alert Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Alert Types</CardTitle>
                  <CardDescription>
                    Enable or disable alert types and configure their thresholds
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(alertConfig.alertTypes).map(([typeKey, config]) => (
                    <div key={typeKey} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">
                            {ALERT_TYPE_LABELS[typeKey] || typeKey}
                          </Label>
                          {config.mandatory && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Lock className="h-3 w-3" />
                              Mandatory
                            </Badge>
                          )}
                        </div>
                        {/* Threshold input */}
                        {config.thresholdMinutes !== undefined && (
                          <div className="flex items-center gap-2 mt-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Threshold (min):</Label>
                            <Input
                              type="number"
                              min="1"
                              className="h-8 w-24"
                              disabled={!canEdit}
                              value={config.thresholdMinutes}
                              onChange={(e) => handleAlertThresholdChange(typeKey, 'thresholdMinutes', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        )}
                        {config.thresholdPercent !== undefined && (
                          <div className="flex items-center gap-2 mt-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Threshold (%):</Label>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              className="h-8 w-24"
                              disabled={!canEdit}
                              value={config.thresholdPercent}
                              onChange={(e) => handleAlertThresholdChange(typeKey, 'thresholdPercent', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        )}
                      </div>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) => handleAlertTypeToggle(typeKey, checked)}
                        disabled={!canEdit || config.mandatory}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Default Notification Channels */}
              <Card>
                <CardHeader>
                  <CardTitle>Default Notification Channels</CardTitle>
                  <CardDescription>
                    Configure which channels are used for each alert priority level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Header row */}
                  <div className="grid grid-cols-5 gap-4 mb-3 pb-2 border-b border-border">
                    <div className="text-sm font-medium text-muted-foreground">Priority</div>
                    {CHANNEL_LABELS.map((label) => (
                      <div key={label} className="text-sm font-medium text-muted-foreground text-center">
                        {label}
                      </div>
                    ))}
                  </div>
                  {/* Rows per priority */}
                  {PRIORITY_LEVELS.map((priority) => {
                    const channels = alertConfig.defaultChannels[priority];
                    if (!channels) return null;
                    // Critical priority always requires in-app
                    const isCritical = priority === 'critical';
                    return (
                      <div key={priority} className="grid grid-cols-5 gap-4 py-3 border-b border-border last:border-0 items-center">
                        <div className="text-sm font-medium capitalize text-foreground">{priority}</div>
                        {CHANNEL_KEYS.map((channelKey) => {
                          const isMandatoryChannel = isCritical && channelKey === 'inApp';
                          return (
                            <div key={channelKey} className="flex justify-center items-center gap-1">
                              <Switch
                                checked={isMandatoryChannel ? true : channels[channelKey]}
                                onCheckedChange={(checked) => handleChannelToggle(priority, channelKey, checked)}
                                disabled={!canEdit || isMandatoryChannel}
                              />
                              {isMandatoryChannel && (
                                <span title="Required for compliance"><Lock className="h-3 w-3 text-muted-foreground" /></span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Grouping Config */}
              <Card>
                <CardHeader>
                  <CardTitle>Alert Grouping</CardTitle>
                  <CardDescription>
                    Configure how related alerts are grouped together
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Deduplication Window (minutes)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      disabled={!canEdit}
                      value={alertConfig.groupingConfig.dedupWindowMinutes}
                      onChange={(e) => setAlertConfig({
                        ...alertConfig,
                        groupingConfig: { ...alertConfig.groupingConfig, dedupWindowMinutes: parseInt(e.target.value) || 15 },
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Group Same Type Per Driver</Label>
                      <p className="text-sm text-muted-foreground">Combine repeated alerts of the same type for a driver</p>
                    </div>
                    <Switch
                      checked={alertConfig.groupingConfig.groupSameTypePerDriver}
                      onCheckedChange={(checked) => setAlertConfig({
                        ...alertConfig,
                        groupingConfig: { ...alertConfig.groupingConfig, groupSameTypePerDriver: checked },
                      })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Smart Group Across Drivers</Label>
                      <p className="text-sm text-muted-foreground">Group similar alerts from different drivers in the same area</p>
                    </div>
                    <Switch
                      checked={alertConfig.groupingConfig.smartGroupAcrossDrivers}
                      onCheckedChange={(checked) => setAlertConfig({
                        ...alertConfig,
                        groupingConfig: { ...alertConfig.groupingConfig, smartGroupAcrossDrivers: checked },
                      })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Link Cascading Alerts</Label>
                      <p className="text-sm text-muted-foreground">Link related alerts (e.g., HOS approaching → HOS violation)</p>
                    </div>
                    <Switch
                      checked={alertConfig.groupingConfig.linkCascading}
                      onCheckedChange={(checked) => setAlertConfig({
                        ...alertConfig,
                        groupingConfig: { ...alertConfig.groupingConfig, linkCascading: checked },
                      })}
                      disabled={!canEdit}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Save Button for Alerts */}
              {canEdit && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveAlertConfig} disabled={alertConfigSaving}>
                    {alertConfigSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Alert Configuration
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

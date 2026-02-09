'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useAuthStore } from '@/features/auth';
import { getAlertConfig, updateAlertConfig } from '@/features/platform/settings';
import type { AlertConfiguration, ComplianceThresholds } from '@/features/platform/settings';
import { Loader2, Save, Lock } from 'lucide-react';

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

const DEFAULT_COMPLIANCE_THRESHOLDS: ComplianceThresholds = {
  driveHoursWarningPct: 75,
  driveHoursCriticalPct: 90,
  onDutyWarningPct: 75,
  onDutyCriticalPct: 90,
  sinceBreakWarningPct: 75,
  sinceBreakCriticalPct: 90,
  delayThresholdMinutes: 30,
  hosApproachingPct: 85,
  costOverrunPct: 10,
};

export default function AlertsSettingsPage() {
  const { user } = useAuthStore();
  const [alertConfig, setAlertConfig] = useState<AlertConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'OWNER';

  useEffect(() => {
    if (user) {
      setLoading(true);
      getAlertConfig()
        .then(setAlertConfig)
        .catch((err) => console.error('Failed to load alert config:', err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleAlertTypeToggle = (typeKey: string, enabled: boolean) => {
    if (!alertConfig) return;
    const currentType = alertConfig.alertTypes[typeKey];
    if (currentType?.mandatory) return;
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

  const handleComplianceChange = (field: keyof ComplianceThresholds, value: number) => {
    if (!alertConfig) return;
    setAlertConfig({
      ...alertConfig,
      complianceThresholds: {
        ...(alertConfig.complianceThresholds || DEFAULT_COMPLIANCE_THRESHOLDS),
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!alertConfig) return;
    setSaving(true);
    try {
      const updated = await updateAlertConfig(alertConfig);
      setAlertConfig(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save alert config:', err);
    } finally {
      setSaving(false);
    }
  };

  const thresholds = alertConfig?.complianceThresholds || DEFAULT_COMPLIANCE_THRESHOLDS;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!alertConfig) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <p className="text-sm text-muted-foreground">Failed to load alert configuration.</p>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              getAlertConfig()
                .then(setAlertConfig)
                .catch(() => {})
                .finally(() => setLoading(false));
            }}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Alerts</h2>
          <p className="text-sm text-muted-foreground">Configure when and how your organization&apos;s alerts are triggered. Individual users can customize their own notification preferences separately.</p>
        </div>
        <Badge variant={canEdit ? 'default' : 'secondary'}>
          {canEdit ? 'Admin / Owner' : 'Read Only'}
        </Badge>
      </div>

      {saveSuccess && (
        <Alert>
          <AlertDescription>Alert configuration saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* Trigger Thresholds — compliance thresholds moved from operations */}
      <Card>
        <CardHeader>
          <CardTitle>Trigger Thresholds</CardTitle>
          <CardDescription>Define when Sally fires warning and critical alerts based on HOS compliance, delays, and costs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* HOS Compliance */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">HOS Compliance</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Drive Hours Warning (%)</Label>
                <p className="text-xs text-muted-foreground">Fire a warning when a driver has used this % of their 11-hour drive limit.</p>
                <Input type="number" min="0" max="100" value={thresholds.driveHoursWarningPct} onChange={(e) => handleComplianceChange('driveHoursWarningPct', parseInt(e.target.value) || 0)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>Drive Hours Critical (%)</Label>
                <p className="text-xs text-muted-foreground">Fire a critical alert at this %. Should be higher than warning to avoid overlap.</p>
                <Input type="number" min="0" max="100" value={thresholds.driveHoursCriticalPct} onChange={(e) => handleComplianceChange('driveHoursCriticalPct', parseInt(e.target.value) || 0)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>On-Duty Warning (%)</Label>
                <p className="text-xs text-muted-foreground">Warning threshold for the 14-hour on-duty window.</p>
                <Input type="number" min="0" max="100" value={thresholds.onDutyWarningPct} onChange={(e) => handleComplianceChange('onDutyWarningPct', parseInt(e.target.value) || 0)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>On-Duty Critical (%)</Label>
                <p className="text-xs text-muted-foreground">Critical threshold for the 14-hour on-duty window.</p>
                <Input type="number" min="0" max="100" value={thresholds.onDutyCriticalPct} onChange={(e) => handleComplianceChange('onDutyCriticalPct', parseInt(e.target.value) || 0)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>Break Warning (%)</Label>
                <p className="text-xs text-muted-foreground">Warning when approaching the 8-hour limit since last 30-min break.</p>
                <Input type="number" min="0" max="100" value={thresholds.sinceBreakWarningPct} onChange={(e) => handleComplianceChange('sinceBreakWarningPct', parseInt(e.target.value) || 0)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>Break Critical (%)</Label>
                <p className="text-xs text-muted-foreground">Critical alert for the 8-hour break limit.</p>
                <Input type="number" min="0" max="100" value={thresholds.sinceBreakCriticalPct} onChange={(e) => handleComplianceChange('sinceBreakCriticalPct', parseInt(e.target.value) || 0)} disabled={!canEdit} />
              </div>
            </div>
          </div>

          {/* Delays */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Delays</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delay Threshold (minutes)</Label>
                <p className="text-xs text-muted-foreground">Fire a route delay alert when a driver falls this many minutes behind schedule.</p>
                <Input type="number" min="0" value={thresholds.delayThresholdMinutes} onChange={(e) => handleComplianceChange('delayThresholdMinutes', parseInt(e.target.value) || 0)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label>HOS Approaching (%)</Label>
                <p className="text-xs text-muted-foreground">General HOS approaching threshold. Used when a driver is nearing any HOS limit.</p>
                <Input type="number" min="0" max="100" value={thresholds.hosApproachingPct} onChange={(e) => handleComplianceChange('hosApproachingPct', parseInt(e.target.value) || 0)} disabled={!canEdit} />
              </div>
            </div>
          </div>

          {/* Cost */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Cost</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Overrun (%)</Label>
                <p className="text-xs text-muted-foreground">Fire an alert when actual route cost exceeds the planned cost by this percentage.</p>
                <Input type="number" min="0" max="100" value={thresholds.costOverrunPct} onChange={(e) => handleComplianceChange('costOverrunPct', parseInt(e.target.value) || 0)} disabled={!canEdit} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Types */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Types</CardTitle>
          <CardDescription>Enable or disable alert types and configure their thresholds.</CardDescription>
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

      {/* Default Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Default Channels</CardTitle>
          <CardDescription>Configure which channels are used for each alert priority level.</CardDescription>
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
          {PRIORITY_LEVELS.map((priority) => {
            const channels = alertConfig.defaultChannels[priority];
            if (!channels) return null;
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

      {/* Grouping */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Grouping</CardTitle>
          <CardDescription>Configure how related alerts are grouped to reduce noise.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Deduplication Window (minutes)</Label>
            <p className="text-xs text-muted-foreground">Suppress duplicate alerts of the same type for the same driver within this window.</p>
            <Input
              type="number"
              min="1"
              max="120"
              className="w-full md:w-48"
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
              <p className="text-xs text-muted-foreground">Combine repeated alerts of the same type for a single driver into one notification.</p>
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
              <p className="text-xs text-muted-foreground">Group similar alerts from different drivers in the same area (e.g., multiple weather delays).</p>
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
              <p className="text-xs text-muted-foreground">Automatically link related alerts (e.g., HOS approaching → HOS violation) so you see the chain.</p>
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

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save Configuration</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

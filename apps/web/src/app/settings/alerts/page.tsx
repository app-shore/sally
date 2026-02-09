'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import { useAuthStore } from '@/features/auth';
import { getAlertConfig, updateAlertConfig } from '@/features/platform/settings';
import type { AlertConfiguration } from '@/features/platform/settings';
import { Loader2, Save, Lock } from 'lucide-react';

// ============================================================================
// Alert type metadata — labels, descriptions, threshold units, grouping
// ============================================================================

interface AlertTypeMeta {
  label: string;
  description: string;
  thresholdUnit?: '%' | 'min';
  thresholdLabel?: string;
}

const ALERT_TYPE_SECTIONS: { heading: string; description: string; types: string[] }[] = [
  {
    heading: 'HOS Compliance',
    description: 'Warning and critical thresholds for Hours of Service limits.',
    types: [
      'HOS_DRIVE_WARNING',
      'HOS_DRIVE_CRITICAL',
      'HOS_ON_DUTY_WARNING',
      'HOS_ON_DUTY_CRITICAL',
      'HOS_BREAK_WARNING',
      'HOS_BREAK_CRITICAL',
      'HOS_APPROACHING_LIMIT',
      'CYCLE_APPROACHING_LIMIT',
    ],
  },
  {
    heading: 'Route & Schedule',
    description: 'Alerts for delays, missed appointments, and driver inactivity.',
    types: [
      'ROUTE_DELAY',
      'DRIVER_NOT_MOVING',
      'APPOINTMENT_AT_RISK',
      'MISSED_APPOINTMENT',
      'DOCK_TIME_EXCEEDED',
    ],
  },
  {
    heading: 'Cost & Resources',
    description: 'Alerts for cost overruns and low fuel.',
    types: [
      'COST_OVERRUN',
      'FUEL_LOW',
    ],
  },
];

const ALERT_TYPE_META: Record<string, AlertTypeMeta> = {
  // HOS Compliance
  HOS_DRIVE_WARNING: {
    label: 'Drive Hours — Warning',
    description: 'Warning when a driver has used this % of their 11-hour drive limit. Example: 75% = alert at 8h 15m.',
    thresholdUnit: '%',
    thresholdLabel: 'Threshold (%)',
  },
  HOS_DRIVE_CRITICAL: {
    label: 'Drive Hours — Critical',
    description: 'Critical alert at this % of the 11-hour drive limit. Example: 90% = alert at 9h 54m.',
    thresholdUnit: '%',
    thresholdLabel: 'Threshold (%)',
  },
  HOS_ON_DUTY_WARNING: {
    label: 'On-Duty — Warning',
    description: 'Warning when approaching the 14-hour on-duty window. Example: 75% = alert at 10h 30m.',
    thresholdUnit: '%',
    thresholdLabel: 'Threshold (%)',
  },
  HOS_ON_DUTY_CRITICAL: {
    label: 'On-Duty — Critical',
    description: 'Critical alert for the 14-hour on-duty window. Example: 90% = alert at 12h 36m.',
    thresholdUnit: '%',
    thresholdLabel: 'Threshold (%)',
  },
  HOS_BREAK_WARNING: {
    label: 'Break Required — Warning',
    description: 'Warning when approaching the 8-hour limit since last 30-minute break. Example: 75% = alert at 6h.',
    thresholdUnit: '%',
    thresholdLabel: 'Threshold (%)',
  },
  HOS_BREAK_CRITICAL: {
    label: 'Break Required — Critical',
    description: 'Critical alert for the 8-hour break limit. Example: 90% = alert at 7h 12m.',
    thresholdUnit: '%',
    thresholdLabel: 'Threshold (%)',
  },
  HOS_APPROACHING_LIMIT: {
    label: 'HOS Approaching Limit',
    description: 'General alert when a driver is nearing any HOS limit. Works with live ELD data.',
    thresholdUnit: '%',
    thresholdLabel: 'Threshold (%)',
  },
  CYCLE_APPROACHING_LIMIT: {
    label: 'Cycle Approaching Limit',
    description: 'Alert when remaining minutes in the 60/70-hour cycle window drop below this threshold.',
    thresholdUnit: 'min',
    thresholdLabel: 'Minutes remaining',
  },

  // Route & Schedule
  ROUTE_DELAY: {
    label: 'Route Delay',
    description: 'Alert when a driver falls behind their scheduled arrival by this many minutes.',
    thresholdUnit: 'min',
    thresholdLabel: 'Delay (minutes)',
  },
  DRIVER_NOT_MOVING: {
    label: 'Driver Not Moving',
    description: 'Alert when a driver has been stationary for this many minutes during an active route.',
    thresholdUnit: 'min',
    thresholdLabel: 'Stationary (minutes)',
  },
  APPOINTMENT_AT_RISK: {
    label: 'Appointment at Risk',
    description: 'Alert when the ETA puts a pickup or delivery at risk of being missed by this many minutes.',
    thresholdUnit: 'min',
    thresholdLabel: 'Minutes before miss',
  },
  MISSED_APPOINTMENT: {
    label: 'Missed Appointment',
    description: 'Fires when a driver misses their scheduled pickup or delivery window. Cannot be disabled.',
  },
  DOCK_TIME_EXCEEDED: {
    label: 'Dock Time Exceeded',
    description: 'Alert when time spent at a dock exceeds the planned dwell time by this many minutes.',
    thresholdUnit: 'min',
    thresholdLabel: 'Minutes over estimate',
  },

  // Cost & Resources
  COST_OVERRUN: {
    label: 'Cost Overrun',
    description: 'Alert when actual route cost exceeds the planned cost by this percentage.',
    thresholdUnit: '%',
    thresholdLabel: 'Overrun (%)',
  },
  FUEL_LOW: {
    label: 'Fuel Low',
    description: 'Alert when estimated fuel tank level drops below this percentage of capacity.',
    thresholdUnit: '%',
    thresholdLabel: 'Tank level (%)',
  },
};

const CHANNEL_LABELS = ['In-App', 'Email', 'Push', 'SMS'];
const CHANNEL_KEYS = ['inApp', 'email', 'push', 'sms'] as const;
const PRIORITY_LEVELS = ['critical', 'high', 'medium', 'low'];

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

  const handleThresholdChange = (typeKey: string, value: number) => {
    if (!alertConfig) return;
    const meta = ALERT_TYPE_META[typeKey];
    const field = meta?.thresholdUnit === '%' ? 'thresholdPercent' : 'thresholdMinutes';
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
        <Badge variant={canEdit ? 'default' : 'muted'}>
          {canEdit ? 'Admin / Owner' : 'Read Only'}
        </Badge>
      </div>

      {saveSuccess && (
        <Alert>
          <AlertDescription>Alert configuration saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* Alert Types — unified list with thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Types</CardTitle>
          <CardDescription>Enable or disable alert types and set their trigger thresholds. Mandatory alerts cannot be disabled.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {ALERT_TYPE_SECTIONS.map((section, sectionIdx) => (
            <div key={section.heading}>
              {sectionIdx > 0 && <Separator className="mb-6" />}
              <div className="mb-4">
                <p className="text-sm font-medium text-foreground">{section.heading}</p>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              <div className="space-y-4">
                {section.types.map((typeKey) => {
                  const config = alertConfig.alertTypes[typeKey];
                  if (!config) return null;
                  const meta = ALERT_TYPE_META[typeKey];
                  if (!meta) return null;
                  const thresholdValue = meta.thresholdUnit === '%' ? config.thresholdPercent : config.thresholdMinutes;

                  return (
                    <div key={typeKey} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 py-3 border-b border-border last:border-0">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">{meta.label}</Label>
                          {config.mandatory && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Lock className="h-3 w-3" />
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                      </div>

                      {/* Threshold input */}
                      {meta.thresholdUnit && thresholdValue !== undefined && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Input
                            type="number"
                            min={meta.thresholdUnit === '%' ? 1 : 1}
                            max={meta.thresholdUnit === '%' ? 100 : undefined}
                            className="h-8 w-24"
                            disabled={!canEdit}
                            value={thresholdValue}
                            onChange={(e) => handleThresholdChange(typeKey, parseInt(e.target.value) || 0)}
                          />
                          <span className="text-xs text-muted-foreground w-6">{meta.thresholdUnit === '%' ? '%' : 'min'}</span>
                        </div>
                      )}

                      {/* Toggle */}
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) => handleAlertTypeToggle(typeKey, checked)}
                        disabled={!canEdit || config.mandatory}
                        className="shrink-0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Default Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Default Channels</CardTitle>
          <CardDescription>Organization-wide defaults for how alerts are delivered. Individual users can override these in their notification preferences.</CardDescription>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label>Deduplication Window (minutes)</Label>
              <p className="text-xs text-muted-foreground">Suppress duplicate alerts of the same type for the same driver within this window.</p>
            </div>
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
              <><Save className="h-4 w-4 mr-2" />Save Changes</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

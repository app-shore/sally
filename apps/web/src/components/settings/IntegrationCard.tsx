'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  type IntegrationConfig,
  type IntegrationType,
  getIntegrationTypeLabel,
  getVendorLabel,
  formatRelativeTime,
  testConnection,
  triggerSync,
} from '@/lib/api/integrations';
import { AlertCircle, CheckCircle2, Circle, Loader2, Link as LinkIcon } from 'lucide-react';

interface IntegrationCardProps {
  integration: IntegrationConfig;
  onConfigure: (integration: IntegrationConfig) => void;
  onRefresh: () => void;
}

export function IntegrationCard({ integration, onConfigure, onRefresh }: IntegrationCardProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection(integration.id);
      setTestResult(result);
      if (result.success) {
        onRefresh();
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await triggerSync(integration.id);
      onRefresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const statusConfig = {
    ACTIVE: {
      icon: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
      text: 'Connected',
      color: 'text-green-600 dark:text-green-400',
    },
    ERROR: {
      icon: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
      text: 'Error',
      color: 'text-red-600 dark:text-red-400',
    },
    CONFIGURED: {
      icon: <Circle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />,
      text: 'Configured',
      color: 'text-yellow-600 dark:text-yellow-400',
    },
    NOT_CONFIGURED: {
      icon: <Circle className="h-4 w-4 text-muted-foreground" />,
      text: 'Not Connected',
      color: 'text-muted-foreground',
    },
    DISABLED: {
      icon: <Circle className="h-4 w-4 text-muted-foreground" />,
      text: 'Disabled',
      color: 'text-muted-foreground',
    },
  };

  const currentStatus = statusConfig[integration.status];

  return (
    <Card className="transition-all hover:shadow-md border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <IntegrationIcon type={integration.integration_type} />
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  {getIntegrationTypeLabel(integration.integration_type)}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {currentStatus.icon}
                  <span className={currentStatus.color}>{currentStatus.text}</span>
                  {integration.status === 'ACTIVE' && (
                    <>
                      <span>•</span>
                      <span>{getVendorLabel(integration.vendor)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {integration.status === 'ACTIVE' && integration.last_sync_at && (
              <div className="mt-3 text-sm text-muted-foreground">
                Last synced {formatRelativeTime(integration.last_sync_at)}
              </div>
            )}

            {integration.status === 'ERROR' && integration.last_error_message && (
              <div className="mt-3 p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {integration.last_error_message}
                </p>
              </div>
            )}

            {integration.status === 'NOT_CONFIGURED' && (
              <div className="mt-3 text-sm text-muted-foreground">
                {getConfigureHelpText(integration.integration_type)}
              </div>
            )}

            {testResult && (
              <div
                className={`mt-3 p-3 rounded-md border ${
                  testResult.success
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                    : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                }`}
              >
                <p
                  className={`text-sm ${
                    testResult.success
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  {testResult.message}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 ml-4">
            {integration.status === 'NOT_CONFIGURED' ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => onConfigure(integration)}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Connect
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigure(integration)}
                >
                  Configure
                </Button>
                {integration.status === 'ACTIVE' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleTest}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSync}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Sync'
                      )}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationIcon({ type }: { type: IntegrationType }) {
  const icons: Record<IntegrationType, string> = {
    TMS: '🚛',
    HOS_ELD: '📋',
    FUEL_PRICE: '⛽',
    WEATHER: '🌤️',
    TELEMATICS: '📡',
  };

  return (
    <div className="text-2xl" role="img" aria-label={type}>
      {icons[type]}
    </div>
  );
}

function getConfigureHelpText(type: IntegrationType): string {
  const helpText: Record<IntegrationType, string> = {
    TMS: 'Connect your TMS to sync loads and assignments automatically',
    HOS_ELD: 'Connect your ELD to sync driver hours of service data',
    FUEL_PRICE: 'Connect to sync real-time fuel prices for route optimization',
    WEATHER: 'Connect to get weather forecasts along routes',
    TELEMATICS: 'Connect to sync vehicle location and status data',
  };
  return helpText[type];
}

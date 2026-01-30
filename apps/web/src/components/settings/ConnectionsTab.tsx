'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IntegrationCard } from './IntegrationCard';
import {
  type IntegrationConfig,
  type IntegrationType,
  type IntegrationVendor,
  listIntegrations,
} from '@/lib/api/integrations';
import { Loader2 } from 'lucide-react';

export function ConnectionsTab() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configureDialog, setConfigureDialog] = useState<{
    open: boolean;
    integration: IntegrationConfig | null;
  }>({ open: false, integration: null });

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // For MVP Phase 1, we'll show mock data since backend isn't implemented yet
      const mockIntegrations = getMockIntegrations();
      setIntegrations(mockIntegrations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigure = (integration: IntegrationConfig) => {
    setConfigureDialog({ open: true, integration });
  };

  const handleCloseDialog = () => {
    setConfigureDialog({ open: false, integration: null });
  };

  const handleRefresh = () => {
    loadIntegrations();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading integrations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button onClick={loadIntegrations}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Connections</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect external systems to sync data automatically
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConfigure={handleConfigure}
            onRefresh={handleRefresh}
          />
        ))}
      </div>

      {integrations.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">No integrations configured yet</p>
        </div>
      )}

      <Dialog open={configureDialog.open} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {configureDialog.integration?.status === 'NOT_CONFIGURED'
                ? 'Connect Integration'
                : 'Configure Integration'}
            </DialogTitle>
          </DialogHeader>
          {configureDialog.integration && (
            <ConfigureIntegrationForm
              integration={configureDialog.integration}
              onSuccess={() => {
                handleCloseDialog();
                handleRefresh();
              }}
              onCancel={handleCloseDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfigureIntegrationForm({
  integration,
  onSuccess,
  onCancel,
}: {
  integration: IntegrationConfig;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-lg bg-muted/50 border border-border">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2 text-foreground">Coming Soon</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Integration configuration will be available in the next release
          </p>
          <p className="text-xs text-muted-foreground">
            This feature will allow you to:
          </p>
          <ul className="text-xs text-muted-foreground mt-2 space-y-1">
            <li>• Authenticate with {integration.display_name}</li>
            <li>• Configure sync settings</li>
            <li>• Test connection</li>
            <li>• Set up automatic data synchronization</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
      </div>
    </div>
  );
}

/**
 * Mock integrations for Phase 1 MVP
 * This will be replaced with real API calls in Phase 2
 */
function getMockIntegrations(): IntegrationConfig[] {
  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

  return [
    {
      id: 'int_hos_mock_samsara',
      integration_type: 'HOS_ELD',
      vendor: 'MOCK_SAMSARA',
      display_name: 'Samsara ELD (Mock)',
      is_enabled: true,
      status: 'ACTIVE',
      sync_interval_seconds: 300,
      last_sync_at: twoMinutesAgo.toISOString(),
      last_success_at: twoMinutesAgo.toISOString(),
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: twoMinutesAgo.toISOString(),
    },
    {
      id: 'int_tms_mcleod',
      integration_type: 'TMS',
      vendor: 'MCLEOD_TMS',
      display_name: 'McLeod TMS',
      is_enabled: false,
      status: 'NOT_CONFIGURED',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'int_fuel_gasbuddy',
      integration_type: 'FUEL_PRICE',
      vendor: 'GASBUDDY_FUEL',
      display_name: 'GasBuddy',
      is_enabled: false,
      status: 'NOT_CONFIGURED',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'int_weather_openweather',
      integration_type: 'WEATHER',
      vendor: 'OPENWEATHER',
      display_name: 'OpenWeather',
      is_enabled: false,
      status: 'NOT_CONFIGURED',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type IntegrationConfig,
  type IntegrationType,
  type IntegrationVendor,
  createIntegration,
  updateIntegration,
  testConnection,
} from '@/lib/api/integrations';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ConfigureIntegrationFormProps {
  integration: IntegrationConfig | null;
  integrationType?: IntegrationType;
  vendor?: IntegrationVendor;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  display_name: string;
  api_key: string;
  api_secret?: string;
  sync_interval_seconds: number;
}

export function ConfigureIntegrationForm({
  integration,
  integrationType,
  vendor,
  onSuccess,
  onCancel,
}: ConfigureIntegrationFormProps) {
  const isNewIntegration = !integration;

  const [formData, setFormData] = useState<FormData>({
    display_name: integration?.display_name || getDefaultDisplayName(integrationType, vendor),
    api_key: '',
    api_secret: '',
    sync_interval_seconds: integration?.sync_interval_seconds || 300,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setTestResult(null);
  };

  const requiresSecret = (v?: IntegrationVendor) => {
    // Some integrations need both key and secret
    return v === 'MCLEOD_TMS' || v === 'TMW_TMS' || v === 'PROJECT44_TMS';
  };

  const handleTest = async () => {
    if (!formData.api_key) {
      setTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    if (requiresSecret(vendor || integration?.vendor) && !formData.api_secret) {
      setTestResult({ success: false, message: 'Please enter API secret' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      if (isNewIntegration) {
        // For new integrations, we need to create first
        if (!integrationType || !vendor) {
          throw new Error('Integration type and vendor required');
        }

        const credentials: Record<string, string> = { apiKey: formData.api_key };
        if (formData.api_secret) {
          credentials.apiSecret = formData.api_secret;
        }

        const newIntegration = await createIntegration({
          integration_type: integrationType,
          vendor,
          display_name: formData.display_name,
          credentials,
          sync_interval_seconds: formData.sync_interval_seconds,
        });

        // Test the newly created integration
        const result = await testConnection(newIntegration.id);
        setTestResult(result);

        if (result.success) {
          // Auto-save and close on success
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else if (integration) {
        // Update existing with new credentials
        const credentials: Record<string, string> = { apiKey: formData.api_key };
        if (formData.api_secret) {
          credentials.apiSecret = formData.api_secret;
        }

        await updateIntegration(integration.id, {
          display_name: formData.display_name,
          credentials,
          sync_interval_seconds: formData.sync_interval_seconds,
        });

        const result = await testConnection(integration.id);
        setTestResult(result);
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.display_name) {
      setError('Display name is required');
      return;
    }

    if (!formData.api_key) {
      setError('API key is required');
      return;
    }

    if (requiresSecret(vendor || integration?.vendor) && !formData.api_secret) {
      setError('API secret is required for this integration');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const credentials: Record<string, string> = { apiKey: formData.api_key };
      if (formData.api_secret) {
        credentials.apiSecret = formData.api_secret;
      }

      if (isNewIntegration) {
        if (!integrationType || !vendor) {
          throw new Error('Integration type and vendor are required');
        }

        await createIntegration({
          integration_type: integrationType,
          vendor,
          display_name: formData.display_name,
          credentials,
          sync_interval_seconds: formData.sync_interval_seconds,
        });
      } else if (integration) {
        await updateIntegration(integration.id, {
          display_name: formData.display_name,
          credentials,
          sync_interval_seconds: formData.sync_interval_seconds,
        });
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save integration');
    } finally {
      setIsSaving(false);
    }
  };

  const currentIntegrationType = integration?.integration_type || integrationType;
  const currentVendor = integration?.vendor || vendor;

  return (
    <div className="space-y-6">
      {/* Integration Info */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getIntegrationIcon(currentIntegrationType)}</div>
          <div>
            <h3 className="font-semibold text-foreground">
              {getVendorDescription(currentVendor)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {getIntegrationTypeDescription(currentIntegrationType)}
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display_name">Display Name</Label>
          <Input
            id="display_name"
            type="text"
            value={formData.display_name}
            onChange={(e) => handleInputChange('display_name', e.target.value)}
            placeholder="e.g., Production Samsara"
          />
          <p className="text-xs text-muted-foreground">
            A friendly name to identify this connection
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="api_key">API Key</Label>
          <div className="relative">
            <Input
              id="api_key"
              type={showApiKey ? 'text' : 'password'}
              value={formData.api_key}
              onChange={(e) => handleInputChange('api_key', e.target.value)}
              placeholder="Enter your API key"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {getApiKeyHelpText(currentIntegrationType, currentVendor)}
          </p>
        </div>

        {requiresSecret(currentVendor) && (
          <div className="space-y-2">
            <Label htmlFor="api_secret">API Secret</Label>
            <div className="relative">
              <Input
                id="api_secret"
                type={showApiSecret ? 'text' : 'password'}
                value={formData.api_secret}
                onChange={(e) => handleInputChange('api_secret', e.target.value)}
                placeholder="Enter your API secret"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiSecret(!showApiSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API secret will be encrypted and stored securely
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="sync_interval">Sync Interval (seconds)</Label>
          <Input
            id="sync_interval"
            type="number"
            min={60}
            max={3600}
            value={formData.sync_interval_seconds}
            onChange={(e) => handleInputChange('sync_interval_seconds', parseInt(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            How often to sync data (60-3600 seconds, default: 300)
          </p>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={`p-4 rounded-lg border ${
            testResult.success
              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
          }`}
        >
          <div className="flex items-start gap-2">
            {testResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            )}
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
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel} disabled={isSaving || isTesting}>
          Cancel
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          onClick={handleTest}
          disabled={isTesting || isSaving || !formData.api_key}
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>

        <Button onClick={handleSave} disabled={isSaving || isTesting}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>
    </div>
  );
}

function getDefaultDisplayName(
  type?: IntegrationType,
  vendor?: IntegrationVendor
): string {
  if (!type || !vendor) return '';

  const vendorNames: Record<IntegrationVendor, string> = {
    MCLEOD_TMS: 'McLeod TMS',
    TMW_TMS: 'TMW Systems',
    PROJECT44_TMS: 'project44',
    SAMSARA_ELD: 'Samsara ELD',
    KEEPTRUCKIN_ELD: 'KeepTruckin ELD',
    MOTIVE_ELD: 'Motive ELD',
    GASBUDDY_FUEL: 'GasBuddy',
    FUELFINDER_FUEL: 'Fuel Finder',
    OPENWEATHER: 'OpenWeather',
  };

  return vendorNames[vendor] || '';
}

function getIntegrationIcon(type?: IntegrationType): string {
  const icons: Record<IntegrationType, string> = {
    TMS: '🚛',
    HOS_ELD: '📋',
    FUEL_PRICE: '⛽',
    WEATHER: '🌤️',
    TELEMATICS: '📡',
  };
  return type ? icons[type] : '🔌';
}

function getIntegrationTypeDescription(type?: IntegrationType): string {
  const descriptions: Record<IntegrationType, string> = {
    TMS: 'Transportation Management System',
    HOS_ELD: 'Hours of Service (ELD)',
    FUEL_PRICE: 'Fuel Prices',
    WEATHER: 'Weather Data',
    TELEMATICS: 'Vehicle Telematics',
  };
  return type ? descriptions[type] : 'Integration';
}

function getVendorDescription(vendor?: IntegrationVendor): string {
  const descriptions: Record<IntegrationVendor, string> = {
    MCLEOD_TMS: 'McLeod Software',
    TMW_TMS: 'TMW Systems',
    PROJECT44_TMS: 'project44 TMS',
    SAMSARA_ELD: 'Samsara',
    KEEPTRUCKIN_ELD: 'KeepTruckin (Motive)',
    MOTIVE_ELD: 'Motive',
    GASBUDDY_FUEL: 'GasBuddy',
    FUELFINDER_FUEL: 'Fuel Finder',
    OPENWEATHER: 'OpenWeatherMap',
  };
  return vendor ? descriptions[vendor] : 'Unknown';
}

function getApiKeyHelpText(type?: IntegrationType, vendor?: IntegrationVendor): string {
  if (vendor === 'SAMSARA_ELD') {
    return 'Get your API key from Samsara Dashboard → Settings → API Tokens';
  }
  if (vendor === 'MCLEOD_TMS') {
    return 'Contact your McLeod administrator for API credentials';
  }
  if (vendor === 'PROJECT44_TMS') {
    return 'Sign up at developers.project44.com and create OAuth 2.0 credentials (Client ID and Secret)';
  }
  if (vendor === 'GASBUDDY_FUEL') {
    return 'Sign up for GasBuddy Business API at gasbuddy.com/business';
  }
  if (vendor === 'FUELFINDER_FUEL') {
    return 'Get your API key from Fuel Finder dashboard';
  }
  if (vendor === 'OPENWEATHER') {
    return 'Get your API key from openweathermap.org/api';
  }
  return 'Your API key will be encrypted and stored securely';
}

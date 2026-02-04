'use client';

import { useState, useEffect } from 'react';
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
  getVendorRegistry,
  type VendorMetadata,
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
  credentials: Record<string, string>;
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
    display_name: integration?.display_name || '',
    credentials: {},
    sync_interval_seconds: integration?.sync_interval_seconds || 300,
  });

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<VendorMetadata[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);

  // Fetch vendor registry on mount
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setIsLoadingVendors(true);
        const vendorList = await getVendorRegistry();
        setVendors(vendorList);
      } catch (error) {
        console.error('Failed to fetch vendor registry:', error);
      } finally {
        setIsLoadingVendors(false);
      }
    };

    fetchVendors();
  }, []);

  // Update display name when vendor metadata becomes available
  useEffect(() => {
    if (selectedVendorMeta && !integration && !formData.display_name) {
      setFormData(prev => ({
        ...prev,
        display_name: selectedVendorMeta.displayName,
      }));
    }
  }, [selectedVendorMeta, integration, formData.display_name]);

  // Get current vendor and compute metadata
  const currentVendor = integration?.vendor || vendor;
  const currentIntegrationType = integration?.integration_type || integrationType;

  // Get selected vendor metadata
  const selectedVendorMeta = vendors.find(v => v.id === currentVendor);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setTestResult(null);
  };

  const handleTest = async () => {
    // Validate required credentials
    if (selectedVendorMeta) {
      const missingFields = selectedVendorMeta.credentialFields
        .filter(f => f.required && !formData.credentials[f.name]);
      if (missingFields.length > 0) {
        setTestResult({
          success: false,
          message: `Please enter: ${missingFields.map(f => f.label).join(', ')}`
        });
        return;
      }
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

        const newIntegration = await createIntegration({
          integration_type: integrationType,
          vendor,
          display_name: formData.display_name,
          credentials: formData.credentials,
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
        await updateIntegration(integration.id, {
          display_name: formData.display_name,
          credentials: formData.credentials,
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

    // Validate required credentials
    if (selectedVendorMeta) {
      const missingFields = selectedVendorMeta.credentialFields
        .filter(f => f.required && !formData.credentials[f.name]);
      if (missingFields.length > 0) {
        setError(`Missing required fields: ${missingFields.map(f => f.label).join(', ')}`);
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isNewIntegration) {
        if (!integrationType || !vendor) {
          throw new Error('Integration type and vendor are required');
        }

        await createIntegration({
          integration_type: integrationType,
          vendor,
          display_name: formData.display_name,
          credentials: formData.credentials,
          sync_interval_seconds: formData.sync_interval_seconds,
        });
      } else if (integration) {
        await updateIntegration(integration.id, {
          display_name: formData.display_name,
          credentials: formData.credentials,
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

  return (
    <div className="space-y-6">
      {/* Integration Info */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getIntegrationIcon(currentIntegrationType)}</div>
          <div>
            <h3 className="font-semibold text-foreground">
              {selectedVendorMeta?.displayName || currentVendor || 'Unknown Vendor'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedVendorMeta?.description || getIntegrationTypeDescription(currentIntegrationType)}
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

        {/* Dynamic Credential Fields */}
        {selectedVendorMeta && selectedVendorMeta.credentialFields.length > 0 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Credentials</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your {selectedVendorMeta.displayName} credentials
              </p>
            </div>

            {selectedVendorMeta.credentialFields.map(field => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id={field.name}
                    name={field.name}
                    type={field.type === 'password' && !showPasswords[field.name] ? 'password' : field.type}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formData.credentials[field.name] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      credentials: {
                        ...prev.credentials,
                        [field.name]: e.target.value
                      }
                    }))}
                    className={field.type === 'password' ? 'pr-10' : ''}
                  />
                  {field.type === 'password' && (
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({
                        ...prev,
                        [field.name]: !prev[field.name]
                      }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords[field.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">
                    {field.helpText}
                  </p>
                )}
              </div>
            ))}
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
          disabled={isTesting || isSaving || Object.keys(formData.credentials).length === 0}
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

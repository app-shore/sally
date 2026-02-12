'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  type IntegrationConfig,
  type IntegrationType,
  type IntegrationVendor,
  listIntegrations,
  deleteIntegration,
  getVendorRegistry,
  type VendorMetadata,
  testConnection,
  triggerSync,
} from '@/features/integrations';
import { Loader2, Plus, Gauge, Package, Droplet, Cloud, Trash2, Lock, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/shared/hooks';
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
import { ConfigureIntegrationForm } from './ConfigureIntegrationForm';
import { useOnboardingStore } from '@/features/platform/onboarding';
import { IntegrationSyncHistory } from './IntegrationSyncHistory';

// Vendor configuration with availability status
interface VendorConfig {
  vendor: IntegrationVendor;
  name: string;
  enabled: boolean;
  comingSoon?: boolean;
}

// Category configuration with available vendors
const CATEGORIES = [
  {
    type: 'HOS_ELD' as const,
    label: 'Hours of Service (ELD)',
    icon: Gauge,
    color: 'blue',
    vendors: [
      { vendor: 'SAMSARA_ELD' as const, name: 'Samsara', enabled: true },
      { vendor: 'KEEPTRUCKIN_ELD' as const, name: 'KeepTruckin (Motive)', enabled: false, comingSoon: true },
      { vendor: 'MOTIVE_ELD' as const, name: 'Motive', enabled: false, comingSoon: true },
    ] as VendorConfig[]
  },
  {
    type: 'TMS' as const,
    label: 'Transportation Management',
    icon: Package,
    color: 'purple',
    vendors: [
      { vendor: 'PROJECT44_TMS' as const, name: 'project44', enabled: true },
      { vendor: 'MCLEOD_TMS' as const, name: 'McLeod', enabled: false, comingSoon: true },
      { vendor: 'TMW_TMS' as const, name: 'TMW Systems', enabled: false, comingSoon: true },
    ] as VendorConfig[]
  },
  {
    type: 'FUEL_PRICE' as const,
    label: 'Fuel Prices',
    icon: Droplet,
    color: 'green',
    vendors: [
      { vendor: 'FUELFINDER_FUEL' as const, name: 'Fuel Finder', enabled: true },
      { vendor: 'GASBUDDY_FUEL' as const, name: 'GasBuddy', enabled: false, comingSoon: true },
    ] as VendorConfig[]
  },
  {
    type: 'WEATHER' as const,
    label: 'Weather',
    icon: Cloud,
    color: 'cyan',
    vendors: [
      { vendor: 'OPENWEATHER' as const, name: 'OpenWeather', enabled: true },
    ] as VendorConfig[]
  },
];

export function ConnectionsTab() {
  const { refetchStatus } = useOnboardingStore();
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [vendors, setVendors] = useState<VendorMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<IntegrationType | null>(null);
  const [configureDialog, setConfigureDialog] = useState<{
    open: boolean;
    integration: IntegrationConfig | null;
    integrationType?: IntegrationType;
    vendor?: IntegrationVendor;
  }>({ open: false, integration: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    integration: IntegrationConfig | null;
  }>({ open: false, integration: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [syncResults, setSyncResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadIntegrations();
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setIsLoadingVendors(true);
      const vendorList = await getVendorRegistry();
      setVendors(vendorList);
    } catch (err) {
      console.error('Failed to fetch vendor registry:', err);
    } finally {
      setIsLoadingVendors(false);
    }
  };

  const loadIntegrations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listIntegrations();
      setIntegrations(data);
      refetchStatus(); // Update onboarding status after loading integrations
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (type: IntegrationType) => {
    setSelectedCategory(type);
  };

  const handleAddIntegration = (vendor: IntegrationVendor, type: IntegrationType) => {
    setSelectedCategory(null);
    setTimeout(() => {
      setConfigureDialog({
        open: true,
        integration: null,
        integrationType: type,
        vendor,
      });
    }, 100);
  };

  const handleConfigure = (integration: IntegrationConfig) => {
    setConfigureDialog({
      open: true,
      integration,
      integrationType: integration.integration_type,
      vendor: integration.vendor,
    });
  };

  const handleDelete = (integration: IntegrationConfig) => {
    setDeleteDialog({ open: true, integration });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.integration) return;

    setIsDeleting(true);
    try {
      await deleteIntegration(deleteDialog.integration.id);
      setDeleteDialog({ open: false, integration: null });
      loadIntegrations();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete integration',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDialog = () => {
    setConfigureDialog({ open: false, integration: null });
    setSelectedCategory(null);
  };

  const handleRefresh = () => {
    loadIntegrations();
  };

  const handleTestConnection = async (integration: IntegrationConfig) => {
    setTestingIds(prev => new Set(prev).add(integration.id));
    // Clear previous test result for this integration
    setTestResults(prev => {
      const next = { ...prev };
      delete next[integration.id];
      return next;
    });

    try {
      const result = await testConnection(integration.id);
      // Store test result to display inline
      setTestResults(prev => ({
        ...prev,
        [integration.id]: result,
      }));

      // Update integration status in state without full refresh
      if (result.success) {
        setIntegrations(prev => prev.map(int =>
          int.id === integration.id
            ? { ...int, status: 'ACTIVE' as const, last_success_at: new Date().toISOString() }
            : int
        ));
      }
    } catch (err) {
      // Store error result
      setTestResults(prev => ({
        ...prev,
        [integration.id]: {
          success: false,
          message: err instanceof Error ? err.message : 'Failed to test connection',
        },
      }));
    } finally {
      setTestingIds(prev => {
        const next = new Set(prev);
        next.delete(integration.id);
        return next;
      });
    }
  };

  const handleSync = async (integration: IntegrationConfig) => {
    setSyncingIds(prev => new Set(prev).add(integration.id));
    // Clear previous sync result for this integration
    setSyncResults(prev => {
      const next = { ...prev };
      delete next[integration.id];
      return next;
    });

    try {
      const result = await triggerSync(integration.id);
      // Store sync result to display inline
      setSyncResults(prev => ({
        ...prev,
        [integration.id]: {
          success: result.success,
          message: result.message || 'Data synchronized successfully',
        },
      }));

      // Update integration last_sync_at in state without full refresh
      if (result.success) {
        setIntegrations(prev => prev.map(int =>
          int.id === integration.id
            ? { ...int, last_sync_at: new Date().toISOString() }
            : int
        ));
      }
    } catch (err) {
      // Store error result
      setSyncResults(prev => ({
        ...prev,
        [integration.id]: {
          success: false,
          message: err instanceof Error ? err.message : 'Failed to sync data',
        },
      }));
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(integration.id);
        return next;
      });
    }
  };

  // Get connected vendor IDs to filter out from "Add New" section
  const connectedVendors = new Set(integrations.map(int => int.vendor));

  // Build dynamic categories from vendor registry
  const dynamicCategories = [
    {
      type: 'HOS_ELD' as IntegrationType,
      label: 'ELD',
      icon: Gauge,
      color: 'blue',
      vendors: vendors.filter(v => v.integrationType === 'HOS_ELD'),
    },
    {
      type: 'TMS' as IntegrationType,
      label: 'Transportation Management',
      icon: Package,
      color: 'purple',
      vendors: vendors.filter(v => v.integrationType === 'TMS'),
    },
    {
      type: 'FUEL_PRICE' as IntegrationType,
      label: 'Fuel Prices',
      icon: Droplet,
      color: 'green',
      vendors: vendors.filter(v => v.integrationType === 'FUEL_PRICE'),
    },
    {
      type: 'WEATHER' as IntegrationType,
      label: 'Weather',
      icon: Cloud,
      color: 'cyan',
      vendors: vendors.filter(v => v.integrationType === 'WEATHER'),
    },
  ];

  // Group integrations by category
  const integrationsByCategory = dynamicCategories.map((category) => ({
    ...category,
    integrations: integrations.filter((int) => int.integration_type === category.type),
  }));

  // Get stats
  const totalIntegrations = integrations.length;
  const activeIntegrations = integrations.filter((int) => int.status === 'ACTIVE').length;

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
      {/* Header */}
      <div>
        {totalIntegrations > 0 && (
          <div className="flex gap-2 mt-3">
            <Badge variant="outline">{activeIntegrations} Active</Badge>
            <Badge variant="muted">{totalIntegrations} Total</Badge>
          </div>
        )}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrationsByCategory.map((category) => {
          const Icon = category.icon;
          const count = category.integrations.length;

          return (
            <Card
              key={category.type}
              className="cursor-pointer hover:shadow-md transition-shadow border-2"
              onClick={() => handleCategoryClick(category.type)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg bg-${category.color}-500/10 dark:bg-${category.color}-500/20`}>
                      <Icon className={`h-6 w-6 text-${category.color}-500`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground">{category.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {count === 0 ? 'No connections' : `${count} connection${count > 1 ? 's' : ''}`}
                      </p>
                      {category.integrations.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {category.integrations.map((int) => (
                            <div key={int.id} className="flex items-center gap-2 text-sm">
                              <div className={`h-2 w-2 rounded-full ${
                                int.status === 'ACTIVE' ? 'bg-green-500' :
                                int.status === 'ERROR' ? 'bg-red-500' :
                                'bg-gray-400'
                              }`} />
                              <span className="text-foreground font-medium">{int.display_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCategoryClick(category.type);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Category Detail Dialog */}
      <Dialog open={selectedCategory !== null} onOpenChange={(open) => !open && setSelectedCategory(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory && dynamicCategories.find(c => c.type === selectedCategory)?.label}
            </DialogTitle>
          </DialogHeader>

          {selectedCategory && (
            <div className="space-y-4">
              {/* Existing Connections */}
              {integrationsByCategory
                .find(c => c.type === selectedCategory)
                ?.integrations.map((integration) => (
                  <div key={integration.id} className="space-y-2">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{integration.display_name}</h4>
                          <Badge variant={integration.status === 'ACTIVE' ? 'default' : 'muted'}>
                            {integration.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {integration.vendor.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestConnection(integration)}
                        disabled={testingIds.has(integration.id)}
                      >
                        {testingIds.has(integration.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Test
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSync(integration)}
                        disabled={syncingIds.has(integration.id)}
                      >
                        {syncingIds.has(integration.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCategory(null);
                          setTimeout(() => handleConfigure(integration), 100);
                        }}
                      >
                        Configure
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(integration)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    </div>

                    {/* Test Result Display */}
                    {testResults[integration.id] && (
                      <div
                        className={`p-3 rounded-lg border ${
                          testResults[integration.id].success
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {testResults[integration.id].success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          )}
                          <p
                            className={`text-sm ${
                              testResults[integration.id].success
                                ? 'text-green-800 dark:text-green-200'
                                : 'text-red-800 dark:text-red-200'
                            }`}
                          >
                            {testResults[integration.id].message}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Sync Result Display */}
                    {syncResults[integration.id] && (
                      <div
                        className={`p-3 rounded-lg border ${
                          syncResults[integration.id].success
                            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {syncResults[integration.id].success ? (
                            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          )}
                          <p
                            className={`text-sm ${
                              syncResults[integration.id].success
                                ? 'text-blue-800 dark:text-blue-200'
                                : 'text-red-800 dark:text-red-200'
                            }`}
                          >
                            {syncResults[integration.id].message}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {/* Add New Connection */}
              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold text-foreground mb-3">Add New Connection</h4>
                <div className="space-y-2">
                  {isLoadingVendors ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading vendors...</span>
                    </div>
                  ) : (
                    dynamicCategories.find(c => c.type === selectedCategory)?.vendors.map((vendor) => {
                      const isConnected = connectedVendors.has(vendor.id);

                      return (
                        <button
                          key={vendor.id}
                          onClick={() => !isConnected && handleAddIntegration(vendor.id, selectedCategory)}
                          disabled={isConnected}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                            isConnected
                              ? 'border-border bg-muted/30 cursor-not-allowed opacity-60'
                              : 'border-border hover:bg-muted/50 hover:border-foreground/20'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-foreground">{vendor.displayName}</span>
                              {isConnected && (
                                <Badge variant="muted" className="text-xs">
                                  Connected
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{vendor.description}</p>
                          </div>
                          {!isConnected && <Plus className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Configure Integration Dialog */}
      <Dialog open={configureDialog.open} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {configureDialog.integration ? 'Configure Integration' : 'Add Integration'}
            </DialogTitle>
          </DialogHeader>
          {(configureDialog.integration || (configureDialog.integrationType && configureDialog.vendor)) && (
            <Tabs defaultValue="settings">
              <TabsList>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                {configureDialog.integration && (
                  <TabsTrigger value="history">Sync History</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="settings">
                <ConfigureIntegrationForm
                  integration={configureDialog.integration}
                  integrationType={configureDialog.integrationType}
                  vendor={configureDialog.vendor}
                  onSuccess={() => {
                    handleCloseDialog();
                    handleRefresh();
                  }}
                  onCancel={handleCloseDialog}
                />
              </TabsContent>

              {configureDialog.integration && (
                <TabsContent value="history">
                  <IntegrationSyncHistory integrationId={configureDialog.integration.id} />
                </TabsContent>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, integration: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.integration?.display_name}"?
              This will stop all automatic syncing for this integration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

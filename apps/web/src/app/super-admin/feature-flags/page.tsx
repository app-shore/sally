'use client';

import { useState, useEffect } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { useFeatureFlagsStore } from '@/lib/store/featureFlagsStore';
import { updateFeatureFlag } from '@/lib/api/featureFlags';
import { Loader2, Save, RotateCcw, XCircle, Flag } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';

export default function FeatureFlagsAdminPage() {
  const { isAuthenticated, user } = useSessionStore();
  const { flags, isLoading, error, refetch } = useFeatureFlags();
  const { toast } = useToast();

  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local state from store
  useEffect(() => {
    const initialState: Record<string, boolean> = {};
    flags.forEach(flag => {
      initialState[flag.key] = flag.enabled;
    });
    setLocalFlags(initialState);
  }, [flags]);

  // Check for changes
  useEffect(() => {
    const changed = flags.some(flag => localFlags[flag.key] !== flag.enabled);
    setHasChanges(changed);
  }, [localFlags, flags]);

  // Auth check - OWNER only
  if (!isAuthenticated || user?.role !== 'OWNER') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-2">
              Only system owners can manage feature flags
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggle = (key: string, enabled: boolean) => {
    setLocalFlags(prev => ({
      ...prev,
      [key]: enabled,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update all changed flags
      const changedFlags = flags.filter(flag => localFlags[flag.key] !== flag.enabled);

      await Promise.all(
        changedFlags.map(flag =>
          updateFeatureFlag(flag.key, localFlags[flag.key])
        )
      );

      toast({
        title: 'Success',
        description: `Updated ${changedFlags.length} feature flag${changedFlags.length !== 1 ? 's' : ''}`,
      });

      // Refetch to sync with backend
      await refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update feature flags',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const initialState: Record<string, boolean> = {};
    flags.forEach(flag => {
      initialState[flag.key] = flag.enabled;
    });
    setLocalFlags(initialState);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'dispatcher':
        return '📊';
      case 'driver':
        return '🚛';
      case 'admin':
        return '⚙️';
      default:
        return '🏳️';
    }
  };

  const categorizedFlags = {
    dispatcher: flags.filter(f => f.category === 'dispatcher'),
    driver: flags.filter(f => f.category === 'driver'),
    admin: flags.filter(f => f.category === 'admin'),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading feature flags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Flag className="h-8 w-8" />
          Feature Flags Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Enable or disable features across the platform. Changes affect all tenants immediately.
        </p>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{flags.length}</p>
              <p className="text-sm text-muted-foreground">Total Flags</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {flags.filter(f => localFlags[f.key]).length}
              </p>
              <p className="text-sm text-muted-foreground">Enabled</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                {flags.filter(f => !localFlags[f.key]).length}
              </p>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {hasChanges ? Object.keys(localFlags).filter(key => {
                  const flag = flags.find(f => f.key === key);
                  return flag && localFlags[key] !== flag.enabled;
                }).length : 0}
              </p>
              <p className="text-sm text-muted-foreground">Pending Changes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {hasChanges && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  You have unsaved changes
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dispatcher Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{getCategoryIcon('dispatcher')}</span>
            Dispatcher Features
          </CardTitle>
          <CardDescription>
            Features available to dispatchers and fleet managers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categorizedFlags.dispatcher.map((flag, index) => (
            <div key={flag.key}>
              {index > 0 && <Separator className="my-4" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor={flag.key} className="text-base font-semibold cursor-pointer">
                      {flag.name}
                    </Label>
                    <Badge variant={localFlags[flag.key] ? 'default' : 'secondary'} className="text-xs">
                      {localFlags[flag.key] ? 'Enabled' : 'Disabled'}
                    </Badge>
                    {localFlags[flag.key] !== flag.enabled && (
                      <Badge variant="outline" className="text-xs border-blue-500 text-blue-600 dark:text-blue-400">
                        Modified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{flag.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">Key: {flag.key}</p>
                </div>
                <Switch
                  id={flag.key}
                  checked={localFlags[flag.key] || false}
                  onCheckedChange={(checked) => handleToggle(flag.key, checked)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Driver Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{getCategoryIcon('driver')}</span>
            Driver Features
          </CardTitle>
          <CardDescription>
            Features available to drivers in the mobile/web app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categorizedFlags.driver.map((flag, index) => (
            <div key={flag.key}>
              {index > 0 && <Separator className="my-4" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor={flag.key} className="text-base font-semibold cursor-pointer">
                      {flag.name}
                    </Label>
                    <Badge variant={localFlags[flag.key] ? 'default' : 'secondary'} className="text-xs">
                      {localFlags[flag.key] ? 'Enabled' : 'Disabled'}
                    </Badge>
                    {localFlags[flag.key] !== flag.enabled && (
                      <Badge variant="outline" className="text-xs border-blue-500 text-blue-600 dark:text-blue-400">
                        Modified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{flag.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">Key: {flag.key}</p>
                </div>
                <Switch
                  id={flag.key}
                  checked={localFlags[flag.key] || false}
                  onCheckedChange={(checked) => handleToggle(flag.key, checked)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Admin Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{getCategoryIcon('admin')}</span>
            Admin Features
          </CardTitle>
          <CardDescription>
            Administrative and integration features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categorizedFlags.admin.map((flag, index) => (
            <div key={flag.key}>
              {index > 0 && <Separator className="my-4" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor={flag.key} className="text-base font-semibold cursor-pointer">
                      {flag.name}
                    </Label>
                    <Badge variant={localFlags[flag.key] ? 'default' : 'secondary'} className="text-xs">
                      {localFlags[flag.key] ? 'Enabled' : 'Disabled'}
                    </Badge>
                    {localFlags[flag.key] !== flag.enabled && (
                      <Badge variant="outline" className="text-xs border-blue-500 text-blue-600 dark:text-blue-400">
                        Modified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{flag.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">Key: {flag.key}</p>
                </div>
                <Switch
                  id={flag.key}
                  checked={localFlags[flag.key] || false}
                  onCheckedChange={(checked) => handleToggle(flag.key, checked)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Warning Card */}
      <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-orange-500 mt-0.5">⚠️</div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Important Notes
              </p>
              <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 list-disc list-inside">
                <li>Changes affect all tenants immediately after saving</li>
                <li>Frontend cache (5min) and backend cache (30s) may cause brief delay</li>
                <li>Users may need to refresh their browser to see changes</li>
                <li>Disabling a feature will show "Coming Soon" banners to users</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

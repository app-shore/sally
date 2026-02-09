'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Separator } from '@/shared/components/ui/separator';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useToast } from '@/shared/hooks/use-toast';
import { apiClient } from '@/shared/lib/api';

interface SuperAdminPreferences {
  notifyNewTenants: boolean;
  notifyStatusChanges: boolean;
  notificationFrequency: string;
}

export default function SuperAdminSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [notifyNewTenants, setNotifyNewTenants] = useState(true);
  const [notifyStatusChanges, setNotifyStatusChanges] = useState(true);
  const [notificationFrequency, setNotificationFrequency] = useState('immediate');

  // Fetch preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['preferences', 'admin'],
    queryFn: () => apiClient<SuperAdminPreferences>('/settings/admin'),
    enabled: !!user,
  });

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setNotifyNewTenants(preferences.notifyNewTenants);
      setNotifyStatusChanges(preferences.notifyStatusChanges);
      setNotificationFrequency(preferences.notificationFrequency);
    }
  }, [preferences]);

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<SuperAdminPreferences>) =>
      apiClient<SuperAdminPreferences>('/settings/admin', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', 'admin'] });
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      notifyNewTenants,
      notifyStatusChanges,
      notificationFrequency,
    });
  };

  const handleChangePassword = () => {
    // TODO: Implement Firebase password change redirect
    toast({
      title: 'Coming soon',
      description: 'Password change via Firebase is not yet implemented.',
    });
  };

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal profile and notification preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Profile</CardTitle>
          <CardDescription>
            Your account information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-black dark:bg-white text-white dark:text-black text-lg">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-lg">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="default" className="mt-1">
                Super Admin
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Password Section */}
          <div>
            <Label className="text-base">Password</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Manage your password through Firebase Authentication
            </p>
            <Button variant="outline" onClick={handleChangePassword}>
              Change Password
            </Button>
          </div>

          <Separator />

          {/* Notification Preferences */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-base">Notification Preferences</Label>
                <p className="text-sm text-muted-foreground">
                  Choose how you want to be notified about platform events
                </p>
              </div>

              {/* Toggle: New Tenant Registrations */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>New Tenant Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new tenants register
                  </p>
                </div>
                <Switch
                  checked={notifyNewTenants}
                  onCheckedChange={setNotifyNewTenants}
                />
              </div>

              {/* Toggle: Tenant Status Changes */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>Tenant Status Changes</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when tenants are suspended or reactivated
                  </p>
                </div>
                <Switch
                  checked={notifyStatusChanges}
                  onCheckedChange={setNotifyStatusChanges}
                />
              </div>

              {/* Select: Notification Frequency */}
              <div className="space-y-2">
                <Label>Notification Frequency</Label>
                <Select
                  value={notificationFrequency}
                  onValueChange={setNotificationFrequency}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how often you receive notification emails
                </p>
              </div>

              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

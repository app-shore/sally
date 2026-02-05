'use client';

import { useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { Card, CardHeader } from '@/shared/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { usePreferencesStore } from '@/features/platform/preferences';
import UserPreferencesTab from './components/UserPreferencesTab';
import DriverPreferencesTab from './components/DriverPreferencesTab';

export default function PreferencesPage() {
  const { user } = useAuthStore();
  const { loadAllPreferences, isLoading } = usePreferencesStore();

  const isDriver = user?.role === 'DRIVER';

  useEffect(() => {
    if (user) {
      loadAllPreferences(user.role);
    }
  }, [user, loadAllPreferences]);

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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Preferences</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal preferences and UI settings
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardHeader>
        </Card>
      ) : (

        isDriver ?  <DriverPreferencesTab /> : <UserPreferencesTab />
      )}
    </div>
  );
}

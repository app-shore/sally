'use client';

import { useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { usePreferencesStore } from '@/lib/store/preferencesStore';
import UserPreferencesTab from './components/UserPreferencesTab';
import DriverPreferencesTab from './components/DriverPreferencesTab';

export default function PreferencesPage() {
  const { user } = useSessionStore();
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
    <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Preferences</h1>
        <p className="text-muted-foreground">
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
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            {isDriver && <TabsTrigger value="driver">Driver</TabsTrigger>}
          </TabsList>

          <TabsContent value="general">
            <UserPreferencesTab />
          </TabsContent>

          {isDriver && (
            <TabsContent value="driver">
              <DriverPreferencesTab />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

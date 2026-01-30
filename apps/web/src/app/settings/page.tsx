'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PreferencesPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSessionStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Preferences</h1>
        <p className="text-muted-foreground mt-1">
          {user?.role === 'DISPATCHER' || user?.role === 'ADMIN'
            ? 'Configure HOS rules, optimization defaults, and alert settings'
            : 'Manage your profile, notifications, and preferences'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {user?.role === 'DISPATCHER' || user?.role === 'ADMIN'
              ? 'System Preferences'
              : 'User Preferences'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Preferences - Coming Soon</p>
            <p className="text-sm mt-2">
              {user?.role === 'DISPATCHER' || user?.role === 'ADMIN'
                ? 'Configure HOS rules, optimization defaults, notification preferences, and alert thresholds'
                : 'Manage your profile, notification settings, and personal preferences'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

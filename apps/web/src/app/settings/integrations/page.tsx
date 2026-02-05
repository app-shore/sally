'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { ConnectionsTab } from '@/components/settings/ConnectionsTab';

export default function IntegrationsPage() {
  const { isAuthenticated, user } = useAuthStore();

  // Auth is handled by layout-client, just check role
  if (!isAuthenticated || user?.role === 'DRIVER') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect SALLY with external systems (TMS, ELD, fuel cards, and more)
        </p>
      </div>

      <ConnectionsTab />
    </div>
  );
}

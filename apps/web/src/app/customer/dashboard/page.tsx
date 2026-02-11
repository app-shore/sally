'use client';

import { useState, useEffect } from 'react';
import { customerApi } from '@/features/customer/api';
import type { CustomerLoad } from '@/features/customer/types';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { useRouter } from 'next/navigation';

export default function CustomerDashboard() {
  const router = useRouter();
  const [loads, setLoads] = useState<CustomerLoad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    customerApi.getMyLoads()
      .then(setLoads)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const activeLoads = loads.filter(l => !['completed', 'cancelled'].includes(l.status));
  const historicalLoads = loads.filter(l => l.status === 'completed');

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg md:text-xl font-semibold text-foreground">My Shipments</h1>
        <Button onClick={() => router.push('/customer/request-load')}>
          + Request a Load
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeLoads.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : activeLoads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No active shipments.</p>
          ) : (
            activeLoads.map(load => (
              <CustomerLoadCard key={load.load_id} load={load} />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          {historicalLoads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No completed shipments yet.</p>
          ) : (
            historicalLoads.map(load => (
              <CustomerLoadCard key={load.load_id} load={load} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CustomerLoadCard({ load }: { load: CustomerLoad }) {
  const router = useRouter();
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    pending: 'Pending',
    planned: 'Planned',
    active: 'In Transit',
    in_transit: 'In Transit',
    completed: 'Delivered',
    cancelled: 'Cancelled',
  };

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      tabIndex={0}
      role="button"
      onClick={() => {
        if (load.tracking_token) {
          router.push(`/track/${load.tracking_token}`);
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && load.tracking_token) {
          e.preventDefault();
          router.push(`/track/${load.tracking_token}`);
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{load.load_number}</p>
            <p className="text-sm text-muted-foreground truncate">
              {load.origin_city}, {load.origin_state} &rarr; {load.destination_city}, {load.destination_state}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm text-foreground">{statusLabels[load.status] || load.status}</p>
            {load.estimated_delivery && (
              <p className="text-xs text-muted-foreground">
                ETA: {new Date(load.estimated_delivery).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

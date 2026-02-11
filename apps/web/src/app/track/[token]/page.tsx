'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';

interface TrackingData {
  load_number: string;
  status: string;
  customer_name: string;
  carrier_name: string;
  equipment_type?: string;
  weight_lbs: number;
  estimated_delivery?: string;
  timeline: Array<{
    event: string;
    status: 'completed' | 'current' | 'upcoming';
    timestamp?: string;
    detail?: string;
  }>;
  stops: Array<{
    sequence_order: number;
    action_type: string;
    city?: string;
    state?: string;
  }>;
}

export default function TrackingPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/tracking/${token}`);
        if (!res.ok) throw new Error('Tracking information not found');
        const trackingData = await res.json();
        setData(trackingData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tracking');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, 60000);
    return () => clearInterval(interval);
  }, [token]);

  if (isLoading) return <TrackingLoadingSkeleton />;
  if (error || !data) return <TrackingNotFound />;

  const origin = data.stops[0];
  const destination = data.stops[data.stops.length - 1];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-lg font-semibold text-foreground">SALLY</span>
          <span className="text-sm text-muted-foreground">Powered by {data.carrier_name}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Load header */}
        <div>
          <p className="text-sm text-muted-foreground">Load: {data.load_number}</p>
          <p className="text-base md:text-lg font-medium text-foreground">
            {origin?.city}, {origin?.state} &rarr; {destination?.city}, {destination?.state}
          </p>
        </div>

        {/* Status card */}
        <Card>
          <CardContent className="p-4 md:p-6 text-center space-y-2">
            <StatusDisplay status={data.status} />
            {data.estimated_delivery && (
              <p className="text-sm text-muted-foreground">
                Estimated Delivery: {new Date(data.estimated_delivery).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-4">Timeline</h3>
          <div className="space-y-4">
            {data.timeline.map((event, i) => (
              <TimelineEvent key={i} event={event} />
            ))}
          </div>
        </div>

        {/* POD section */}
        <Separator />
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Proof of Delivery</h3>
          {data.status === 'completed' ? (
            <p className="text-sm text-muted-foreground">Documents available for download.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Available after delivery.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDisplay({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: 'Order Pending',
    planned: 'Route Planned',
    active: 'In Transit',
    in_transit: 'In Transit',
    completed: 'Delivered',
    cancelled: 'Cancelled',
  };
  return (
    <p className="text-xl font-semibold text-foreground">
      {labels[status] || status}
    </p>
  );
}

function TimelineEvent({ event }: { event: { event: string; status: string; timestamp?: string; detail?: string } }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full mt-1 ${
            event.status === 'completed'
              ? 'bg-foreground'
              : event.status === 'current'
                ? 'bg-foreground ring-4 ring-muted'
                : 'bg-muted-foreground/30'
          }`}
        />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${event.status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
            {event.event}
          </span>
          {event.timestamp && (
            <span className="text-xs text-muted-foreground">
              {new Date(event.timestamp).toLocaleDateString()}
            </span>
          )}
        </div>
        {event.detail && <p className="text-xs text-muted-foreground">{event.detail}</p>}
      </div>
    </div>
  );
}

function TrackingLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading tracking information...</p>
    </div>
  );
}

function TrackingNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground">Tracking Not Found</p>
        <p className="text-sm text-muted-foreground">This tracking link may be invalid or expired.</p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreatePlanPage() {
  const router = useRouter();
  const { is_authenticated, user_type } = useSessionStore();

  useEffect(() => {
    if (!is_authenticated || user_type !== 'dispatcher') {
      router.push('/');
    }
  }, [is_authenticated, user_type, router]);

  if (!is_authenticated || user_type !== 'dispatcher') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Route Plan</h1>
        <p className="text-gray-500 mt-1">Plan optimized routes with HOS compliance and rest stop insertion</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Route Planning Interface</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium">Route Planning Coming Soon</p>
            <p className="text-sm mt-2">Comprehensive route planning interface with:</p>
            <ul className="text-sm mt-4 space-y-2 max-w-md mx-auto text-left">
              <li>• TSP/VRP optimization for stop sequences</li>
              <li>• Automatic HOS-compliant rest stop insertion</li>
              <li>• Fuel stop optimization with price comparison</li>
              <li>• Real-time feasibility validation</li>
              <li>• Multi-driver route planning</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

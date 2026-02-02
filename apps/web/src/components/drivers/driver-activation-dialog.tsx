'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

interface DriverActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: any | null;
  mode: 'activate' | 'reactivate' | 'deactivate';
}

export function DriverActivationDialog({
  open,
  onOpenChange,
  driver,
  mode,
}: DriverActivationDialogProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const activationMutation = useMutation({
    mutationFn: async () => {
      if (!driver) return;

      const driverId = driver.driverId || driver.driver_id;
      let endpoint = '';

      if (mode === 'activate' || mode === 'reactivate') {
        endpoint = `${apiUrl}/drivers/${driverId}/${mode}`;
      } else {
        endpoint = `${apiUrl}/drivers/${driverId}/deactivate`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: mode === 'deactivate' ? JSON.stringify({ reason }) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${mode} driver`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setReason('');
      onOpenChange(false);
    },
    onError: (err: any) => {
      setError(err.message || `Failed to ${mode} driver`);
    },
  });

  const handleSubmit = () => {
    if (mode === 'deactivate' && !reason.trim()) {
      setError('Reason is required for deactivation');
      return;
    }
    setError(null);
    activationMutation.mutate();
  };

  const getDialogContent = () => {
    switch (mode) {
      case 'activate':
        return {
          title: 'Activate Driver',
          description: `Activate ${driver?.name} to allow them to use the system?`,
          actionLabel: 'Activate',
        };
      case 'reactivate':
        return {
          title: 'Reactivate Driver',
          description: `Reactivate ${driver?.name} to restore their access?`,
          actionLabel: 'Reactivate',
        };
      case 'deactivate':
        return {
          title: 'Deactivate Driver',
          description: `Deactivate ${driver?.name}? Please provide a reason.`,
          actionLabel: 'Deactivate',
        };
    }
  };

  const content = getDialogContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {mode === 'deactivate' && (
            <div>
              <Label htmlFor="reason">Reason for Deactivation</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., No longer with company, policy violation, etc."
                rows={3}
                className="bg-background mt-2"
              />
            </div>
          )}

          {driver && (
            <div className="rounded-md bg-muted p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-foreground">Driver:</span>
                <span className="text-sm text-foreground">{driver.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-foreground">Driver ID:</span>
                <span className="text-sm font-mono text-foreground">
                  {driver.driverId || driver.driver_id}
                </span>
              </div>
              {driver.externalSource && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-foreground">Source:</span>
                  <span className="text-sm text-foreground">{driver.externalSource}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={mode === 'deactivate' ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={activationMutation.isPending}
          >
            {activationMutation.isPending ? 'Processing...' : content.actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

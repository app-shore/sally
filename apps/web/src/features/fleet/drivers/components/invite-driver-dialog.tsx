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
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { driversApi } from '../api';

interface InviteDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: {
    driver_id: string;
    name: string;
    email?: string | null;
    external_source?: string;
  } | null;
}

export function InviteDriverDialog({
  open,
  onOpenChange,
  driver,
}: InviteDriverDialogProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const needsEmail = !driver?.email;

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!driver) return;
      const emailToUse = needsEmail ? email : undefined;
      return driversApi.activateAndInvite(driver.driver_id, emailToUse);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setEmail('');
      setError(null);
      onOpenChange(false);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to send invitation');
    },
  });

  const handleSubmit = () => {
    if (needsEmail && !email.trim()) {
      setError('Email is required to send an invitation');
      return;
    }
    if (needsEmail && !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    inviteMutation.mutate();
  };

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite {driver.name} to SALLY</DialogTitle>
          <DialogDescription>
            An invitation email will be sent. {driver.name} will set a password to log in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md bg-muted p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-foreground">Name</span>
              <span className="text-sm text-foreground">{driver.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-foreground">Driver ID</span>
              <span className="text-sm font-mono text-foreground">{driver.driver_id}</span>
            </div>
            {driver.email && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-foreground">Email</span>
                <span className="text-sm text-foreground">{driver.email}</span>
              </div>
            )}
            {driver.external_source && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-foreground">Source</span>
                <Badge variant="outline">{driver.external_source}</Badge>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm font-medium text-foreground">Role</span>
              <Badge variant="muted">Driver</Badge>
            </div>
          </div>

          {needsEmail && (
            <div>
              <Label htmlFor="driver-email">Email Address</Label>
              <Input
                id="driver-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@example.com"
                className="bg-background mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                This email will be saved to the driver&apos;s profile and used for login.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={inviteMutation.isPending}
          >
            {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InviteDriverDialog;

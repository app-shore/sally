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
import { customersApi } from '../api';
import type { Customer } from '../types';

interface InviteCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function InviteCustomerDialog({
  open,
  onOpenChange,
  customer,
}: InviteCustomerDialogProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!customer) return;
      return customersApi.invite(customer.customer_id, {
        email,
        first_name: firstName,
        last_name: lastName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setFirstName('');
      setLastName('');
      setEmail('');
      setError(null);
      onOpenChange(false);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to send invitation');
    },
  });

  const handleSubmit = () => {
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    inviteMutation.mutate();
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite to Customer Portal</DialogTitle>
          <DialogDescription>
            Send a portal invitation to a contact at {customer.company_name}.
            They&apos;ll set a password and access their shipments.
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
              <span className="text-sm font-medium text-foreground">Company</span>
              <span className="text-sm text-foreground">{customer.company_name}</span>
            </div>
            {customer.contact_email && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-foreground">Company Email</span>
                <span className="text-sm text-foreground">{customer.contact_email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm font-medium text-foreground">Role</span>
              <Badge variant="muted">Customer</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer-first-name">First Name</Label>
              <Input
                id="customer-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="bg-background mt-1"
              />
            </div>
            <div>
              <Label htmlFor="customer-last-name">Last Name</Label>
              <Input
                id="customer-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="bg-background mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="customer-email">Email Address</Label>
            <Input
              id="customer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@customer.com"
              className="bg-background mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              This email will be used for login and shipment notifications.
            </p>
          </div>
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

export default InviteCustomerDialog;

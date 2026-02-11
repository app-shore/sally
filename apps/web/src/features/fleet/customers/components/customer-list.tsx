'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
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
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Plus, Send } from 'lucide-react';
import { customersApi } from '../api';
import type { Customer, CustomerCreate } from '../types';
import { InviteCustomerDialog } from './invite-customer-dialog';

export function CustomerList() {
  const queryClient = useQueryClient();
  const [inviteCustomer, setInviteCustomer] = useState<Customer | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newForm, setNewForm] = useState<CustomerCreate>({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CustomerCreate) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsNewOpen(false);
      setNewForm({ company_name: '', contact_name: '', contact_email: '', contact_phone: '' });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create customer');
    },
  });

  const handleCreate = () => {
    if (!newForm.company_name.trim()) {
      setFormError('Company name is required');
      return;
    }
    setFormError(null);
    createMutation.mutate(newForm);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {customers?.length ? `${customers.length} customer${customers.length !== 1 ? 's' : ''}` : ''}
        </p>
        <Button size="sm" onClick={() => setIsNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Customer
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Loading customers...</div>
      ) : !customers?.length ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No customers yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click &quot;Add Customer&quot; to create your first customer.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.customer_id}>
                  <TableCell className="font-medium text-foreground">
                    {customer.company_name}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-foreground">
                    {customer.contact_name || '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-foreground">
                    {customer.contact_email || '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-foreground">
                    {customer.contact_phone || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.is_active ? 'muted' : 'destructive'}>
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInviteCustomer(customer)}
                    >
                      <Send className="h-3 w-3 mr-1.5" />
                      <span className="hidden sm:inline">Invite to Portal</span>
                      <span className="sm:hidden">Invite</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New Customer Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>
              Add a new customer to your account. You can invite them to the portal after.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="new-company-name">Company Name *</Label>
              <Input
                id="new-company-name"
                value={newForm.company_name}
                onChange={(e) => setNewForm({ ...newForm, company_name: e.target.value })}
                placeholder="Acme Logistics"
                className="bg-background mt-1"
              />
            </div>

            <div>
              <Label htmlFor="new-contact-name">Contact Name</Label>
              <Input
                id="new-contact-name"
                value={newForm.contact_name}
                onChange={(e) => setNewForm({ ...newForm, contact_name: e.target.value })}
                placeholder="Jane Smith"
                className="bg-background mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-contact-email">Email</Label>
                <Input
                  id="new-contact-email"
                  type="email"
                  value={newForm.contact_email}
                  onChange={(e) => setNewForm({ ...newForm, contact_email: e.target.value })}
                  placeholder="jane@acme.com"
                  className="bg-background mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-contact-phone">Phone</Label>
                <Input
                  id="new-contact-phone"
                  type="tel"
                  value={newForm.contact_phone}
                  onChange={(e) => setNewForm({ ...newForm, contact_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="bg-background mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <InviteCustomerDialog
        open={!!inviteCustomer}
        onOpenChange={(open) => !open && setInviteCustomer(null)}
        customer={inviteCustomer}
      />
    </>
  );
}

export default CustomerList;

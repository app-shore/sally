'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Send } from 'lucide-react';
import { customersApi } from '../api';
import type { Customer } from '../types';
import { InviteCustomerDialog } from './invite-customer-dialog';

export function CustomerList() {
  const [inviteCustomer, setInviteCustomer] = useState<Customer | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.list(),
  });

  if (isLoading) {
    return <div className="text-muted-foreground py-8 text-center">Loading customers...</div>;
  }

  if (!customers?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No customers yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Customers are created when adding loads or can be added from the Loads page.
        </p>
      </div>
    );
  }

  return (
    <>
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

      <InviteCustomerDialog
        open={!!inviteCustomer}
        onOpenChange={(open) => !open && setInviteCustomer(null)}
        customer={inviteCustomer}
      />
    </>
  );
}

export default CustomerList;

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
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

interface CustomerListProps {
  onInviteClick?: (customer: Customer) => void;
}

export function CustomerList({ onInviteClick }: CustomerListProps) {
  const [inviteCustomer, setInviteCustomer] = useState<Customer | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.list(),
  });

  const handleInviteClick = (customer: Customer) => {
    if (onInviteClick) {
      onInviteClick(customer);
    } else {
      setInviteCustomer(customer);
      setInviteDialogOpen(true);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground py-8 text-center">Loading customers...</div>;
  }

  if (!customers?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No customers yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Customers are created when you add a new load.
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
              <TableHead>Portal Access</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.customer_id}>
                <TableCell>
                  <div>
                    <div className="font-medium text-foreground">{customer.company_name}</div>
                    {customer.contact_phone && (
                      <div className="text-sm text-muted-foreground hidden lg:block">
                        {customer.contact_phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-foreground">
                  {customer.contact_name || '—'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-foreground">
                  {customer.contact_email || '—'}
                </TableCell>
                <TableCell>
                  {customer.portal_access_status === 'ACTIVE' && (
                    <Badge variant="default">Active</Badge>
                  )}
                  {customer.portal_access_status === 'INVITED' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="muted">Invited</Badge>
                      <Link
                        href="/admin/team?tab=invitations"
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                      >
                        Manage invite
                      </Link>
                    </div>
                  )}
                  {customer.portal_access_status === 'DEACTIVATED' && (
                    <Badge variant="destructive">Deactivated</Badge>
                  )}
                  {(!customer.portal_access_status || customer.portal_access_status === 'NO_ACCESS') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInviteClick(customer)}
                    >
                      <Send className="h-3 w-3 mr-1.5" />
                      Invite to Portal
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {customer.portal_access_status === 'ACTIVE' && (
                    <span className="text-xs text-muted-foreground">Portal user active</span>
                  )}
                  {customer.portal_access_status === 'INVITED' && (
                    <span className="text-xs text-muted-foreground">Awaiting acceptance</span>
                  )}
                  {(!customer.portal_access_status || customer.portal_access_status === 'NO_ACCESS') && (
                    <span className="text-xs text-muted-foreground">No portal access</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <InviteCustomerDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        customer={inviteCustomer}
      />
    </>
  );
}

export default CustomerList;

'use client';

import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { formatDateTimeFriendly } from '@/shared/lib/utils/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface Tenant {
  id: number;
  tenantId: string;
  companyName: string;
  subdomain: string;
  dotNumber: string;
  fleetSize: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  users?: Array<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }>;
  _count?: {
    users: number;
    drivers: number;
  };
}

interface TenantTableProps {
  tenants: Tenant[];
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  onApprove?: (tenant: Tenant) => void;
  onReject?: (tenant: Tenant) => void;
  onSuspend?: (tenant: Tenant) => void;
  onReactivate?: (tenant: Tenant) => void;
  onViewDetails?: (tenant: Tenant) => void;
  isLoading?: boolean;
}

export function TenantTable({
  tenants,
  status,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
  onViewDetails,
  isLoading = false,
}: TenantTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <Alert>
        <AlertDescription className="text-foreground">
          No {status.toLowerCase().replace('_', ' ')} tenants
        </AlertDescription>
      </Alert>
    );
  }

  const getStatusDate = (tenant: Tenant) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return formatDateTimeFriendly(tenant.createdAt);
      case 'ACTIVE':
        return tenant.approvedAt ? formatDateTimeFriendly(tenant.approvedAt) : '-';
      case 'SUSPENDED':
        return tenant.suspendedAt ? formatDateTimeFriendly(tenant.suspendedAt) : '-';
      case 'REJECTED':
        return tenant.rejectedAt ? formatDateTimeFriendly(tenant.rejectedAt) : '-';
      default:
        return '-';
    }
  };

  const getDateLabel = () => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'Registered';
      case 'ACTIVE':
        return 'Approved';
      case 'SUSPENDED':
        return 'Suspended';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Date';
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Subdomain</TableHead>
            <TableHead>DOT Number</TableHead>
            <TableHead>Fleet Size</TableHead>
            <TableHead>Admin User</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>{getDateLabel()}</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell className="font-medium">{tenant.companyName}</TableCell>
              <TableCell>
                <code className="text-sm bg-muted px-1 py-0.5 rounded">
                  {tenant.subdomain}.sally.com
                </code>
              </TableCell>
              <TableCell>{tenant.dotNumber}</TableCell>
              <TableCell>
                <Badge variant="muted">
                  {tenant.fleetSize?.replace('SIZE_', '')}
                </Badge>
              </TableCell>
              <TableCell>
                {tenant.users?.[0] && (
                  <>
                    {tenant.users[0].firstName} {tenant.users[0].lastName}
                    <br />
                    <span className="text-sm text-muted-foreground">
                      {tenant.users[0].email}
                    </span>
                  </>
                )}
              </TableCell>
              <TableCell>
                {tenant.contactEmail}
                <br />
                <span className="text-sm text-muted-foreground">
                  {tenant.contactPhone}
                </span>
              </TableCell>
              <TableCell>{getStatusDate(tenant)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {status === 'PENDING_APPROVAL' && (
                    <>
                      {onApprove && (
                        <Button size="sm" onClick={() => onApprove(tenant)}>
                          Approve
                        </Button>
                      )}
                      {onReject && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onReject(tenant)}
                        >
                          Reject
                        </Button>
                      )}
                    </>
                  )}
                  {status === 'ACTIVE' && onSuspend && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSuspend(tenant)}
                    >
                      Suspend
                    </Button>
                  )}
                  {status === 'SUSPENDED' && onReactivate && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReactivate(tenant)}
                    >
                      Reactivate
                    </Button>
                  )}
                  {onViewDetails && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewDetails(tenant)}
                    >
                      Details
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

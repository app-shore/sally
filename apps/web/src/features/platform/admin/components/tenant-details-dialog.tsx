'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth';

interface TenantDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

export function TenantDetailsDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: TenantDetailsDialogProps) {
  const { accessToken } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  // Fetch tenant details
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-details', tenantId],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/tenants/${tenantId}/details`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch tenant details');
      return response.json();
    },
    enabled: open && !!accessToken,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tenantName} - Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">
                Users ({data.metrics.totalUsers})
              </TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Company Information */}
              <div>
                <h4 className="font-semibold mb-2">Company Information</h4>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Company Name:</dt>
                  <dd className="font-medium">{data.tenant.companyName}</dd>

                  <dt className="text-muted-foreground">Subdomain:</dt>
                  <dd>
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      {data.tenant.subdomain}.sally.com
                    </code>
                  </dd>

                  <dt className="text-muted-foreground">DOT Number:</dt>
                  <dd>{data.tenant.dotNumber}</dd>

                  <dt className="text-muted-foreground">Fleet Size:</dt>
                  <dd>
                    <Badge variant="secondary">
                      {data.tenant.fleetSize?.replace('SIZE_', '')}
                    </Badge>
                  </dd>
                </dl>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="font-semibold mb-2">Contact Information</h4>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Email:</dt>
                  <dd>{data.tenant.contactEmail}</dd>

                  <dt className="text-muted-foreground">Phone:</dt>
                  <dd>{data.tenant.contactPhone}</dd>
                </dl>
              </div>

              {/* Status History */}
              <div>
                <h4 className="font-semibold mb-2">Status History</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge>{data.tenant.status}</Badge>
                    <span className="text-muted-foreground">Current Status</span>
                  </div>
                  {data.tenant.approvedAt && (
                    <div className="text-muted-foreground">
                      Approved on {new Date(data.tenant.approvedAt).toLocaleDateString()} by{' '}
                      {data.tenant.approvedBy}
                    </div>
                  )}
                  {data.tenant.suspendedAt && (
                    <div className="text-muted-foreground">
                      Suspended on {new Date(data.tenant.suspendedAt).toLocaleDateString()} by{' '}
                      {data.tenant.suspendedBy}
                      <p className="italic mt-1">Reason: {data.tenant.suspensionReason}</p>
                    </div>
                  )}
                  {data.tenant.rejectedAt && (
                    <div className="text-muted-foreground">
                      Rejected on {new Date(data.tenant.rejectedAt).toLocaleDateString()}
                      <p className="italic mt-1">Reason: {data.tenant.rejectionReason}</p>
                    </div>
                  )}
                  {data.tenant.reactivatedAt && (
                    <div className="text-muted-foreground">
                      Reactivated on {new Date(data.tenant.reactivatedAt).toLocaleDateString()} by{' '}
                      {data.tenant.reactivatedBy}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user: any) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.metrics.totalUsers}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Drivers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.metrics.totalDrivers}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Vehicles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.metrics.totalVehicles}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Route Plans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.metrics.totalRoutePlans}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Account Timeline</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Account Created:</dt>
                    <dd>{new Date(data.tenant.createdAt).toLocaleDateString()}</dd>
                  </div>
                  {data.tenant.approvedAt && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Approved:</dt>
                      <dd>{new Date(data.tenant.approvedAt).toLocaleDateString()}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

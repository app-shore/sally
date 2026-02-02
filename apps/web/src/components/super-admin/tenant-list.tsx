'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

export function TenantList() {
  const { accessToken, isInitialized } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  // Debug logging
  console.log('[TenantList] Render:', {
    isInitialized,
    hasAccessToken: !!accessToken,
    accessTokenLength: accessToken?.length,
    localStorage: localStorage.getItem('auth-storage') ? 'exists' : 'missing',
  });

  // Fetch tenants - only when auth is fully initialized
  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['tenants', 'pending'],
    queryFn: async () => {
      console.log('[TenantList] Making API call with token:', accessToken?.substring(0, 20) + '...');
      const response = await fetch(`${apiUrl}/tenants?status=PENDING_APPROVAL`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log('[TenantList] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TenantList] API Error:', errorText);
        throw new Error('Failed to fetch tenants');
      }
      return response.json();
    },
    enabled: isInitialized && !!accessToken,
  });

  // Approve tenant mutation
  const approveMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await fetch(`${apiUrl}/tenants/${tenantId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to approve tenant');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  // Reject tenant mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ tenantId, reason }: { tenantId: string; reason: string }) => {
      const response = await fetch(`${apiUrl}/tenants/${tenantId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to reject tenant');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setRejectDialogOpen(false);
      setRejectionReason('');
    },
  });

  const handleApprove = (tenant: any) => {
    if (confirm(`Approve ${tenant.companyName}?`)) {
      approveMutation.mutate(tenant.tenantId);
    }
  };

  const handleReject = () => {
    if (selectedTenant && rejectionReason.trim()) {
      rejectMutation.mutate({
        tenantId: selectedTenant.tenantId,
        reason: rejectionReason,
      });
    }
  };

  // Wait for auth initialization
  if (!isInitialized) {
    return <div className="text-muted-foreground">Initializing...</div>;
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading tenants...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Tenant Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants?.length === 0 ? (
            <Alert>
              <AlertDescription className="text-foreground">
                No pending tenant approvals
              </AlertDescription>
            </Alert>
          ) : (
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
                    <TableHead>Registered</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants?.map((tenant: any) => (
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
                        {tenant.users?.[0]?.firstName} {tenant.users?.[0]?.lastName}
                        <br />
                        <span className="text-sm text-muted-foreground">
                          {tenant.users?.[0]?.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        {tenant.contactEmail}
                        <br />
                        <span className="text-sm text-muted-foreground">
                          {tenant.contactPhone}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(tenant)}
                            disabled={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setRejectDialogOpen(true);
                            }}
                            disabled={rejectMutation.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Tenant Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedTenant?.companyName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Rejection Reason</Label>
            <Textarea
              id="reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Invalid DOT number, duplicate registration, etc."
              rows={4}
              className="bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

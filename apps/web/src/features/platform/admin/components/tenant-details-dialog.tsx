'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
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
import { Loader2, Pencil } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useToast } from '@/shared/hooks/use-toast';
import { formatDateTimeFriendly } from '@/shared/lib/utils/formatters';

interface TenantDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  tenantStatus?: string;
  onApprove?: (tenantId: string) => void;
  onReject?: (tenantId: string) => void;
  onSuspend?: (tenantId: string) => void;
  onReactivate?: (tenantId: string) => void;
}

interface EditFormData {
  companyName: string;
  subdomain: string;
  dotNumber: string;
  fleetSize: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPhone: string;
}

const FLEET_SIZE_OPTIONS = [
  { value: 'SIZE_1_10', label: '1-10 vehicles' },
  { value: 'SIZE_11_50', label: '11-50 vehicles' },
  { value: 'SIZE_51_100', label: '51-100 vehicles' },
  { value: 'SIZE_101_500', label: '101-500 vehicles' },
  { value: 'SIZE_500_PLUS', label: '500+ vehicles' },
];

export function TenantDetailsDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  tenantStatus,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
}: TenantDetailsDialogProps) {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EditFormData>({
    companyName: '',
    subdomain: '',
    dotNumber: '',
    fleetSize: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPhone: '',
  });

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

  const populateForm = (source: any) => {
    const ownerUser = source.users?.find((u: any) => u.role === 'OWNER');
    setForm({
      companyName: source.tenant.companyName || '',
      subdomain: source.tenant.subdomain || '',
      dotNumber: source.tenant.dotNumber || '',
      fleetSize: source.tenant.fleetSize || '',
      ownerFirstName: ownerUser?.firstName || '',
      ownerLastName: ownerUser?.lastName || '',
      ownerEmail: source.tenant.contactEmail || '',
      ownerPhone: source.tenant.contactPhone || '',
    });
  };

  // Populate form when data loads
  useEffect(() => {
    if (data) populateForm(data);
  }, [data]);

  // Reset edit mode when dialog closes
  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updateData: Record<string, string>) => {
      const response = await fetch(`${apiUrl}/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update tenant');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-details', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsEditing(false);
      toast({
        title: 'Tenant updated',
        description: 'Tenant details have been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tenant. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (!data) return;

    const ownerUser = data.users?.find((u: any) => u.role === 'OWNER');
    const payload: Record<string, string> = {};

    if (form.companyName !== data.tenant.companyName) payload.companyName = form.companyName;
    if (form.subdomain !== data.tenant.subdomain) payload.subdomain = form.subdomain;
    if (form.dotNumber !== data.tenant.dotNumber) payload.dotNumber = form.dotNumber;
    if (form.fleetSize !== data.tenant.fleetSize) payload.fleetSize = form.fleetSize;
    if (form.ownerFirstName !== (ownerUser?.firstName || ''))
      payload.ownerFirstName = form.ownerFirstName;
    if (form.ownerLastName !== (ownerUser?.lastName || ''))
      payload.ownerLastName = form.ownerLastName;
    if (form.ownerEmail !== (data.tenant.contactEmail || ''))
      payload.ownerEmail = form.ownerEmail;
    if (form.ownerPhone !== (data.tenant.contactPhone || ''))
      payload.ownerPhone = form.ownerPhone;

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    updateMutation.mutate(payload);
  };

  const handleCancel = () => {
    if (data) populateForm(data);
    setIsEditing(false);
  };

  const updateField = (field: keyof EditFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Validation
  const isDotNumberValid = /^\d{1,8}$/.test(form.dotNumber);
  const isSubdomainValid = /^[a-z0-9-]+$/.test(form.subdomain);
  const isFormValid =
    form.companyName.length >= 2 &&
    isSubdomainValid &&
    isDotNumberValid &&
    !!form.fleetSize &&
    !!form.ownerFirstName &&
    !!form.ownerLastName &&
    !!form.ownerEmail;

  const status = tenantStatus || data?.tenant?.status;

  // --- EDIT MODE DIALOG ---
  if (isEditing && data) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); onOpenChange(o); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant Details</DialogTitle>
            <DialogDescription>
              Update details for {tenantName}. Changes are saved immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Company Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Company Information</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-companyName">Company Name</Label>
                  <Input
                    id="edit-companyName"
                    value={form.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-subdomain">Subdomain</Label>
                  <div className="flex items-center gap-0">
                    <Input
                      id="edit-subdomain"
                      value={form.subdomain}
                      onChange={(e) => updateField('subdomain', e.target.value.toLowerCase())}
                      placeholder="acme-trucking"
                      className="rounded-r-none"
                    />
                    <span className="inline-flex h-9 items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                      .sally.com
                    </span>
                  </div>
                  {form.subdomain && !isSubdomainValid && (
                    <p className="text-sm text-destructive">
                      Only lowercase letters, numbers, and hyphens
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-dotNumber">DOT Number</Label>
                    <Input
                      id="edit-dotNumber"
                      value={form.dotNumber}
                      onChange={(e) => updateField('dotNumber', e.target.value.replace(/\D/g, ''))}
                      placeholder="1234567"
                      maxLength={8}
                    />
                    {form.dotNumber && !isDotNumberValid && (
                      <p className="text-sm text-destructive">
                        Must be 1-8 digits
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-fleetSize">Fleet Size</Label>
                    <Select
                      value={form.fleetSize}
                      onValueChange={(value) => updateField('fleetSize', value)}
                    >
                      <SelectTrigger id="edit-fleetSize">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {FLEET_SIZE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Owner / Contact Information</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstName">First Name</Label>
                    <Input
                      id="edit-firstName"
                      value={form.ownerFirstName}
                      onChange={(e) => updateField('ownerFirstName', e.target.value)}
                      placeholder="First Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-lastName">Last Name</Label>
                    <Input
                      id="edit-lastName"
                      value={form.ownerLastName}
                      onChange={(e) => updateField('ownerLastName', e.target.value)}
                      placeholder="Last Name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={form.ownerEmail}
                    onChange={(e) => updateField('ownerEmail', e.target.value)}
                    placeholder="Email Address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={form.ownerPhone}
                    onChange={(e) => updateField('ownerPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isFormValid || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // --- VIEW MODE DIALOG ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle>{tenantName}</DialogTitle>
              <DialogDescription>
                {data?.tenant?.subdomain}.sally.com
                {status && (
                  <Badge className="ml-2" variant={status === 'ACTIVE' ? 'default' : 'muted'}>
                    {status.replace('_', ' ')}
                  </Badge>
                )}
              </DialogDescription>
            </div>
            {data && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5 shrink-0"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="users">
                  Users ({data.metrics.totalUsers})
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-md border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Users</p>
                    <p className="text-lg font-semibold">{data.metrics.totalUsers}</p>
                  </div>
                  <div className="rounded-md border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Drivers</p>
                    <p className="text-lg font-semibold">{data.metrics.totalDrivers}</p>
                  </div>
                  <div className="rounded-md border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Vehicles</p>
                    <p className="text-lg font-semibold">{data.metrics.totalVehicles}</p>
                  </div>
                  <div className="rounded-md border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Routes</p>
                    <p className="text-lg font-semibold">{data.metrics.totalRoutePlans}</p>
                  </div>
                </div>

                {/* Company Information */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Company Information</h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Company Name</dt>
                    <dd className="font-medium">{data.tenant.companyName}</dd>

                    <dt className="text-muted-foreground">Subdomain</dt>
                    <dd>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                        {data.tenant.subdomain}.sally.com
                      </code>
                    </dd>

                    <dt className="text-muted-foreground">DOT Number</dt>
                    <dd>{data.tenant.dotNumber}</dd>

                    <dt className="text-muted-foreground">Fleet Size</dt>
                    <dd>
                      <Badge variant="muted">
                        {data.tenant.fleetSize?.replace('SIZE_', '')}
                      </Badge>
                    </dd>
                  </dl>
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Contact Information</h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Owner</dt>
                    <dd>
                      {data.users?.find((u: any) => u.role === 'OWNER')
                        ? `${data.users.find((u: any) => u.role === 'OWNER').firstName} ${data.users.find((u: any) => u.role === 'OWNER').lastName}`
                        : 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Email</dt>
                    <dd>{data.tenant.contactEmail}</dd>

                    <dt className="text-muted-foreground">Phone</dt>
                    <dd>{data.tenant.contactPhone}</dd>
                  </dl>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Timeline</h4>
                  <div className="space-y-1.5 text-sm">
                    {data.tenant.reactivatedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Reactivated by {data.tenant.reactivatedBy}
                        </span>
                        <span className="text-muted-foreground">{formatDateTimeFriendly(data.tenant.reactivatedAt)}</span>
                      </div>
                    )}
                    {data.tenant.suspendedAt && (
                      <div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Suspended by {data.tenant.suspendedBy}
                          </span>
                          <span className="text-muted-foreground">{formatDateTimeFriendly(data.tenant.suspendedAt)}</span>
                        </div>
                        {data.tenant.suspensionReason && (
                          <p className="text-xs text-muted-foreground italic ml-0 mt-0.5">
                            {data.tenant.suspensionReason}
                          </p>
                        )}
                      </div>
                    )}
                    {data.tenant.rejectedAt && (
                      <div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rejected</span>
                          <span className="text-muted-foreground">{formatDateTimeFriendly(data.tenant.rejectedAt)}</span>
                        </div>
                        {data.tenant.rejectionReason && (
                          <p className="text-xs text-muted-foreground italic ml-0 mt-0.5">
                            {data.tenant.rejectionReason}
                          </p>
                        )}
                      </div>
                    )}
                    {data.tenant.approvedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Approved by {data.tenant.approvedBy}
                        </span>
                        <span className="text-muted-foreground">{formatDateTimeFriendly(data.tenant.approvedAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registered</span>
                      <span className="text-muted-foreground">{formatDateTimeFriendly(data.tenant.createdAt)}</span>
                    </div>
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
                          <Badge variant="muted">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'muted'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastLoginAt
                            ? formatDateTimeFriendly(user.lastLoginAt)
                            : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>

            {/* Action Buttons Footer */}
            {status && (status === 'PENDING_APPROVAL' || status === 'ACTIVE' || status === 'SUSPENDED') && (
              <DialogFooter>
                {status === 'PENDING_APPROVAL' && (
                  <>
                    {onReject && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onReject(tenantId)}
                      >
                        Reject
                      </Button>
                    )}
                    {onApprove && (
                      <Button size="sm" onClick={() => onApprove(tenantId)}>
                        Approve
                      </Button>
                    )}
                  </>
                )}
                {status === 'ACTIVE' && onSuspend && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onSuspend(tenantId)}
                  >
                    Suspend
                  </Button>
                )}
                {status === 'SUSPENDED' && onReactivate && (
                  <Button size="sm" onClick={() => onReactivate(tenantId)}>
                    Reactivate
                  </Button>
                )}
              </DialogFooter>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

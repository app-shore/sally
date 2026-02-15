'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { loadsApi } from '@/features/fleet/loads/api';
import { customersApi } from '@/features/fleet/customers/api';
import type { LoadListItem, Load, LoadCreate, LoadStopCreate } from '@/features/fleet/loads/types';
import type { Customer, CustomerCreate } from '@/features/fleet/customers/types';
import { ImportRateconDialog } from '@/features/fleet/loads/components/import-ratecon-dialog';
import { CustomerList } from '@/features/fleet/customers/components/customer-list';
import { InviteCustomerDialog } from '@/features/fleet/customers/components/invite-customer-dialog';
import { useReferenceData } from '@/features/platform/reference-data';
import type { ReferenceDataMap } from '@/features/platform/reference-data';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import {
  Plus,
  Trash2,
  Copy,
  Link2,
  MapPin,
  ArrowRight,
  RefreshCw,
  Upload,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// ============================================================================
// Main Page
// ============================================================================

export default function LoadsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { data: refData } = useReferenceData(['equipment_type', 'us_state']);
  const [loads, setLoads] = useState<LoadListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail panel state
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // New load dialog
  const [isNewLoadOpen, setIsNewLoadOpen] = useState(false);
  const [isRateconImportOpen, setIsRateconImportOpen] = useState(false);

  // Top-level view: loads vs customers (like Fleet has Drivers | Assets)
  const [activeView, setActiveView] = useState<'loads' | 'customers'>('loads');

  // Customer invite
  const [inviteCustomer, setInviteCustomer] = useState<Customer | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // New customer dialog
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState<CustomerCreate>({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null);

  const createCustomerMutation = useMutation({
    mutationFn: (data: CustomerCreate) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsNewCustomerOpen(false);
      setNewCustomerForm({ company_name: '', contact_name: '', contact_email: '', contact_phone: '' });
      setNewCustomerError(null);
    },
    onError: (err: Error) => {
      setNewCustomerError(err.message || 'Failed to create customer');
    },
  });


  // Group loads by status
  // Post-route lifecycle: pending → assigned → in_transit → delivered
  // "planned" is NOT a load status — a load on a draft route plan is still pending
  const drafts = loads.filter((l) => l.status === 'draft');
  const pending = loads.filter((l) => l.status === 'pending');
  const assigned = loads.filter((l) => l.status === 'assigned');
  const inTransit = loads.filter((l) => l.status === 'in_transit');
  const delivered = loads.filter((l) => l.status === 'delivered');
  const cancelled = loads.filter((l) => l.status === 'cancelled');

  const fetchLoads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await loadsApi.list();
      setLoads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'DRIVER') {
      fetchLoads();
    }
  }, [isAuthenticated, user, fetchLoads]);

  const handleCardClick = async (loadListItem: LoadListItem) => {
    try {
      const fullLoad = await loadsApi.getById(loadListItem.load_id);
      setSelectedLoad(fullLoad);
      setIsDetailOpen(true);
    } catch {
      // silent fail — toast would be better
    }
  };

  const handleStatusChange = async (loadId: string, status: string) => {
    try {
      await loadsApi.updateStatus(loadId, status);
      await fetchLoads();
      if (selectedLoad?.load_id === loadId) {
        const updated = await loadsApi.getById(loadId);
        setSelectedLoad(updated);
      }
    } catch {
      // silent fail
    }
  };

  const handleDuplicate = async (loadId: string) => {
    try {
      await loadsApi.duplicate(loadId);
      await fetchLoads();
    } catch {
      // silent fail
    }
  };

  const handleCopyTrackingLink = async (loadId: string) => {
    try {
      const result = await loadsApi.generateTrackingToken(loadId);
      const url = `${window.location.origin}/track/${result.tracking_token}`;
      await navigator.clipboard.writeText(url);
    } catch {
      // silent fail
    }
  };

  const handlePlanRoute = (loadId: string) => {
    router.push(`/dispatcher/plans/create?load_id=${loadId}`);
  };

  const handleCreateSuccess = async () => {
    setIsNewLoadOpen(false);
    await fetchLoads();
  };

  const handleCreateCustomer = () => {
    if (!newCustomerForm.company_name.trim()) {
      setNewCustomerError('Company name is required');
      return;
    }
    if (newCustomerForm.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomerForm.contact_email)) {
      setNewCustomerError('Please enter a valid email address');
      return;
    }
    if (newCustomerForm.contact_phone && !/^[\d\s()+\-]{7,}$/.test(newCustomerForm.contact_phone)) {
      setNewCustomerError('Please enter a valid phone number');
      return;
    }
    setNewCustomerError(null);
    createCustomerMutation.mutate(newCustomerForm);
  };

  if (!isAuthenticated || user?.role === 'DRIVER') {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Loads</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Manage freight loads and customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeView === 'loads' && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsRateconImportOpen(true)}>
                    Rate Confirmation (PDF)
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>Email-to-Load (Phase 2)</DropdownMenuItem>
                  <DropdownMenuItem disabled>DAT Search (Phase 2)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={isNewLoadOpen} onOpenChange={setIsNewLoadOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Load
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Load</DialogTitle>
                  </DialogHeader>
                  <NewLoadForm
                    onSuccess={handleCreateSuccess}
                    onCancel={() => setIsNewLoadOpen(false)}
                    refData={refData}
                  />
                </DialogContent>
              </Dialog>
            </>
          )}
          {activeView === 'customers' && (
            <Button size="sm" onClick={() => setIsNewCustomerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Top-level view toggle: Loads | Customers */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'loads' | 'customers')} className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 md:px-6 py-2 border-b border-border">
          <TabsList>
            <TabsTrigger value="loads">Loads</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>
          {activeView === 'loads' && (
            <div className="flex items-center gap-4 md:gap-6 text-sm overflow-x-auto">
              <StatPill label="Drafts" count={drafts.length} />
              <StatPill label="Pending" count={pending.length} />
              <StatPill label="Assigned" count={assigned.length} />
              <StatPill label="In Transit" count={inTransit.length} />
              <StatPill label="Delivered" count={delivered.length} />
              <StatPill label="Total" count={loads.length} />
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchLoads}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}
        </div>

        {/* Loads View */}
        <TabsContent value="loads" className="flex-1 flex flex-col min-h-0 mt-0">
          {error ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                <Button onClick={fetchLoads}>Retry</Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="board" className="flex-1 flex flex-col min-h-0">
              <div className="px-4 md:px-6 pt-3">
                <TabsList>
                  <TabsTrigger value="board">Active Board</TabsTrigger>
                  <TabsTrigger value="delivered">
                    Delivered ({delivered.length})
                  </TabsTrigger>
                  <TabsTrigger value="cancelled">
                    Cancelled ({cancelled.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="board" className="flex-1 p-4 md:p-6 overflow-auto">
                {isLoading ? (
                  <div className="text-center py-16 text-muted-foreground">Loading loads...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-h-[400px]">
                    <KanbanColumn
                      title="Drafts"
                      count={drafts.length}
                      loads={drafts}
                      onCardClick={handleCardClick}
                    />
                    <KanbanColumn
                      title="Pending"
                      count={pending.length}
                      loads={pending}
                      onCardClick={handleCardClick}
                      actionLabel="Plan Route"
                      onAction={(load) => handlePlanRoute(load.load_id)}
                    />
                    <KanbanColumn
                      title="Assigned"
                      count={assigned.length}
                      loads={assigned}
                      onCardClick={handleCardClick}
                    />
                    <KanbanColumn
                      title="In Transit"
                      count={inTransit.length}
                      loads={inTransit}
                      onCardClick={handleCardClick}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="delivered" className="p-4 md:p-6 overflow-auto">
                <LoadsTable
                  loads={delivered}
                  onRowClick={handleCardClick}
                  emptyMessage="No delivered loads"
                  refData={refData}
                />
              </TabsContent>

              <TabsContent value="cancelled" className="p-4 md:p-6 overflow-auto">
                <LoadsTable
                  loads={cancelled}
                  onRowClick={handleCardClick}
                  emptyMessage="No cancelled loads"
                  refData={refData}
                />
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        {/* Customers View */}
        <TabsContent value="customers" className="flex-1 p-4 md:p-6 overflow-auto mt-0">
          <CustomerList onInviteClick={(customer) => {
            setInviteCustomer(customer);
            setInviteDialogOpen(true);
          }} />
        </TabsContent>
      </Tabs>

      {/* Detail slide-out panel */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLoad && (
            <LoadDetailPanel
              load={selectedLoad}
              onStatusChange={handleStatusChange}
              onDuplicate={handleDuplicate}
              onCopyTrackingLink={handleCopyTrackingLink}
              onPlanRoute={handlePlanRoute}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Customer invite dialog */}
      <InviteCustomerDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        customer={inviteCustomer}
      />

      {/* New customer dialog */}
      <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>
              Add a new customer to your account. You can invite them to the portal after.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {newCustomerError && (
              <Alert variant="destructive">
                <AlertDescription>{newCustomerError}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="new-company-name">Company Name *</Label>
              <Input
                id="new-company-name"
                value={newCustomerForm.company_name}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, company_name: e.target.value })}
                placeholder="Acme Logistics"
                className="bg-background mt-1"
              />
            </div>

            <div>
              <Label htmlFor="new-contact-name">Contact Name</Label>
              <Input
                id="new-contact-name"
                value={newCustomerForm.contact_name}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, contact_name: e.target.value })}
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
                  value={newCustomerForm.contact_email}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, contact_email: e.target.value })}
                  placeholder="jane@acme.com"
                  className="bg-background mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-contact-phone">Phone</Label>
                <Input
                  id="new-contact-phone"
                  type="tel"
                  value={newCustomerForm.contact_phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, contact_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="bg-background mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewCustomerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer} disabled={createCustomerMutation.isPending}>
              {createCustomerMutation.isPending ? 'Creating...' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportRateconDialog
        open={isRateconImportOpen}
        onOpenChange={setIsRateconImportOpen}
        onSuccess={() => fetchLoads()}
      />
    </div>
  );
}

// ============================================================================
// Stat Pill
// ============================================================================

function StatPill({ label, count }: { label: string; count: number }) {
  return (
    <span className="text-muted-foreground whitespace-nowrap">
      {label}: <span className="font-medium text-foreground">{count}</span>
    </span>
  );
}

// ============================================================================
// Kanban Column
// ============================================================================

function KanbanColumn({
  title,
  count,
  loads,
  onCardClick,
  actionLabel,
  onAction,
}: {
  title: string;
  count: number;
  loads: LoadListItem[];
  onCardClick: (load: LoadListItem) => void;
  actionLabel?: string;
  onAction?: (load: LoadListItem) => void;
}) {
  return (
    <div className="flex flex-col bg-muted/30 dark:bg-muted/10 rounded-lg min-h-[200px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <Badge variant="muted" className="text-xs">
          {count}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loads.map((load) => (
          <LoadCard
            key={load.load_id}
            load={load}
            onClick={() => onCardClick(load)}
            actionLabel={actionLabel}
            onAction={onAction ? () => onAction(load) : undefined}
          />
        ))}
        {loads.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No loads</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Load Card
// ============================================================================

function LoadCard({
  load,
  onClick,
  actionLabel,
  onAction,
}: {
  load: LoadListItem;
  onClick: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-foreground">
            {load.load_number}
          </span>
          <IntakeSourceBadge source={load.intake_source} />
        </div>
        <p className="text-sm font-medium text-foreground truncate">{load.customer_name}</p>
        {load.reference_number && (
          <p className="text-xs text-muted-foreground font-mono truncate">
            Ref: {load.reference_number}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {load.stop_count} stops &middot; {load.weight_lbs?.toLocaleString()} lbs
          {load.rate_cents ? ` · $${(load.rate_cents / 100).toLocaleString()}` : ''}
        </p>
        {load.equipment_type && (
          <p className="text-xs text-muted-foreground capitalize">
            {load.equipment_type.replace(/_/g, ' ')}
          </p>
        )}
        {actionLabel && onAction && (
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
          >
            {actionLabel} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Intake Source Badge
// ============================================================================

function IntakeSourceBadge({ source }: { source?: string }) {
  const labels: Record<string, string> = {
    manual: 'Manual',
    template: 'Template',
    import: 'Import',
    email: 'Email',
    dat: 'DAT',
    tms_sync: 'TMS',
  };
  return (
    <span className="text-[10px] text-muted-foreground">
      {labels[source || 'manual'] || source || 'Manual'}
    </span>
  );
}

// ============================================================================
// Load Detail Panel
// ============================================================================

function LoadDetailPanel({
  load,
  onStatusChange,
  onDuplicate,
  onCopyTrackingLink,
  onPlanRoute,
}: {
  load: Load;
  onStatusChange: (loadId: string, status: string) => void;
  onDuplicate: (loadId: string) => void;
  onCopyTrackingLink: (loadId: string) => void;
  onPlanRoute: (loadId: string) => void;
}) {
  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <span className="font-mono">{load.load_number}</span>
          <Badge variant={getStatusVariant(load.status)} className="text-xs">
            {load.status.replace(/_/g, ' ')}
          </Badge>
        </SheetTitle>
      </SheetHeader>

      {/* Load info */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="Customer" value={load.customer_name} />
          <InfoItem label="Weight" value={`${load.weight_lbs?.toLocaleString()} lbs`} />
          <InfoItem label="Commodity" value={load.commodity_type} />
          <InfoItem
            label="Equipment"
            value={load.equipment_type?.replace(/_/g, ' ') || '—'}
          />
          {load.reference_number && (
            <InfoItem label="Reference / PO" value={load.reference_number} />
          )}
          {load.rate_cents != null && (
            <InfoItem label="Rate" value={`$${(load.rate_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
          )}
          {load.pieces != null && (
            <InfoItem label="Pieces" value={String(load.pieces)} />
          )}
          <InfoItem label="Intake" value={load.intake_source || 'manual'} />
          <InfoItem label="Stops" value={String(load.stops.length)} />
        </div>
        {load.special_requirements && (
          <div>
            <span className="text-xs text-muted-foreground">Requirements</span>
            <p className="text-sm text-foreground">{load.special_requirements}</p>
          </div>
        )}
      </div>

      {/* Stops timeline */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Stops
        </h4>
        {load.stops.map((stop, idx) => (
          <div
            key={stop.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-border"
          >
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                  stop.action_type === 'pickup'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                }`}
              >
                {idx + 1}
              </div>
              {idx < load.stops.length - 1 && <div className="w-0.5 h-4 bg-border" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge
                  variant={stop.action_type === 'pickup' ? 'default' : 'muted'}
                  className="text-[10px]"
                >
                  {stop.action_type}
                </Badge>
                <span className="text-sm font-medium text-foreground truncate">
                  {stop.stop_name || 'Stop'}
                </span>
              </div>
              {stop.stop_address && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {stop.stop_city}, {stop.stop_state}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                Dock: {stop.estimated_dock_hours}h
                {stop.earliest_arrival && ` · Window: ${stop.earliest_arrival}–${stop.latest_arrival}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-border">
        {load.status === 'draft' && (
          <Button
            className="w-full"
            onClick={() => onStatusChange(load.load_id, 'pending')}
          >
            Confirm Load
          </Button>
        )}
        {load.status === 'pending' && (
          <Button className="w-full" onClick={() => onPlanRoute(load.load_id)}>
            Plan Route <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
        {(load.status === 'assigned' || load.status === 'in_transit') && (
          <>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onCopyTrackingLink(load.load_id)}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Copy Tracking Link
            </Button>
            {load.status === 'assigned' && (
              <p className="text-xs text-muted-foreground text-center py-1">
                Awaiting driver pickup confirmation
              </p>
            )}
            {load.status === 'in_transit' && (
              <p className="text-xs text-muted-foreground text-center py-1">
                Delivery confirmed by driver on route completion
              </p>
            )}
          </>
        )}

        {/* Always available actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onDuplicate(load.load_id)}
          >
            <Copy className="h-3 w-3 mr-1" />
            Duplicate
          </Button>
          {!['delivered', 'cancelled'].includes(load.status) && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              onClick={() => onStatusChange(load.load_id, 'cancelled')}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium text-foreground capitalize">{value}</p>
    </div>
  );
}

// ============================================================================
// Loads Table (Completed / Cancelled)
// ============================================================================

function LoadsTable({
  loads,
  onRowClick,
  emptyMessage,
  refData,
}: {
  loads: LoadListItem[];
  onRowClick: (load: LoadListItem) => void;
  emptyMessage: string;
  refData?: ReferenceDataMap;
}) {
  if (loads.length === 0) {
    return (
      <p className="text-center py-16 text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Load #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Stops</TableHead>
          <TableHead>Weight</TableHead>
          <TableHead>Equipment</TableHead>
          <TableHead>Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loads.map((load) => (
          <TableRow
            key={load.load_id}
            className="cursor-pointer"
            onClick={() => onRowClick(load)}
          >
            <TableCell className="font-medium font-mono text-foreground">
              {load.load_number}
            </TableCell>
            <TableCell className="text-foreground">{load.customer_name}</TableCell>
            <TableCell className="text-foreground">{load.stop_count}</TableCell>
            <TableCell className="text-foreground">
              {load.weight_lbs?.toLocaleString()} lbs
            </TableCell>
            <TableCell className="text-foreground capitalize">
              {refData?.equipment_type?.find(item => item.code.toLowerCase() === load.equipment_type?.toLowerCase())?.label
                ?? load.equipment_type?.replace(/_/g, ' ') ?? '—'}
            </TableCell>
            <TableCell>
              <IntakeSourceBadge source={load.intake_source} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// New Load Form (Enhanced)
// ============================================================================

const US_STATES_FALLBACK = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const EQUIPMENT_TYPES_FALLBACK = [
  { code: 'dry_van', label: 'Dry Van' },
  { code: 'reefer', label: 'Reefer' },
  { code: 'flatbed', label: 'Flatbed' },
  { code: 'step_deck', label: 'Step Deck' },
];

function NewLoadForm({
  onSuccess,
  onCancel,
  refData,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  refData?: ReferenceDataMap;
}) {
  const [formData, setFormData] = useState({
    customer_name: '',
    weight_lbs: 0,
    equipment_type: 'dry_van',
    reference_number: '',
    commodity_type: 'general',
    special_requirements: '',
    rate_cents: undefined as number | undefined,
    pieces: undefined as number | undefined,
  });

  const [stops, setStops] = useState<LoadStopCreate[]>([
    {
      stop_id: `STOP-${Date.now().toString(36)}`,
      sequence_order: 1,
      action_type: 'pickup',
      estimated_dock_hours: 2,
      earliest_arrival: '',
      latest_arrival: '',
      name: '',
      city: '',
      state: '',
      zip_code: '',
    },
    {
      stop_id: `STOP-${(Date.now() + 1).toString(36)}`,
      sequence_order: 2,
      action_type: 'delivery',
      estimated_dock_hours: 2,
      earliest_arrival: '',
      latest_arrival: '',
      name: '',
      city: '',
      state: '',
      zip_code: '',
    },
  ]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    customersApi.list().then(setCustomers).catch(() => {});
  }, []);

  const handleCustomerChange = (value: string) => {
    setSelectedCustomerId(value);
    if (value && value !== 'new') {
      const customer = customers.find((c) => String(c.id) === value);
      if (customer) {
        setFormData((prev) => ({ ...prev, customer_name: customer.company_name }));
      }
    }
  };

  const addStop = () => {
    setStops([
      ...stops,
      {
        stop_id: `STOP-${Date.now().toString(36)}`,
        sequence_order: stops.length + 1,
        action_type: 'delivery',
        estimated_dock_hours: 2,
        earliest_arrival: '',
        latest_arrival: '',
        name: '',
        city: '',
        state: '',
        zip_code: '',
      },
    ]);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops.map((s, i) => ({ ...s, sequence_order: i + 1 })));
  };

  const updateStop = (index: number, field: string, value: string | number) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setStops(newStops);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      // Resolve customer — create new Customer record if needed
      let customerId: number | undefined;
      let customerName = formData.customer_name;

      if (selectedCustomerId === 'new') {
        if (!formData.customer_name.trim()) {
          setFormError('Please enter a customer name');
          setIsSubmitting(false);
          return;
        }
        // Create actual Customer record so it appears in Customers tab
        const newCustomer = await customersApi.create({
          company_name: formData.customer_name.trim(),
        });
        customerId = newCustomer.id;
        customerName = newCustomer.company_name;
      } else if (selectedCustomerId) {
        customerId = parseInt(selectedCustomerId);
        const customer = customers.find((c) => String(c.id) === selectedCustomerId);
        customerName = customer?.company_name || '';
      } else {
        setFormError('Please select a customer');
        setIsSubmitting(false);
        return;
      }

      const loadData: LoadCreate = {
        customer_name: customerName,
        weight_lbs: formData.weight_lbs,
        commodity_type: formData.commodity_type,
        equipment_type: formData.equipment_type || undefined,
        special_requirements: formData.special_requirements || undefined,
        reference_number: formData.reference_number || undefined,
        rate_cents: formData.rate_cents || undefined,
        pieces: formData.pieces || undefined,
        customer_id: customerId,
        stops: stops.map((s) => ({
          ...s,
          earliest_arrival: s.earliest_arrival || undefined,
          latest_arrival: s.latest_arrival || undefined,
          zip_code: s.zip_code || undefined,
        })),
      };
      await loadsApi.create(loadData);
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create load');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [expandedStop, setExpandedStop] = useState<number | null>(null);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Core Details */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Customer *</Label>
            <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select or add customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.company_name}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ Add new customer</SelectItem>
              </SelectContent>
            </Select>
            {selectedCustomerId === 'new' && (
              <Input
                className="mt-1.5 h-9"
                value={formData.customer_name}
                onChange={(e) =>
                  setFormData({ ...formData, customer_name: e.target.value })
                }
                placeholder="Enter customer name"
                required
                autoFocus
              />
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Reference / PO #</Label>
            <Input
              className="h-9"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="PO-12345"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Equipment *</Label>
            <Select
              value={formData.equipment_type}
              onValueChange={(v) => setFormData({ ...formData, equipment_type: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(refData?.equipment_type?.map(item => ({ code: item.code.toLowerCase(), label: item.label })) ?? EQUIPMENT_TYPES_FALLBACK).map((et) => (
                  <SelectItem key={et.code} value={et.code}>{et.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Weight (lbs) *</Label>
            <Input
              className="h-9"
              type="number"
              value={formData.weight_lbs || ''}
              onChange={(e) =>
                setFormData({ ...formData, weight_lbs: parseInt(e.target.value) || 0 })
              }
              placeholder="40,000"
              required
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rate ($)</Label>
            <Input
              className="h-9"
              type="number"
              step="0.01"
              min="0"
              placeholder="2,450.00"
              value={formData.rate_cents !== undefined ? (formData.rate_cents / 100).toFixed(2) : ''}
              onChange={(e) => {
                const dollars = parseFloat(e.target.value);
                setFormData({
                  ...formData,
                  rate_cents: isNaN(dollars) ? undefined : Math.round(dollars * 100),
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border" />

      {/* Route — Compact Stops */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Route</h4>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addStop}>
            <Plus className="h-3 w-3 mr-1" />
            Add Stop
          </Button>
        </div>

        <div className="relative">
          {/* Vertical connector line */}
          {stops.length > 1 && (
            <div className="absolute left-[15px] top-[20px] bottom-[20px] w-px bg-border z-0" />
          )}

          <div className="space-y-1.5 relative z-10">
            {stops.map((stop, index) => (
              <div key={index}>
                {/* Compact stop row */}
                <div
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors cursor-pointer group ${
                    expandedStop === index
                      ? 'bg-accent/70'
                      : 'hover:bg-accent/40'
                  }`}
                  onClick={() => setExpandedStop(expandedStop === index ? null : index)}
                >
                  {/* Stop number dot */}
                  <div
                    className={`flex-shrink-0 flex items-center justify-center w-[30px] h-[30px] rounded-full text-xs font-bold ${
                      stop.action_type === 'pickup'
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : stop.action_type === 'both'
                        ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                        : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Stop summary — inline */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-5 flex-shrink-0 ${
                        stop.action_type === 'pickup'
                          ? 'border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                          : stop.action_type === 'both'
                          ? 'border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                          : 'border-green-300 dark:border-green-800 text-green-700 dark:text-green-300'
                      }`}
                    >
                      {stop.action_type === 'pickup' ? 'P' : stop.action_type === 'both' ? 'P/D' : 'D'}
                    </Badge>
                    <span className="text-sm text-foreground truncate">
                      {stop.name || <span className="text-muted-foreground italic">No location</span>}
                    </span>
                    {(stop.city || stop.state) && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {[stop.city, stop.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {(stop.earliest_arrival || stop.latest_arrival) && (
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 font-mono">
                        {stop.earliest_arrival || '?'}–{stop.latest_arrival || '?'}
                      </span>
                    )}
                  </div>

                  {/* Expand indicator + delete */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {stops.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); removeStop(index); }}
                        className="h-6 w-6 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                        expandedStop === index ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded stop details */}
                {expandedStop === index && (
                  <div className="ml-[42px] mt-1 mb-2 p-3 rounded-md border border-border bg-card space-y-3">
                    {/* Row 1: Location + Type */}
                    <div className="grid grid-cols-5 gap-2">
                      <div className="col-span-2">
                        <Label className="text-[11px] text-muted-foreground">Location name *</Label>
                        <Input
                          className="h-8 text-sm"
                          value={stop.name || ''}
                          onChange={(e) => updateStop(index, 'name', e.target.value)}
                          placeholder="Walmart DC #4523"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Type</Label>
                        <Select
                          value={stop.action_type}
                          onValueChange={(v) => updateStop(index, 'action_type', v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pickup">Pickup</SelectItem>
                            <SelectItem value="delivery">Delivery</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Dock hrs</Label>
                        <Input
                          className="h-8 text-sm"
                          type="number"
                          step="0.5"
                          value={stop.estimated_dock_hours}
                          onChange={(e) =>
                            updateStop(index, 'estimated_dock_hours', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">ZIP</Label>
                        <Input
                          className="h-8 text-sm"
                          value={stop.zip_code || ''}
                          onChange={(e) => updateStop(index, 'zip_code', e.target.value)}
                          placeholder="75201"
                          maxLength={10}
                        />
                      </div>
                    </div>

                    {/* Row 2: City, State, Appointment */}
                    <div className="grid grid-cols-5 gap-2">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">City</Label>
                        <Input
                          className="h-8 text-sm"
                          value={stop.city || ''}
                          onChange={(e) => updateStop(index, 'city', e.target.value)}
                          placeholder="Dallas"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">State</Label>
                        <Select
                          value={stop.state || ''}
                          onValueChange={(v) => updateStop(index, 'state', v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {(refData?.us_state?.map(item => ({ code: item.code, label: item.label })) ?? US_STATES_FALLBACK.map(s => ({ code: s, label: s }))).map((st) => (
                              <SelectItem key={st.code} value={st.code}>{st.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[11px] text-muted-foreground">Appointment window</Label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            className="h-8 text-sm font-mono"
                            value={stop.earliest_arrival || ''}
                            onChange={(e) => updateStop(index, 'earliest_arrival', e.target.value)}
                            placeholder="06:00"
                            maxLength={5}
                          />
                          <span className="text-muted-foreground text-xs">–</span>
                          <Input
                            className="h-8 text-sm font-mono"
                            value={stop.latest_arrival || ''}
                            onChange={(e) => updateStop(index, 'latest_arrival', e.target.value)}
                            placeholder="14:00"
                            maxLength={5}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Address</Label>
                        <Input
                          className="h-8 text-sm"
                          value={stop.address || ''}
                          onChange={(e) => updateStop(index, 'address', e.target.value)}
                          placeholder="123 Main St"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border" />

      {/* More Details — collapsed by default */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group uppercase tracking-wide font-medium">
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-90" />
          More Details
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Commodity</Label>
              <Select
                value={formData.commodity_type}
                onValueChange={(v) => setFormData({ ...formData, commodity_type: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="dry_goods">Dry Goods</SelectItem>
                  <SelectItem value="refrigerated">Refrigerated</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                  <SelectItem value="hazmat">Hazmat</SelectItem>
                  <SelectItem value="fragile">Fragile</SelectItem>
                  <SelectItem value="oversized">Oversized</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Pieces / Pallets</Label>
              <Input
                className="h-9"
                type="number"
                min="0"
                placeholder="26"
                value={formData.pieces ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pieces: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Special Requirements</Label>
              <Input
                className="h-9"
                value={formData.special_requirements}
                onChange={(e) =>
                  setFormData({ ...formData, special_requirements: e.target.value })
                }
                placeholder="Temp controlled, team"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {formError && <div className="text-sm text-red-600 dark:text-red-400">{formError}</div>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Load'}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusVariant(
  status: string,
): 'default' | 'muted' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'muted' | 'destructive' | 'outline'> = {
    draft: 'outline',
    pending: 'outline',
    assigned: 'default',
    in_transit: 'default',
    delivered: 'muted',
    cancelled: 'destructive',
  };
  return variants[status] || 'outline';
}

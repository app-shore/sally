'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth';
import { loadsApi } from '@/features/fleet/loads/api';
import { customersApi } from '@/features/fleet/customers/api';
import type { LoadListItem, Load, LoadCreate, LoadStopCreate } from '@/features/fleet/loads/types';
import type { Customer } from '@/features/fleet/customers/types';
import { CustomerList } from '@/features/fleet/customers/components/customer-list';
import { InviteCustomerDialog } from '@/features/fleet/customers/components/invite-customer-dialog';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
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
  Plus,
  Trash2,
  Copy,
  Link2,
  MapPin,
  ArrowRight,
  RefreshCw,
  Upload,
  ChevronDown,
} from 'lucide-react';

// ============================================================================
// Main Page
// ============================================================================

export default function LoadsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loads, setLoads] = useState<LoadListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail panel state
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // New load dialog
  const [isNewLoadOpen, setIsNewLoadOpen] = useState(false);

  // Top-level view: loads vs customers (like Fleet has Drivers | Assets)
  const [activeView, setActiveView] = useState<'loads' | 'customers'>('loads');

  // Customer invite
  const [inviteCustomer, setInviteCustomer] = useState<Customer | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);


  // Group loads by status
  const drafts = loads.filter((l) => l.status === 'draft');
  const readyToPlan = loads.filter((l) => l.status === 'pending');
  const planned = loads.filter((l) => l.status === 'planned');
  const active = loads.filter((l) => ['active', 'in_transit'].includes(l.status));
  const completed = loads.filter((l) => l.status === 'completed');
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
    router.push(`/dispatcher/create-plan?load_id=${loadId}`);
  };

  const handleCreateSuccess = async () => {
    setIsNewLoadOpen(false);
    await fetchLoads();
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
                  <DropdownMenuItem disabled>CSV/Excel Import (Phase 2)</DropdownMenuItem>
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Load</DialogTitle>
                  </DialogHeader>
                  <NewLoadForm
                    onSuccess={handleCreateSuccess}
                    onCancel={() => setIsNewLoadOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </>
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
              <StatPill label="Ready" count={readyToPlan.length} />
              <StatPill label="Planned" count={planned.length} />
              <StatPill label="Active" count={active.length} />
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
                  <TabsTrigger value="completed">
                    Completed ({completed.length})
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
                  title="Ready to Plan"
                  count={readyToPlan.length}
                  loads={readyToPlan}
                  onCardClick={handleCardClick}
                  actionLabel="Plan Route"
                  onAction={(load) => handlePlanRoute(load.load_id)}
                />
                <KanbanColumn
                  title="Planned"
                  count={planned.length}
                  loads={planned}
                  onCardClick={handleCardClick}
                />
                <KanbanColumn
                  title="Active"
                  count={active.length}
                  loads={active}
                  onCardClick={handleCardClick}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="p-4 md:p-6 overflow-auto">
            <LoadsTable
              loads={completed}
              onRowClick={handleCardClick}
              emptyMessage="No completed loads"
            />
          </TabsContent>

          <TabsContent value="cancelled" className="p-4 md:p-6 overflow-auto">
            <LoadsTable
              loads={cancelled}
              onRowClick={handleCardClick}
              emptyMessage="No cancelled loads"
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
        <p className="text-xs text-muted-foreground">
          {load.stop_count} stops &middot; {load.weight_lbs?.toLocaleString()} lbs
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
        {load.status === 'planned' && (
          <>
            <Button
              className="w-full"
              onClick={() => onStatusChange(load.load_id, 'active')}
            >
              Activate
            </Button>
          </>
        )}
        {(load.status === 'active' || load.status === 'in_transit') && (
          <>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onCopyTrackingLink(load.load_id)}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Copy Tracking Link
            </Button>
            <Button
              className="w-full"
              onClick={() => onStatusChange(load.load_id, 'completed')}
            >
              Mark Completed
            </Button>
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
          {!['completed', 'cancelled'].includes(load.status) && (
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
}: {
  loads: LoadListItem[];
  onRowClick: (load: LoadListItem) => void;
  emptyMessage: string;
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
              {load.equipment_type?.replace(/_/g, ' ') || '—'}
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

function NewLoadForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    load_number: '',
    customer_name: '',
    weight_lbs: 0,
    commodity_type: 'general',
    equipment_type: '',
    special_requirements: '',
  });

  const [stops, setStops] = useState<LoadStopCreate[]>([
    {
      stop_id: `STOP-${Date.now().toString(36)}`,
      sequence_order: 1,
      action_type: 'pickup',
      estimated_dock_hours: 2,
      name: '',
      city: '',
      state: '',
    },
    {
      stop_id: `STOP-${(Date.now() + 1).toString(36)}`,
      sequence_order: 2,
      action_type: 'delivery',
      estimated_dock_hours: 2,
      name: '',
      city: '',
      state: '',
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
        name: '',
        city: '',
        state: '',
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
      const loadData: LoadCreate = {
        load_number: formData.load_number,
        customer_name: formData.customer_name,
        weight_lbs: formData.weight_lbs,
        commodity_type: formData.commodity_type,
        equipment_type: formData.equipment_type || undefined,
        special_requirements: formData.special_requirements || undefined,
        customer_id: selectedCustomerId && selectedCustomerId !== 'new'
          ? parseInt(selectedCustomerId)
          : undefined,
        stops,
      };
      await loadsApi.create(loadData);
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create load');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Load Details */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Load Details</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="load_number">Load Number *</Label>
            <Input
              id="load_number"
              value={formData.load_number}
              onChange={(e) => setFormData({ ...formData, load_number: e.target.value })}
              placeholder="e.g. LD-001"
              required
            />
          </div>
          <div>
            <Label>Customer *</Label>
            {customers.length > 0 ? (
              <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ New customer</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.customer_name}
                onChange={(e) =>
                  setFormData({ ...formData, customer_name: e.target.value })
                }
                placeholder="Customer name"
                required
              />
            )}
            {(selectedCustomerId === 'new' || (customers.length > 0 && !selectedCustomerId)) && (
              <Input
                className="mt-2"
                value={formData.customer_name}
                onChange={(e) =>
                  setFormData({ ...formData, customer_name: e.target.value })
                }
                placeholder="Enter customer name"
                required={!selectedCustomerId || selectedCustomerId === 'new'}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="weight_lbs">Weight (lbs) *</Label>
            <Input
              id="weight_lbs"
              type="number"
              value={formData.weight_lbs || ''}
              onChange={(e) =>
                setFormData({ ...formData, weight_lbs: parseInt(e.target.value) || 0 })
              }
              placeholder="40000"
              required
            />
          </div>
          <div>
            <Label>Commodity</Label>
            <Select
              value={formData.commodity_type}
              onValueChange={(v) => setFormData({ ...formData, commodity_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="hazmat">Hazmat</SelectItem>
                <SelectItem value="refrigerated">Refrigerated</SelectItem>
                <SelectItem value="fragile">Fragile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Equipment Type</Label>
            <Select
              value={formData.equipment_type}
              onValueChange={(v) => setFormData({ ...formData, equipment_type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dry_van">Dry Van</SelectItem>
                <SelectItem value="reefer">Reefer</SelectItem>
                <SelectItem value="flatbed">Flatbed</SelectItem>
                <SelectItem value="step_deck">Step Deck</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Special Req.</Label>
            <Input
              value={formData.special_requirements}
              onChange={(e) =>
                setFormData({ ...formData, special_requirements: e.target.value })
              }
              placeholder="Optional"
            />
          </div>
        </div>
      </div>

      {/* Stops */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">Stops ({stops.length})</h4>
          <Button type="button" variant="outline" size="sm" onClick={addStop}>
            <Plus className="h-3 w-3 mr-1" />
            Add Stop
          </Button>
        </div>

        {stops.map((stop, index) => (
          <div key={index} className="p-3 rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                    stop.action_type === 'pickup'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-foreground">
                  Stop {index + 1}
                </span>
              </div>
              {stops.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStop(index)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={stop.action_type}
                  onValueChange={(v) => updateStop(index, 'action_type', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
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
                <Label className="text-xs">Location Name *</Label>
                <Input
                  className="h-8 text-xs"
                  value={stop.name || ''}
                  onChange={(e) => updateStop(index, 'name', e.target.value)}
                  placeholder="Warehouse name"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Dock Hours</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  step="0.5"
                  value={stop.estimated_dock_hours}
                  onChange={(e) =>
                    updateStop(index, 'estimated_dock_hours', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Address</Label>
                <Input
                  className="h-8 text-xs"
                  value={stop.address || ''}
                  onChange={(e) => updateStop(index, 'address', e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input
                  className="h-8 text-xs"
                  value={stop.city || ''}
                  onChange={(e) => updateStop(index, 'city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Input
                  className="h-8 text-xs"
                  value={stop.state || ''}
                  onChange={(e) => updateStop(index, 'state', e.target.value)}
                  placeholder="State"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {formError && <div className="text-sm text-red-600 dark:text-red-400">{formError}</div>}

      <div className="flex justify-end gap-2">
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
    planned: 'muted',
    active: 'default',
    in_transit: 'default',
    completed: 'muted',
    cancelled: 'destructive',
  };
  return variants[status] || 'outline';
}

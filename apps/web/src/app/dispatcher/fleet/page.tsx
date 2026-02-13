'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/features/auth';
import {
  listDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  InviteDriverDialog,
  EditDriverDialog,
  getSourceLabel,
  type Driver,
  type CreateDriverRequest,
} from '@/features/fleet/drivers';
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  type Vehicle,
  type CreateVehicleRequest,
} from '@/features/fleet/vehicles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
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
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
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
import { Progress } from '@/shared/components/ui/progress';
import { formatRelativeTime } from '@/features/integrations';
import { useReferenceData } from '@/features/platform/reference-data';
import type { ReferenceItem } from '@/features/platform/reference-data';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Textarea } from '@/shared/components/ui/textarea';
import { Separator } from '@/shared/components/ui/separator';
import { ChevronDown, Lock, Mail, Plus, RefreshCw, Settings, Package, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/shared/hooks/use-toast';

export default function FleetPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDriver, setInviteDriver] = useState<Driver | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const { data: refData } = useReferenceData(['equipment_type', 'vehicle_status', 'us_state']);

  useEffect(() => {
    // Auth is handled by layout-client, just check role and load data
    if (isAuthenticated && user?.role !== 'DRIVER') {
      loadData();
    }
  }, [isAuthenticated, user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [driversData, vehiclesData] = await Promise.all([
        listDrivers(),
        listVehicles(),
      ]);
      setDrivers(driversData);
      setVehicles(vehiclesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteClick = (driver: Driver) => {
    setInviteDriver(driver);
    setInviteDialogOpen(true);
  };

  if (!isAuthenticated || user?.role === 'DRIVER') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Fleet Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage drivers and assets
        </p>
      </div>

      <Tabs defaultValue="drivers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers">
          <DriversTab
            drivers={drivers}
            isLoading={isLoading}
            error={error}
            onRefresh={loadData}
            onInviteClick={handleInviteClick}
          />
        </TabsContent>

        <TabsContent value="assets">
          <AssetsTab
            vehicles={vehicles}
            isLoading={isLoading}
            error={error}
            onRefresh={loadData}
            refData={refData}
          />
        </TabsContent>
      </Tabs>

      <InviteDriverDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        driver={inviteDriver}
      />
    </div>
  );
}

function DriversTab({
  drivers,
  isLoading,
  error,
  onRefresh,
  onInviteClick,
}: {
  drivers: Driver[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onInviteClick?: (driver: Driver) => void;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (driverId: string) => {
    setDeleteConfirm(null);
    try {
      await deleteDriver(driverId);
      await onRefresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete driver',
      });
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setEditDialogOpen(true);
  };

  const handleCreateSuccess = async () => {
    setIsDialogOpen(false);
    await onRefresh();
  };

  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncDrivers = async () => {
    setIsSyncing(true);
    try {
      await onRefresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Drivers{drivers.length > 0 ? ` (${drivers.length})` : ''}</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Driver</DialogTitle>
            </DialogHeader>
            <DriverForm
              onSuccess={handleCreateSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>

      {drivers.some(d => d.external_source) && (
        <div className="mx-6 mt-4 mb-2">
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100 flex items-center justify-between">
              <span>
                <span className="font-medium">🔗 TMS integration active</span>
                {' '}— Some drivers are synced from your TMS. Synced drivers are read-only. You can still add drivers manually.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncDrivers}
                disabled={isSyncing}
                className="ml-4"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading drivers...</div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={onRefresh}>Retry</Button>
          </div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No drivers yet. Click &quot;Add Driver&quot; to add your first driver.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>CDL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">HOS</TableHead>
                <TableHead className="hidden lg:table-cell">Vehicle</TableHead>
                <TableHead className="hidden lg:table-cell">Current Load</TableHead>
                <TableHead className="hidden md:table-cell">SALLY</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => {
                const driveRemaining = driver.current_hos?.drive_remaining ?? (11 - (driver.current_hours_driven ?? 0));
                const hosPercent = Math.max(0, Math.min(100, (driveRemaining / 11) * 100));

                return (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/dispatcher/fleet/drivers/${driver.driver_id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {driver.name}
                        </Link>
                        {driver.phone && (
                          <div className="text-sm text-muted-foreground">{driver.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {driver.cdl_class ? (
                        <Badge variant="outline">{driver.cdl_class}</Badge>
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={driver.status === 'ACTIVE' ? 'default' : driver.status === 'INACTIVE' ? 'muted' : 'outline'}>
                        {driver.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={hosPercent} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {driveRemaining.toFixed(1)}h
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      Unassigned
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {driver.current_load ? (
                        <span className="text-foreground">{driver.current_load.reference_number}</span>
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {driver.sally_access_status === 'ACTIVE' && (
                        <Badge variant="default">Active</Badge>
                      )}
                      {driver.sally_access_status === 'INVITED' && (
                        <Badge variant="muted">Invited</Badge>
                      )}
                      {driver.sally_access_status === 'DEACTIVATED' && (
                        <Badge variant="destructive">Deactivated</Badge>
                      )}
                      {(!driver.sally_access_status || driver.sally_access_status === 'NO_ACCESS') && (
                        <Badge variant="outline">No Access</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dispatcher/fleet/drivers/${driver.driver_id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(driver)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {driver.external_source ? 'Edit Details' : 'Edit'}
                          </DropdownMenuItem>
                          {(!driver.sally_access_status || driver.sally_access_status === 'NO_ACCESS') && onInviteClick && (
                            <DropdownMenuItem onClick={() => onInviteClick(driver)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Invite to SALLY
                            </DropdownMenuItem>
                          )}
                          {!driver.external_source && (
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirm(driver.driver_id)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Driver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this driver? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingDriver && (
        <EditDriverDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setEditingDriver(null);
              onRefresh();
            }
          }}
          driver={editingDriver}
          externalSource={editingDriver.external_source ? getSourceLabel(editingDriver.external_source) : undefined}
        />
      )}
    </Card>
  );
}

function DriverForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { data: refData } = useReferenceData(['cdl_class', 'us_state', 'endorsement']);
  const cdlClasses = refData?.cdl_class ?? [];
  const usStates = refData?.us_state ?? [];
  const endorsementOptions = refData?.endorsement ?? [];

  const [formData, setFormData] = useState<CreateDriverRequest>({
    name: '',
    phone: '',
    email: '',
    cdl_class: '',
    license_number: '',
    license_state: '',
    endorsements: [],
    hire_date: '',
    medical_card_expiry: '',
    home_terminal_city: '',
    home_terminal_state: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
  });
  const [showMore, setShowMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await createDriver(formData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create driver');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndorsementToggle = (value: string) => {
    const current = formData.endorsements || [];
    if (current.includes(value)) {
      setFormData({ ...formData, endorsements: current.filter((e) => e !== value) });
    } else {
      setFormData({ ...formData, endorsements: [...current, value] });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone *</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cdl_class">CDL Class *</Label>
          <Select
            value={formData.cdl_class}
            onValueChange={(value) => setFormData({ ...formData, cdl_class: value })}
          >
            <SelectTrigger id="cdl_class">
              <SelectValue placeholder="Select CDL class" />
            </SelectTrigger>
            <SelectContent>
              {cdlClasses.map((cdl) => (
                <SelectItem key={cdl.code} value={cdl.code}>
                  {cdl.label} &mdash; {cdl.metadata?.description || ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="license">License Number *</Label>
          <Input
            id="license"
            value={formData.license_number}
            onChange={(e) =>
              setFormData({ ...formData, license_number: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="license_state">License State</Label>
          <Select
            value={formData.license_state || ''}
            onValueChange={(value) => setFormData({ ...formData, license_state: value })}
          >
            <SelectTrigger id="license_state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {usStates.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.label} ({state.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Collapsible open={showMore} onOpenChange={setShowMore}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between text-muted-foreground hover:text-foreground"
          >
            More Details
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {/* Endorsements */}
          <div>
            <Label>Endorsements</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {endorsementOptions.map((opt) => (
                <div key={opt.code} className="flex items-center gap-2">
                  <Checkbox
                    id={`create-endorsement-${opt.code}`}
                    checked={(formData.endorsements || []).includes(opt.code)}
                    onCheckedChange={() => handleEndorsementToggle(opt.code)}
                  />
                  <Label htmlFor={`create-endorsement-${opt.code}`} className="text-sm font-normal cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Compliance Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create-hire-date">Hire Date</Label>
              <Input
                id="create-hire-date"
                type="date"
                value={formData.hire_date || ''}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="create-medical">Medical Card Expiry</Label>
              <Input
                id="create-medical"
                type="date"
                value={formData.medical_card_expiry || ''}
                onChange={(e) => setFormData({ ...formData, medical_card_expiry: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          {/* Home Terminal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create-city">Home Terminal City</Label>
              <Input
                id="create-city"
                value={formData.home_terminal_city || ''}
                onChange={(e) => setFormData({ ...formData, home_terminal_city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="create-terminal-state">Home Terminal State</Label>
              <Select
                value={formData.home_terminal_state || ''}
                onValueChange={(value) => setFormData({ ...formData, home_terminal_state: value })}
              >
                <SelectTrigger id="create-terminal-state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {usStates.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.label} ({state.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Emergency Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create-ec-name">Emergency Contact Name</Label>
              <Input
                id="create-ec-name"
                value={formData.emergency_contact_name || ''}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="create-ec-phone">Emergency Contact Phone</Label>
              <Input
                id="create-ec-phone"
                type="tel"
                value={formData.emergency_contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <Label htmlFor="create-notes">Notes</Label>
            <Textarea
              id="create-notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Add notes about this driver..."
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

function AssetsTab({
  vehicles,
  isLoading,
  error,
  onRefresh,
  refData,
}: {
  vehicles: Vehicle[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  refData?: Record<string, ReferenceItem[]>;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'trucks' | 'trailers' | 'equipment'>('trucks');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (vehicleId: string) => {
    setDeleteConfirm(null);
    try {
      await deleteVehicle(vehicleId);
      await onRefresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete vehicle',
      });
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVehicle(null);
  };

  const handleSuccess = async () => {
    handleCloseDialog();
    await onRefresh();
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncVehicles = async () => {
    setIsSyncing(true);
    try {
      await onRefresh();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Assets</CardTitle>

          {/* Add Truck Dialog - Only show when on Trucks tab */}
          {activeSubTab === 'trucks' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => setEditingVehicle(null)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Truck
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {editingVehicle ? 'Edit Truck' : 'Add Truck'}
                    {editingVehicle?.external_source && (
                      <Badge variant="muted" className="text-xs font-normal gap-1">
                        <Lock className="h-3 w-3" />
                        Synced from {getSourceLabel(editingVehicle.external_source)}
                      </Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <VehicleForm
                  vehicle={editingVehicle}
                  onSuccess={handleSuccess}
                  onCancel={handleCloseDialog}
                  refData={refData}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Segmented Control for Asset Types */}
        <div className="mt-4">
          <div className="inline-flex items-center rounded-lg border border-border p-1 bg-muted">
            <Button
              variant={activeSubTab === 'trucks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSubTab('trucks')}
              className="gap-1.5"
            >
              <Package className="h-4 w-4" />
              Trucks
            </Button>
            <Button
              variant={activeSubTab === 'trailers' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSubTab('trailers')}
              className="gap-1.5"
            >
              <Package className="h-4 w-4" />
              Trailers
            </Button>
            <Button
              variant={activeSubTab === 'equipment' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSubTab('equipment')}
              className="gap-1.5"
            >
              <Settings className="h-4 w-4" />
              Equipment
            </Button>
          </div>
        </div>
      </CardHeader>

      {activeSubTab === 'trucks' && vehicles.some(v => v.external_source) && (
        <div className="mx-6 mt-2 mb-2">
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100 flex items-center justify-between">
              <span>
                <span className="font-medium">🔗 TMS integration active</span>
                {' '}— Some trucks are synced from your TMS. Vehicle details are managed by your TMS — operational fields can be edited locally.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncVehicles}
                disabled={isSyncing}
                className="ml-4"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <CardContent>
        {activeSubTab === 'trucks' && (
          <>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading trucks...</div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                <Button onClick={onRefresh}>Retry</Button>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No trucks yet. Click &quot;Add Truck&quot; to add your first truck.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Make/Model</TableHead>
                    <TableHead>Fuel / MPG</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium text-foreground">
                        {vehicle.unit_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {formatEquipmentType(vehicle.equipment_type, refData)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {vehicle.make && vehicle.model
                          ? `${vehicle.make} ${vehicle.model}`
                          : vehicle.make || vehicle.model || '—'}
                      </TableCell>
                      <TableCell className="text-foreground text-sm">
                        {vehicle.fuel_capacity_gallons} gal
                        {vehicle.mpg ? ` · ${vehicle.mpg} mpg` : ''}
                      </TableCell>
                      <TableCell>
                        <VehicleStatusBadge status={vehicle.status} refData={refData} />
                      </TableCell>
                      <TableCell>
                        {vehicle.external_source ? (
                          <Badge variant="muted" className="gap-1">
                            <span className="text-xs">🔗</span>
                            {getSourceLabel(vehicle.external_source)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <span className="text-xs">✋</span>
                            Manual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(vehicle)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {!vehicle.external_source && (
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirm(vehicle.vehicle_id)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                            {vehicle.external_source && (
                              <DropdownMenuItem disabled>
                                <Lock className="h-4 w-4 mr-2" />
                                Synced from {getSourceLabel(vehicle.external_source)}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}

        {activeSubTab === 'trailers' && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Trailer Tracking</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Track trailers, monitor availability, and sync trailer data from your TMS integration.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </div>
        )}

        {activeSubTab === 'equipment' && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Equipment Management</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Manage specialized equipment like reefer units, tarps, and other fleet assets.
            </p>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function VehicleForm({
  vehicle,
  onSuccess,
  onCancel,
  refData,
}: {
  vehicle: Vehicle | null;
  onSuccess: () => void;
  onCancel: () => void;
  refData?: Record<string, ReferenceItem[]>;
}) {
  const isTmsSynced = !!vehicle?.external_source;

  const [formData, setFormData] = useState<CreateVehicleRequest>({
    unit_number: vehicle?.unit_number || '',
    vin: vehicle?.vin || '',
    equipment_type: vehicle?.equipment_type || undefined as any,
    fuel_capacity_gallons: vehicle?.fuel_capacity_gallons || ('' as any),
    mpg: vehicle?.mpg || undefined,
    status: vehicle?.status || 'AVAILABLE',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year || undefined,
    license_plate: vehicle?.license_plate || '',
    license_plate_state: vehicle?.license_plate_state || '',
    has_sleeper_berth: vehicle?.has_sleeper_berth ?? true,
    gross_weight_lbs: vehicle?.gross_weight_lbs || undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  // Auto-expand "More Details" when editing a vehicle that has optional fields filled
  useEffect(() => {
    if (vehicle && (vehicle.make || vehicle.model || vehicle.license_plate)) {
      setShowMore(true);
    }
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // VIN validation — only for manual vehicles (TMS-synced can't change VIN)
    if (!isTmsSynced) {
      const cleanVin = formData.vin?.toUpperCase().replace(/\s/g, '') || '';
      if (cleanVin.length !== 17) {
        setError('VIN must be exactly 17 characters');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (vehicle) {
        if (isTmsSynced) {
          // TMS-synced: only send operational fields (exclude identity fields managed by TMS)
          await updateVehicle(vehicle.vehicle_id, {
            equipment_type: formData.equipment_type,
            fuel_capacity_gallons: formData.fuel_capacity_gallons,
            mpg: formData.mpg,
            status: formData.status,
            has_sleeper_berth: formData.has_sleeper_berth,
            gross_weight_lbs: formData.gross_weight_lbs,
          });
        } else {
          await updateVehicle(vehicle.vehicle_id, {
            ...formData,
            vin: formData.vin?.toUpperCase().replace(/\s/g, ''),
            make: formData.make || undefined,
            model: formData.model || undefined,
            license_plate: formData.license_plate || undefined,
            license_plate_state: formData.license_plate_state || undefined,
          });
        }
      } else {
        await createVehicle({
          ...formData,
          vin: formData.vin?.toUpperCase().replace(/\s/g, '') || '',
          make: formData.make || undefined,
          model: formData.model || undefined,
          license_plate: formData.license_plate || undefined,
          license_plate_state: formData.license_plate_state || undefined,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const equipmentTypes = refData?.equipment_type?.map((item) => ({
    value: item.code,
    label: item.label,
  })) || [
    { value: 'DRY_VAN', label: 'Dry Van' },
    { value: 'FLATBED', label: 'Flatbed' },
    { value: 'REEFER', label: 'Reefer' },
    { value: 'STEP_DECK', label: 'Step Deck' },
    { value: 'POWER_ONLY', label: 'Power Only' },
    { value: 'OTHER', label: 'Other' },
  ];

  const usStates = refData?.us_state?.map((item) => item.code) || [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
    'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
    'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
    'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* === Essential Fields === */}
      <div>
        <Label htmlFor="unit_number">Unit Number *</Label>
        <Input
          id="unit_number"
          value={formData.unit_number}
          onChange={(e) =>
            setFormData({ ...formData, unit_number: e.target.value })
          }
          placeholder="e.g. TRUCK-101"
          required
          disabled={isTmsSynced}
        />
      </div>

      <div>
        <Label htmlFor="vin">VIN *</Label>
        <Input
          id="vin"
          value={formData.vin}
          onChange={(e) =>
            setFormData({ ...formData, vin: e.target.value.toUpperCase().replace(/\s/g, '') })
          }
          placeholder="17-character VIN"
          maxLength={17}
          required
          disabled={isTmsSynced}
        />
        {!isTmsSynced && formData.vin && formData.vin.length > 0 && formData.vin.length !== 17 && (
          <p className="text-xs text-muted-foreground mt-1">
            {formData.vin.length}/17 characters
          </p>
        )}
      </div>

      {isTmsSynced && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Unit number and VIN are managed by your TMS integration
        </p>
      )}

      <div>
        <Label htmlFor="equipment_type">Equipment Type *</Label>
        <Select
          value={formData.equipment_type}
          onValueChange={(value) =>
            setFormData({ ...formData, equipment_type: value as any })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select equipment type" />
          </SelectTrigger>
          <SelectContent>
            {equipmentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fuel_capacity">Fuel Capacity (gal) *</Label>
          <Input
            id="fuel_capacity"
            type="number"
            step="1"
            min="1"
            max="500"
            value={formData.fuel_capacity_gallons || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                fuel_capacity_gallons: parseFloat(e.target.value) || ('' as any),
              })
            }
            placeholder="e.g. 150"
            required
          />
        </div>

        <div>
          <Label htmlFor="mpg">MPG</Label>
          <Input
            id="mpg"
            type="number"
            step="0.1"
            min="1"
            max="20"
            value={formData.mpg || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                mpg: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            placeholder="e.g. 6.5"
          />
        </div>
      </div>

      <div>
        <Label className="mb-3 block">Status</Label>
        <RadioGroup
          value={formData.status || 'AVAILABLE'}
          onValueChange={(value) =>
            setFormData({ ...formData, status: value as any })
          }
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="AVAILABLE" id="status-available" />
            <Label htmlFor="status-available" className="font-normal cursor-pointer">
              Available
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="IN_SHOP" id="status-in-shop" />
            <Label htmlFor="status-in-shop" className="font-normal cursor-pointer">
              In Shop
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="OUT_OF_SERVICE" id="status-oos" />
            <Label htmlFor="status-oos" className="font-normal cursor-pointer">
              Out of Service
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* === More Details (Collapsible) === */}
      <Collapsible open={showMore} onOpenChange={setShowMore}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between text-muted-foreground hover:text-foreground"
          >
            More Details
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {isTmsSynced && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Vehicle info and registration are managed by your TMS integration
            </p>
          )}

          {/* Vehicle Info */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Vehicle Info
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) =>
                    setFormData({ ...formData, make: e.target.value })
                  }
                  placeholder="e.g. Freightliner"
                  disabled={isTmsSynced}
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  placeholder="e.g. Cascadia"
                  disabled={isTmsSynced}
                />
              </div>
            </div>
            <div className="w-1/2 pr-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min="1990"
                max={new Date().getFullYear() + 1}
                value={formData.year || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    year: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="e.g. 2024"
                disabled={isTmsSynced}
              />
            </div>
          </div>

          {/* Registration */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Registration
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="license_plate">License Plate</Label>
                <Input
                  id="license_plate"
                  value={formData.license_plate}
                  onChange={(e) =>
                    setFormData({ ...formData, license_plate: e.target.value })
                  }
                  placeholder="e.g. ABC-1234"
                  disabled={isTmsSynced}
                />
              </div>
              <div>
                <Label htmlFor="license_plate_state">State</Label>
                <Select
                  value={formData.license_plate_state}
                  onValueChange={(value) =>
                    setFormData({ ...formData, license_plate_state: value })
                  }
                  disabled={isTmsSynced}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {usStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Specifications
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="has_sleeper_berth"
                  checked={formData.has_sleeper_berth ?? true}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, has_sleeper_berth: !!checked })
                  }
                />
                <Label htmlFor="has_sleeper_berth" className="font-normal cursor-pointer">
                  Has Sleeper Berth
                </Label>
              </div>
              <div>
                <Label htmlFor="gross_weight_lbs">GVW (lbs)</Label>
                <Input
                  id="gross_weight_lbs"
                  type="number"
                  min="10000"
                  max="80000"
                  value={formData.gross_weight_lbs || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gross_weight_lbs: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="e.g. 80000"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : vehicle ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

function VehicleStatusBadge({ status, refData }: { status: string; refData?: Record<string, ReferenceItem[]> }) {
  const statusItem = refData?.vehicle_status?.find((item) => item.code === status);
  const label = statusItem?.label || status;
  const color = (statusItem?.metadata as any)?.color;

  const colorClasses: Record<string, string> = {
    green: 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-transparent',
    amber: 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400',
    red: 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-400',
  };

  if (color === 'blue') {
    return <Badge className={colorClasses[color]}>{label}</Badge>;
  }

  return (
    <Badge variant="outline" className={colorClasses[color] || ''}>
      {label}
    </Badge>
  );
}

function formatEquipmentType(type: string, refData?: Record<string, ReferenceItem[]>): string {
  const item = refData?.equipment_type?.find((item) => item.code === type);
  if (item) return item.label;
  const labels: Record<string, string> = {
    DRY_VAN: 'Dry Van',
    FLATBED: 'Flatbed',
    REEFER: 'Reefer',
    STEP_DECK: 'Step Deck',
    POWER_ONLY: 'Power Only',
    OTHER: 'Other',
  };
  return labels[type] || type;
}


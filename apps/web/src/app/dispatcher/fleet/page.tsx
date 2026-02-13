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
import { formatRelativeTime } from '@/features/integrations';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { ChevronDown, Lock, Plus, RefreshCw, Settings, Package } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

export default function FleetPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDriver, setInviteDriver] = useState<Driver | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

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
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDriver(null);
  };

  const handleSuccess = async () => {
    handleCloseDialog();
    await onRefresh();
  };

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
        <CardTitle>Drivers</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingDriver(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDriver ? 'Edit Driver' : 'Add Driver'}
              </DialogTitle>
            </DialogHeader>
            <DriverForm
              driver={editingDriver}
              onSuccess={handleSuccess}
              onCancel={handleCloseDialog}
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
                <TableHead>Name</TableHead>
                <TableHead>License Number</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>SALLY Access</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{driver.name}</div>
                      {driver.phone && (
                        <div className="text-sm text-muted-foreground">{driver.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">{driver.license_number}</TableCell>
                  <TableCell>
                    {driver.external_source ? (
                      <Badge variant="muted" className="gap-1">
                        <span className="text-xs">🔗</span>
                        {getSourceLabel(driver.external_source)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <span className="text-xs">✋</span>
                        Manual
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {driver.sally_access_status === 'ACTIVE' && (
                      <Badge variant="default">Active</Badge>
                    )}
                    {driver.sally_access_status === 'INVITED' && (
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
                    {driver.sally_access_status === 'DEACTIVATED' && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Deactivated</Badge>
                      </div>
                    )}
                    {(!driver.sally_access_status || driver.sally_access_status === 'NO_ACCESS') && (
                      onInviteClick ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onInviteClick(driver)}
                        >
                          Invite to SALLY
                        </Button>
                      ) : (
                        <Badge variant="outline">No Access</Badge>
                      )
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {driver.last_synced_at ? formatRelativeTime(driver.last_synced_at) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    {driver.external_source ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="opacity-50 cursor-not-allowed"
                          title={`Read-only - synced from ${getSourceLabel(driver.external_source)}`}
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled
                          className="opacity-50 cursor-not-allowed"
                          title={`Read-only - synced from ${getSourceLabel(driver.external_source)}`}
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(driver)}
                          className="mr-2"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteConfirm(driver.driver_id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
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
    </Card>
  );
}

function DriverForm({
  driver,
  onSuccess,
  onCancel,
}: {
  driver: Driver | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<CreateDriverRequest>({
    name: driver?.name || '',
    license_number: driver?.license_number || '',
    phone: driver?.phone || '',
    email: driver?.email || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (driver) {
        await updateDriver(driver.driver_id, formData);
      } else {
        await createDriver(formData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save driver');
    } finally {
      setIsSubmitting(false);
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

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : driver ? 'Update' : 'Create'}
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
}: {
  vehicles: Vehicle[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
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
                  <DialogTitle>
                    {editingVehicle ? 'Edit Truck' : 'Add Truck'}
                  </DialogTitle>
                </DialogHeader>
                <VehicleForm
                  vehicle={editingVehicle}
                  onSuccess={handleSuccess}
                  onCancel={handleCloseDialog}
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
                {' '}— Some trucks are synced from your TMS. Synced trucks are read-only. You can still add trucks manually.
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
                          {formatEquipmentType(vehicle.equipment_type)}
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
                        <VehicleStatusBadge status={vehicle.status} />
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
                        {vehicle.external_source ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              className="opacity-50 cursor-not-allowed"
                              title={`Read-only - synced from ${getSourceLabel(vehicle.external_source)}`}
                            >
                              <Lock className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled
                              className="opacity-50 cursor-not-allowed"
                              title={`Read-only - synced from ${getSourceLabel(vehicle.external_source)}`}
                            >
                              <Lock className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(vehicle)}
                              className="mr-2"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirm(vehicle.vehicle_id)}
                            >
                              Delete
                            </Button>
                          </>
                        )}
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
}: {
  vehicle: Vehicle | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
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

    // VIN validation
    const cleanVin = formData.vin?.toUpperCase().replace(/\s/g, '') || '';
    if (cleanVin.length !== 17) {
      setError('VIN must be exactly 17 characters');
      setIsSubmitting(false);
      return;
    }

    const submitData = {
      ...formData,
      vin: cleanVin,
      // Clean up empty optional strings
      make: formData.make || undefined,
      model: formData.model || undefined,
      license_plate: formData.license_plate || undefined,
      license_plate_state: formData.license_plate_state || undefined,
    };

    try {
      if (vehicle) {
        await updateVehicle(vehicle.vehicle_id, submitData);
      } else {
        await createVehicle(submitData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const equipmentTypes = [
    { value: 'DRY_VAN', label: 'Dry Van' },
    { value: 'FLATBED', label: 'Flatbed' },
    { value: 'REEFER', label: 'Reefer' },
    { value: 'STEP_DECK', label: 'Step Deck' },
    { value: 'POWER_ONLY', label: 'Power Only' },
    { value: 'OTHER', label: 'Other' },
  ];

  const usStates = [
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
        />
        {formData.vin && formData.vin.length > 0 && formData.vin.length !== 17 && (
          <p className="text-xs text-muted-foreground mt-1">
            {formData.vin.length}/17 characters
          </p>
        )}
      </div>

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
                />
              </div>
              <div>
                <Label htmlFor="license_plate_state">State</Label>
                <Select
                  value={formData.license_plate_state}
                  onValueChange={(value) =>
                    setFormData({ ...formData, license_plate_state: value })
                  }
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

function VehicleStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'AVAILABLE':
      return (
        <Badge variant="outline" className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-400">
          Available
        </Badge>
      );
    case 'ASSIGNED':
      return (
        <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-transparent">
          Assigned
        </Badge>
      );
    case 'IN_SHOP':
      return (
        <Badge variant="outline" className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
          In Shop
        </Badge>
      );
    case 'OUT_OF_SERVICE':
      return (
        <Badge variant="outline" className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-400">
          Out of Service
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatEquipmentType(type: string): string {
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

/**
 * Helper function to get human-readable source labels for drivers
 */
function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    mock_samsara: 'Samsara ELD',
    mock_truckbase_tms: 'Truckbase TMS',
    samsara_eld: 'Samsara ELD',
    keeptruckin_eld: 'KeepTruckin',
    motive_eld: 'Motive',
    mcleod_tms: 'McLeod',
  };
  return labels[source] || source;
}

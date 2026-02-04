'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import {
  listDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  type Driver,
  type CreateDriverRequest,
} from '@/lib/api/drivers';
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  type Vehicle,
  type CreateVehicleRequest,
} from '@/lib/api/vehicles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatRelativeTime } from '@/lib/api/integrations';
import { getLoads, getLoad } from '@/lib/api/loads';
import type { LoadListItem, Load } from '@/lib/types/load';
import { Lock, Plus, RefreshCw, ChevronDown, ChevronRight, MapPin } from 'lucide-react';

export default function FleetPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isAuthenticated, user } = useSessionStore();

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

  if (!isAuthenticated || user?.role === 'DRIVER') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Fleet Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage drivers, vehicles, and load assignments
        </p>
      </div>

      <Tabs defaultValue="drivers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="loads">Loads</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers">
          <DriversTab
            drivers={drivers}
            isLoading={isLoading}
            error={error}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="vehicles">
          <VehiclesTab
            vehicles={vehicles}
            isLoading={isLoading}
            error={error}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="loads">
          <LoadsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DriversTab({
  drivers,
  isLoading,
  error,
  onRefresh,
}: {
  drivers: Driver[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const handleDelete = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) {
      return;
    }

    try {
      await deleteDriver(driverId);
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete driver');
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
      alert('Sync failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
            <Button
              onClick={() => setEditingDriver(null)}
              disabled
              className="opacity-50 cursor-not-allowed"
              title="Add Driver disabled - PUSH capability required"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                <span className="font-medium">🔗 One-way PULL integration active</span>
                {' '}— Drivers synced from Truckbase TMS. Edit/delete/add disabled (read-only).
                <span className="text-blue-700 dark:text-blue-300"> PUSH capability required for modifications.</span>
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
            No drivers found. Add your first driver to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>License Number</TableHead>
                <TableHead>Source</TableHead>
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
                          onClick={() => handleDelete(driver.driver_id)}
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
        await updateDriver(driver.id, formData);
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

function VehiclesTab({
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      await deleteVehicle(vehicleId);
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete vehicle');
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
      alert('Sync failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Vehicles</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingVehicle(null)}
              disabled
              className="opacity-50 cursor-not-allowed"
              title="Add Vehicle disabled - PUSH capability required"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
              </DialogTitle>
            </DialogHeader>
            <VehicleForm
              vehicle={editingVehicle}
              onSuccess={handleSuccess}
              onCancel={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>

      {vehicles.some(v => v.external_source) && (
        <div className="mx-6 mt-4 mb-2">
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100 flex items-center justify-between">
              <span>
                <span className="font-medium">🔗 One-way PULL integration active</span>
                {' '}— Vehicles synced from Truckbase TMS. Edit/delete/add disabled (read-only).
                <span className="text-blue-700 dark:text-blue-300"> PUSH capability required for modifications.</span>
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
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading vehicles...</div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={onRefresh}>Retry</Button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No vehicles found. Add your first vehicle to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit Number</TableHead>
                <TableHead>Make/Model</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Fuel Capacity</TableHead>
                <TableHead>MPG</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium text-foreground">{vehicle.unit_number}</TableCell>
                  <TableCell className="text-foreground">
                    {vehicle.make && vehicle.model
                      ? `${vehicle.make} ${vehicle.model}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-foreground">{vehicle.year || '-'}</TableCell>
                  <TableCell className="text-foreground">{vehicle.fuel_capacity_gallons} gal</TableCell>
                  <TableCell className="text-foreground">{vehicle.mpg ? `${vehicle.mpg} mpg` : '-'}</TableCell>
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
                  <TableCell className="text-muted-foreground text-sm">
                    {vehicle.last_synced_at ? formatRelativeTime(vehicle.last_synced_at) : 'Never'}
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
                          onClick={() => handleDelete(vehicle.vehicle_id)}
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
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year || undefined,
    fuel_capacity_gallons: vehicle?.fuel_capacity_gallons || 0,
    current_fuel_gallons: vehicle?.current_fuel_gallons || undefined,
    mpg: vehicle?.mpg || undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (vehicle) {
        await updateVehicle(vehicle.id, formData);
      } else {
        await createVehicle(formData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="unit_number">Unit Number *</Label>
        <Input
          id="unit_number"
          value={formData.unit_number}
          onChange={(e) =>
            setFormData({ ...formData, unit_number: e.target.value })
          }
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="make">Make</Label>
          <Input
            id="make"
            value={formData.make}
            onChange={(e) => setFormData({ ...formData, make: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            value={formData.year || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                year: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
        </div>

        <div>
          <Label htmlFor="vin">VIN</Label>
          <Input
            id="vin"
            value={formData.vin}
            onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fuel_capacity">Fuel Capacity (gal) *</Label>
          <Input
            id="fuel_capacity"
            type="number"
            step="0.1"
            value={formData.fuel_capacity_gallons || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                fuel_capacity_gallons: parseFloat(e.target.value) || 0,
              })
            }
            required
          />
        </div>

        <div>
          <Label htmlFor="mpg">MPG</Label>
          <Input
            id="mpg"
            type="number"
            step="0.1"
            value={formData.mpg || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                mpg: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

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

/**
 * Loads Tab Component - Displays TMS Load Data with Expandable Stop Details
 */
function LoadsTab() {
  const [loads, setLoads] = useState<LoadListItem[]>([]);
  const [expandedLoads, setExpandedLoads] = useState<Map<number, Load>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadLoadsData();
  }, []);

  const loadLoadsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadsData = await getLoads();
      setLoads(loadsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load loads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncLoads = async () => {
    setIsSyncing(true);
    try {
      await loadLoadsData();
    } catch (err) {
      alert('Sync failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleLoadExpansion = async (load: LoadListItem) => {
    const isExpanded = expandedLoads.has(load.id);

    if (isExpanded) {
      // Collapse - remove from expanded map
      const newExpanded = new Map(expandedLoads);
      newExpanded.delete(load.id);
      setExpandedLoads(newExpanded);
    } else {
      // Expand - fetch details if not already loaded
      if (!expandedLoads.has(load.id)) {
        setLoadingDetails(new Set(loadingDetails).add(load.id));
        try {
          const loadDetails = await getLoad(load.load_id);
          const newExpanded = new Map(expandedLoads);
          newExpanded.set(load.id, loadDetails);
          setExpandedLoads(newExpanded);
        } catch (err) {
          alert('Failed to load details: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
          const newLoading = new Set(loadingDetails);
          newLoading.delete(load.id);
          setLoadingDetails(newLoading);
        }
      } else {
        // Already loaded, just expand
        const newExpanded = new Map(expandedLoads);
        newExpanded.set(load.id, expandedLoads.get(load.id)!);
        setExpandedLoads(newExpanded);
      }
    }
  };

  function getStatusVariant(status: string): "default" | "muted" | "destructive" | "outline" {
    const variants: Record<string, "default" | "muted" | "destructive" | "outline"> = {
      pending: "outline",      // Gray - Not yet planned
      planned: "muted",    // Light gray - Planned but not started
      active: "muted",     // Light gray - At dock/loading/unloading
      in_transit: "default",   // Blue - Actively moving on road
      completed: "muted",  // Light gray - Delivered
      cancelled: "destructive", // Red - Cancelled
    };
    return variants[status] || "outline";
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Loads</CardTitle>
          <Button disabled className="opacity-50 cursor-not-allowed">
            <Plus className="h-4 w-4 mr-2" />
            Add Load
          </Button>
        </div>
      </CardHeader>

      <div className="mx-6 mt-2 mb-4">
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <AlertDescription className="text-sm text-blue-900 dark:text-blue-100 flex items-center justify-between">
            <span>
              <span className="font-medium">🔗 One-way PULL integration</span>
              {' '}— Loads synced from Truckbase TMS. Read-only display.
              <span className="text-blue-700 dark:text-blue-300"> PUSH capability required for modifications.</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncLoads}
              disabled={isSyncing}
              className="ml-4"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          </AlertDescription>
        </Alert>
      </div>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading loads...</div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={loadLoadsData}>Retry</Button>
          </div>
        ) : loads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No loads found. Loads will sync automatically from your TMS integration.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Load #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loads.map((load) => {
                const isExpanded = expandedLoads.has(load.id);
                const loadDetails = expandedLoads.get(load.id);
                const isLoadingDetails = loadingDetails.has(load.id);

                return (
                  <>
                    <TableRow
                      key={load.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleLoadExpansion(load)}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLoadExpansion(load);
                          }}
                        >
                          {isLoadingDetails ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {load.load_number}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {load.customer_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(load.status)}>
                          {load.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {load.stop_count} {load.stop_count === 1 ? 'stop' : 'stops'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {load.weight_lbs.toLocaleString()} lbs
                      </TableCell>
                      <TableCell className="text-foreground">
                        {load.commodity_type}
                      </TableCell>
                      <TableCell>
                        {load.external_source ? (
                          <Badge variant="muted" className="gap-1">
                            <span className="text-xs">🔗</span>
                            {getSourceLabel(load.external_source)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <span className="text-xs">✋</span>
                            Manual
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expandable Stop Details Row */}
                    {isExpanded && loadDetails && (
                      <TableRow key={`${load.id}-details`}>
                        <TableCell colSpan={8} className="bg-muted/30 p-0">
                          <div className="p-6 space-y-4 animate-in fade-in-50 slide-in-from-top-2 duration-200">
                            {/* Load Details Header */}
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-foreground">
                                  Load Details
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {loadDetails.special_requirements || 'No special requirements'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Total Weight</p>
                                <p className="text-sm font-medium text-foreground">
                                  {loadDetails.weight_lbs.toLocaleString()} lbs
                                </p>
                              </div>
                            </div>

                            {/* Stops Timeline */}
                            <div className="space-y-3">
                              <h5 className="text-xs font-medium text-foreground uppercase tracking-wide">
                                Route Timeline ({loadDetails.stops.length} stops)
                              </h5>
                              <div className="space-y-2">
                                {loadDetails.stops.map((stop, index) => (
                                  <div
                                    key={stop.id}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border hover:border-foreground/20 transition-colors"
                                  >
                                    {/* Stop Number & Icon */}
                                    <div className="flex flex-col items-center gap-1 min-w-[48px]">
                                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${
                                        stop.action_type === 'pickup'
                                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                          : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                                      }`}>
                                        {index + 1}
                                      </div>
                                      {index < loadDetails.stops.length - 1 && (
                                        <div className="w-0.5 h-6 bg-border" />
                                      )}
                                    </div>

                                    {/* Stop Details */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1 flex-1">
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              variant={stop.action_type === 'pickup' ? 'default' : 'muted'}
                                              className="text-xs"
                                            >
                                              {stop.action_type === 'pickup' ? '📦 Pickup' : '📍 Delivery'}
                                            </Badge>
                                            <span className="text-sm font-medium text-foreground">
                                              {stop.stop_name || 'Stop Location'}
                                            </span>
                                          </div>
                                          {stop.stop_address && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                              <MapPin className="h-3 w-3" />
                                              {stop.stop_address}, {stop.stop_city}, {stop.stop_state}
                                            </p>
                                          )}
                                        </div>

                                        <div className="text-right space-y-1 min-w-[140px]">
                                          {stop.earliest_arrival && stop.latest_arrival && (
                                            <p className="text-xs text-muted-foreground">
                                              Window: {stop.earliest_arrival} - {stop.latest_arrival}
                                            </p>
                                          )}
                                          <p className="text-xs font-medium text-foreground">
                                            Dock: {stop.estimated_dock_hours}h
                                            {stop.actual_dock_hours && (
                                              <span className="text-muted-foreground">
                                                {' '}(actual: {stop.actual_dock_hours}h)
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
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

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { formatRelativeTime } from '@/features/integrations';
import { getLoads, getLoad, createLoad } from '@/features/fleet/loads';
import type { LoadListItem, Load, LoadCreate, LoadStopCreate } from '@/features/fleet/loads';
import { loadsApi } from '@/features/fleet/loads';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Lock, Plus, Trash2, RefreshCw, ChevronDown, ChevronRight, MapPin, Settings, Package } from 'lucide-react';

export default function FleetPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDriver, setInviteDriver] = useState<Driver | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const router = useRouter();
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
          Manage drivers, assets, and load assignments
        </p>
      </div>

      <Tabs defaultValue="drivers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="loads">Loads</TabsTrigger>
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

        <TabsContent value="loads">
          <LoadsTab />
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
            <Button onClick={() => setEditingDriver(null)}>
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
                      <Badge variant="muted">Invited</Badge>
                    )}
                    {driver.sally_access_status === 'DEACTIVATED' && (
                      <Badge variant="destructive">Deactivated</Badge>
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
              <DialogContent>
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
        await updateVehicle(vehicle.vehicle_id, formData);
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
 * Loads Tab Component - Displays Load Data with Expandable Stop Details
 */
function LoadsTab() {
  const [loads, setLoads] = useState<LoadListItem[]>([]);
  const [expandedLoads, setExpandedLoads] = useState<Map<number, Load>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

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

  const handleStatusChange = async (loadId: string, newStatus: string) => {
    setUpdatingStatus(loadId);
    try {
      await loadsApi.updateStatus(loadId, newStatus);
      await loadLoadsData();
      // Refresh expanded details if this load was expanded
      const expandedEntry = Array.from(expandedLoads.entries()).find(
        ([, details]) => details.load_id === loadId
      );
      if (expandedEntry) {
        const loadDetails = await getLoad(loadId);
        const newExpanded = new Map(expandedLoads);
        newExpanded.set(expandedEntry[0], loadDetails);
        setExpandedLoads(newExpanded);
      }
    } catch (err) {
      alert('Failed to update status: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleCreateSuccess = async () => {
    setIsDialogOpen(false);
    await loadLoadsData();
  };

  const toggleLoadExpansion = async (load: LoadListItem) => {
    const isExpanded = expandedLoads.has(load.id);

    if (isExpanded) {
      const newExpanded = new Map(expandedLoads);
      newExpanded.delete(load.id);
      setExpandedLoads(newExpanded);
    } else {
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
      }
    }
  };

  const statusTransitions: Record<string, string[]> = {
    pending: ['planned', 'cancelled'],
    planned: ['active', 'cancelled'],
    active: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  function getStatusVariant(status: string): "default" | "muted" | "destructive" | "outline" {
    const variants: Record<string, "default" | "muted" | "destructive" | "outline"> = {
      pending: "outline",
      planned: "muted",
      active: "default",
      completed: "muted",
      cancelled: "destructive",
    };
    return variants[status] || "outline";
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Loads</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Load
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Load</DialogTitle>
              </DialogHeader>
              <LoadForm
                onSuccess={handleCreateSuccess}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      {loads.some(l => l.external_source) && (
        <div className="mx-6 mt-2 mb-4">
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100 flex items-center justify-between">
              <span>
                <span className="font-medium">🔗 TMS integration active</span>
                {' '}— Some loads are synced from your TMS. Synced loads are read-only. You can still add loads manually.
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
      )}

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
            No loads yet. Click &quot;Add Load&quot; to create your first load.
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
                  <React.Fragment key={load.id}>
                    <TableRow
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
                              <div className="flex items-center gap-4">
                                {/* Status transition for manual loads */}
                                {!load.external_source && statusTransitions[loadDetails.status]?.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Move to:</span>
                                    <Select
                                      onValueChange={(value) => handleStatusChange(loadDetails.load_id, value)}
                                      disabled={updatingStatus === loadDetails.load_id}
                                    >
                                      <SelectTrigger className="h-8 w-[130px] text-xs">
                                        <SelectValue placeholder="Change status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {statusTransitions[loadDetails.status]?.map((nextStatus) => (
                                          <SelectItem key={nextStatus} value={nextStatus} className="text-xs">
                                            {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Total Weight</p>
                                  <p className="text-sm font-medium text-foreground">
                                    {loadDetails.weight_lbs.toLocaleString()} lbs
                                  </p>
                                </div>
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
                  </React.Fragment>
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
 * Load Creation Form with dynamic stop entry
 */
function LoadForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<{
    load_number: string;
    customer_name: string;
    weight_lbs: number;
    commodity_type: string;
    special_requirements: string;
  }>({
    load_number: '',
    customer_name: '',
    weight_lbs: 0,
    commodity_type: 'general',
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    try {
      const loadData: LoadCreate = {
        load_number: formData.load_number,
        customer_name: formData.customer_name,
        weight_lbs: formData.weight_lbs,
        commodity_type: formData.commodity_type,
        special_requirements: formData.special_requirements || undefined,
        stops: stops,
      };
      await createLoad(loadData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create load');
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
            <Label htmlFor="customer_name">Customer *</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="Customer name"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="weight_lbs">Weight (lbs) *</Label>
            <Input
              id="weight_lbs"
              type="number"
              value={formData.weight_lbs || ''}
              onChange={(e) => setFormData({ ...formData, weight_lbs: parseInt(e.target.value) || 0 })}
              placeholder="40000"
              required
            />
          </div>
          <div>
            <Label htmlFor="commodity_type">Commodity Type</Label>
            <Select
              value={formData.commodity_type}
              onValueChange={(value) => setFormData({ ...formData, commodity_type: value })}
            >
              <SelectTrigger id="commodity_type">
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
            <Label htmlFor="special_requirements">Special Requirements</Label>
            <Input
              id="special_requirements"
              value={formData.special_requirements}
              onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
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
          <div
            key={index}
            className="p-4 rounded-lg border border-border space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                  stop.action_type === 'pickup'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                }`}>
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
                  onValueChange={(value) => updateStop(index, 'action_type', value)}
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
                  onChange={(e) => updateStop(index, 'estimated_dock_hours', parseFloat(e.target.value) || 0)}
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

      {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

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

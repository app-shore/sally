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

export default function SettingsPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isAuthenticated, user } = useSessionStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // Only load fleet data for dispatchers
    if (user?.role === 'DISPATCHER') {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, router]);

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          {user?.role === 'DISPATCHER'
            ? 'Manage fleet settings and configurations'
            : 'Manage your preferences and account settings'}
        </p>
      </div>

      {user?.role === 'DISPATCHER' ? (
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
            <Card>
              <CardHeader>
                <CardTitle>Loads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg">Loads Management - Coming Soon</p>
                  <p className="text-sm mt-2">
                    Manage load assignments and delivery schedules
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Driver Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Driver Settings - Coming Soon</p>
              <p className="text-sm mt-2">
                Manage your profile, notifications, and preferences
              </p>
            </div>
          </CardContent>
        </Card>
      )}
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Drivers</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingDriver(null)}>Add Driver</Button>
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
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading drivers...</div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
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
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>{driver.license_number}</TableCell>
                  <TableCell>{driver.phone || '-'}</TableCell>
                  <TableCell>{driver.email || '-'}</TableCell>
                  <TableCell className="text-right">
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
                      onClick={() => handleDelete(driver.id)}
                    >
                      Delete
                    </Button>
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

      {error && <div className="text-sm text-red-600">{error}</div>}

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Vehicles</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingVehicle(null)}>Add Vehicle</Button>
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
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading vehicles...</div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.unit_number}</TableCell>
                  <TableCell>
                    {vehicle.make && vehicle.model
                      ? `${vehicle.make} ${vehicle.model}`
                      : '-'}
                  </TableCell>
                  <TableCell>{vehicle.year || '-'}</TableCell>
                  <TableCell>{vehicle.fuel_capacity_gallons} gal</TableCell>
                  <TableCell>{vehicle.mpg ? `${vehicle.mpg} mpg` : '-'}</TableCell>
                  <TableCell className="text-right">
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
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      Delete
                    </Button>
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

      {error && <div className="text-sm text-red-600">{error}</div>}

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

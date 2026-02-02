'use client';

import { useState } from 'react';
import { DriverList } from '@/components/drivers/driver-list';
import { DriverActivationDialog } from '@/components/drivers/driver-activation-dialog';

export default function DriversPage() {
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<'activate' | 'reactivate' | 'deactivate'>('activate');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleActivateClick = (driver: any) => {
    setSelectedDriver(driver);
    setDialogMode(driver.status === 'INACTIVE' ? 'reactivate' : 'activate');
    setDialogOpen(true);
  };

  const handleDeactivateClick = (driver: any) => {
    setSelectedDriver(driver);
    setDialogMode('deactivate');
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Driver Management</h1>
        <p className="text-muted-foreground">
          Activate and manage driver accounts
        </p>
      </div>

      <DriverList
        onActivateClick={handleActivateClick}
        onDeactivateClick={handleDeactivateClick}
      />

      <DriverActivationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        driver={selectedDriver}
        mode={dialogMode}
      />
    </div>
  );
}

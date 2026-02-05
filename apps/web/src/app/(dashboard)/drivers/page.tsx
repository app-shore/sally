"use client";

import { useState } from "react";
import { DriverList, DriverActivationDialog } from "@/features/fleet/drivers";

export default function DriversPage() {
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<
    "activate" | "reactivate" | "deactivate"
  >("activate");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleActivateClick = (driver: any) => {
    setSelectedDriver(driver);
    setDialogMode(driver.status === "INACTIVE" ? "reactivate" : "activate");
    setDialogOpen(true);
  };

  const handleDeactivateClick = (driver: any) => {
    setSelectedDriver(driver);
    setDialogMode("deactivate");
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Drivers
        </h1>
        <p className="text-muted-foreground mt-1">
          Activate and coordinate your driver team
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

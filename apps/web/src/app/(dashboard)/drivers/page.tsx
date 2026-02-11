"use client";

import { useState } from "react";
import {
  DriverList,
  DriverActivationDialog,
  InviteDriverDialog,
} from "@/features/fleet/drivers";

export default function DriversPage() {
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<
    "activate" | "reactivate" | "deactivate"
  >("activate");
  const [activationDialogOpen, setActivationDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const handleActivateClick = (driver: any) => {
    setSelectedDriver(driver);
    setDialogMode(driver.status === "INACTIVE" ? "reactivate" : "activate");
    setActivationDialogOpen(true);
  };

  const handleDeactivateClick = (driver: any) => {
    setSelectedDriver(driver);
    setDialogMode("deactivate");
    setActivationDialogOpen(true);
  };

  const handleInviteClick = (driver: any) => {
    setSelectedDriver(driver);
    setInviteDialogOpen(true);
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
        onInviteClick={handleInviteClick}
      />

      <DriverActivationDialog
        open={activationDialogOpen}
        onOpenChange={setActivationDialogOpen}
        driver={selectedDriver}
        mode={dialogMode}
      />

      <InviteDriverDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        driver={selectedDriver}
      />
    </div>
  );
}

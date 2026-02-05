"use client";

import { useState } from "react";
import { UserList, InviteUserDialog } from "@/features/platform/users";

export default function UsersPage() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Team Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage team and send invitations
        </p>
      </div>

      <UserList onInviteClick={() => setInviteDialogOpen(true)} />
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  );
}

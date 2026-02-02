'use client';

import { useState } from 'react';
import { UserList } from '@/components/users/user-list';
import { InviteUserDialog } from '@/components/users/invite-user-dialog';

export default function UsersPage() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">
          Manage users and send invitations
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

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { UserPlus } from 'lucide-react';

interface UserListProps {
  onInviteClick: () => void;
}

export function UserList({ onInviteClick }: UserListProps) {
  const { accessToken, user: currentUser, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/users`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!accessToken,
  });

  // Fetch invitations
  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/invitations`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch invitations');
      return response.json();
    },
    enabled: !!accessToken,
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`${apiUrl}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason: 'Cancelled by admin' }),
      });
      if (!response.ok) throw new Error('Failed to cancel invitation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`${apiUrl}/users/${userId}/deactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to deactivate user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Activate user mutation
  const activateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`${apiUrl}/users/${userId}/activate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to activate user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`${apiUrl}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleCancelInvitation = (invitationId: string) => {
    if (confirm('Cancel this invitation?')) {
      cancelInvitationMutation.mutate(invitationId);
    }
  };

  const handleDeactivateUser = (userId: string, userName: string) => {
    if (confirm(`Deactivate ${userName}? They will no longer be able to access the system.`)) {
      deactivateUserMutation.mutate(userId);
    }
  };

  const handleActivateUser = (userId: string, userName: string) => {
    if (confirm(`Activate ${userName}? They will regain access to the system.`)) {
      activateUserMutation.mutate(userId);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Permanently deactivate ${userName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const activeUsers = users?.filter((u: any) => u.isActive) || [];
  const pendingInvitations = invitations?.filter((i: any) => i.status === 'PENDING') || [];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default';
      case 'ADMIN':
        return 'default';
      case 'DISPATCHER':
        return 'muted';
      case 'DRIVER':
        return 'outline';
      default:
        return 'muted';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle></CardTitle>
          {/* Only OWNER/ADMIN can invite users. SUPER_ADMIN manages tenants via tenant registration */}
          {!isSuperAdmin && (
            <Button onClick={onInviteClick}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Team Member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Users ({users?.length || 0})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeUsers.length})</TabsTrigger>
            <TabsTrigger value="invitations">Pending Invitations ({pendingInvitations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {usersLoading ? (
              <div className="text-muted-foreground">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: any) => {
                      const isCurrentUser = user.userId === currentUser?.userId;
                      const isOwner = user.role === 'OWNER';
                      const isAdmin = user.role === 'ADMIN';
                      const canManage = currentUser?.role === 'OWNER' || (currentUser?.role === 'ADMIN' && !isAdmin);
                      const userName = `${user.firstName} ${user.lastName}`;
                      return (
                        <TableRow key={user.userId}>
                          <TableCell className="font-medium">
                            {userName}
                            {isOwner && (
                              <span className="ml-2 text-xs text-muted-foreground">(Owner)</span>
                            )}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? 'default' : 'muted'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.lastLoginAt
                              ? new Date(user.lastLoginAt).toLocaleDateString()
                              : 'Never'}
                          </TableCell>
                          <TableCell>
                            {isOwner ? (
                              <span className="text-xs text-muted-foreground">Protected</span>
                            ) : !canManage ? (
                              <span className="text-xs text-muted-foreground">No Permission</span>
                            ) : (
                              <div className="flex gap-2">
                                {user.isActive ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeactivateUser(user.userId, userName)}
                                    disabled={deactivateUserMutation.isPending || isCurrentUser}
                                  >
                                    Deactivate
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleActivateUser(user.userId, userName)}
                                    disabled={activateUserMutation.isPending}
                                  >
                                    Activate
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteUser(user.userId, userName)}
                                  disabled={deleteUserMutation.isPending || isCurrentUser}
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers.map((user: any) => {
                    const isCurrentUser = user.userId === currentUser?.userId;
                    const isOwner = user.role === 'OWNER';
                    const isAdmin = user.role === 'ADMIN';
                    const canManage = currentUser?.role === 'OWNER' || (currentUser?.role === 'ADMIN' && !isAdmin);
                    const userName = `${user.firstName} ${user.lastName}`;
                    return (
                      <TableRow key={user.userId}>
                        <TableCell className="font-medium">
                          {userName}
                          {isOwner && (
                            <span className="ml-2 text-xs text-muted-foreground">(Owner)</span>
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          {isOwner ? (
                            <span className="text-xs text-muted-foreground">Protected</span>
                          ) : !canManage ? (
                            <span className="text-xs text-muted-foreground">No Permission</span>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeactivateUser(user.userId, userName)}
                                disabled={deactivateUserMutation.isPending || isCurrentUser}
                              >
                                Deactivate
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteUser(user.userId, userName)}
                                disabled={deleteUserMutation.isPending || isCurrentUser}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="invitations" className="mt-4">
            {invitationsLoading ? (
              <div className="text-muted-foreground">Loading invitations...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invited By</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((invitation: any) => (
                      <TableRow key={invitation.invitationId}>
                        <TableCell className="font-medium">
                          {invitation.firstName} {invitation.lastName}
                        </TableCell>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(invitation.role)}>
                            {invitation.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invitation.invitedByUser?.firstName} {invitation.invitedByUser?.lastName}
                        </TableCell>
                        <TableCell>
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelInvitation(invitation.invitationId)}
                            disabled={cancelInvitationMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default UserList;

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useAuth } from '@/features/auth';
import { apiClient } from '@/shared/lib/api';
import { UserPlus } from 'lucide-react';

interface UserListProps {
  onInviteClick: () => void;
  defaultTab?: string;
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return 'default' as const;
    case 'DISPATCHER':
      return 'muted' as const;
    case 'DRIVER':
      return 'outline' as const;
    default:
      return 'muted' as const;
  }
};

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays > 30) return `${Math.floor(diffDays / 30)}mo ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
};

const formatCountdown = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMs < 0) return 'Expired';
  if (diffDays > 1) return `${diffDays} days`;
  if (diffDays === 1) return '1 day';
  if (diffHours > 0) return `${diffHours}h`;
  return 'Less than 1h';
};

const isExpiryWarning = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays < 2;
};

export function UserList({ onInviteClick, defaultTab = 'staff' }: UserListProps) {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient<any[]>('/users'),
  });

  // Fetch invitations
  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => apiClient<any[]>('/invitations'),
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return apiClient(`/invitations/${invitationId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Cancelled by admin' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return apiClient(`/invitations/${invitationId}/resend`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiClient(`/users/${userId}/deactivate`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Activate user mutation
  const activateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiClient(`/users/${userId}/activate`, { method: 'POST' });
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

  const handleResendInvitation = (invitationId: string) => {
    resendInvitationMutation.mutate(invitationId);
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

  // Filter users by role
  const staffUsers = users?.filter((u: any) => u.role !== 'DRIVER') || [];
  const driverUsers = users?.filter((u: any) => u.role === 'DRIVER') || [];
  const pendingInvitations = invitations?.filter((i: any) => i.status === 'PENDING') || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle></CardTitle>
          {!isSuperAdmin && (
            <Button onClick={onInviteClick}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Staff Member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="staff">Staff ({staffUsers.length})</TabsTrigger>
            <TabsTrigger value="drivers">Drivers ({driverUsers.length})</TabsTrigger>
            <TabsTrigger value="invitations">Invitations ({pendingInvitations.length})</TabsTrigger>
          </TabsList>

          {/* Staff Tab */}
          <TabsContent value="staff" className="mt-4">
            {usersLoading ? (
              <div className="text-muted-foreground">Loading staff...</div>
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
                    {staffUsers.map((user: any) => {
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
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {staffUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No staff members found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Drivers Tab */}
          <TabsContent value="drivers" className="mt-4">
            {usersLoading ? (
              <div className="text-muted-foreground">Loading drivers...</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driverUsers.map((user: any) => {
                        const isCurrentUser = user.userId === currentUser?.userId;
                        const canManage = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';
                        const userName = `${user.firstName} ${user.lastName}`;
                        return (
                          <TableRow key={user.userId}>
                            <TableCell className="font-medium">{userName}</TableCell>
                            <TableCell>{user.email}</TableCell>
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
                              {canManage && (
                                <div className="flex gap-2">
                                  <Link href="/dispatcher/fleet">
                                    <Button size="sm" variant="outline">
                                      View in Fleet
                                    </Button>
                                  </Link>
                                  {user.isActive && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeactivateUser(user.userId, userName)}
                                      disabled={deactivateUserMutation.isPending || isCurrentUser}
                                    >
                                      Deactivate
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {driverUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No driver accounts yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  To invite more drivers, go to{' '}
                  <Link href="/dispatcher/fleet" className="underline hover:text-foreground">
                    Fleet Management
                  </Link>
                </p>
              </>
            )}
          </TabsContent>

          {/* Invitations Tab */}
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
                      <TableHead>Sent</TableHead>
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
                          {invitation.createdAt ? formatRelativeTime(invitation.createdAt) : '—'}
                        </TableCell>
                        <TableCell>
                          <span className={isExpiryWarning(invitation.expiresAt) ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''}>
                            {formatCountdown(invitation.expiresAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendInvitation(invitation.invitationId)}
                              disabled={resendInvitationMutation.isPending}
                            >
                              {resendInvitationMutation.isPending ? 'Sending...' : 'Resend'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelInvitation(invitation.invitationId)}
                              disabled={cancelInvitationMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingInvitations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No pending invitations
                        </TableCell>
                      </TableRow>
                    )}
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

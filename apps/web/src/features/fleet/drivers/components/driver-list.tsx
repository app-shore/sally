'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { driversApi } from '../api';

interface DriverListProps {
  onActivateClick: (driver: any) => void;
  onDeactivateClick: (driver: any) => void;
  onInviteClick?: (driver: any) => void;
}

const getSallyAccessBadge = (status: string | undefined) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="default">Active</Badge>;
    case 'INVITED':
      return <Badge variant="muted">Invited</Badge>;
    case 'DEACTIVATED':
      return <Badge variant="destructive">Deactivated</Badge>;
    default:
      return <Badge variant="outline">No Access</Badge>;
  }
};

const getStatusBadge = (status: string, isActive: boolean) => {
  if (status === 'PENDING_ACTIVATION') {
    return <Badge variant="muted">Pending</Badge>;
  }
  if (status === 'ACTIVE' && isActive) {
    return <Badge variant="default">Active</Badge>;
  }
  if (status === 'INACTIVE' || !isActive) {
    return <Badge variant="outline">Inactive</Badge>;
  }
  return <Badge variant="muted">{status}</Badge>;
};

export function DriverList({ onActivateClick, onDeactivateClick, onInviteClick }: DriverListProps) {
  const [activeTab, setActiveTab] = useState('all');

  // Fetch all drivers using API client
  const { data: allDrivers, isLoading: allLoading } = useQuery({
    queryKey: ['drivers', 'all'],
    queryFn: () => driversApi.list(),
  });

  // Fetch pending drivers
  const { data: pendingDrivers, isLoading: pendingLoading } = useQuery({
    queryKey: ['drivers', 'pending'],
    queryFn: () => driversApi.getPending(),
    enabled: activeTab === 'pending',
  });

  // Fetch inactive drivers
  const { data: inactiveDrivers, isLoading: inactiveLoading } = useQuery({
    queryKey: ['drivers', 'inactive'],
    queryFn: () => driversApi.getInactive(),
    enabled: activeTab === 'inactive',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Drivers ({allDrivers?.length || 0})</TabsTrigger>
            <TabsTrigger value="pending">Pending Activation ({pendingDrivers?.length || 0})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({inactiveDrivers?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {allLoading ? (
              <div className="text-muted-foreground">Loading drivers...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Driver ID</TableHead>
                      <TableHead>License</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>SALLY Access</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allDrivers?.map((driver: any) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-1 py-0.5 rounded">
                            {driver.driver_id}
                          </code>
                        </TableCell>
                        <TableCell>
                          {driver.license_number || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {driver.external_source ? (
                            <Badge variant="outline">{driver.external_source}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Manual</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getSallyAccessBadge(driver.sally_access_status)}
                        </TableCell>
                        <TableCell>
                          {driver.sally_access_status === 'NO_ACCESS' && onInviteClick && (
                            <Button
                              size="sm"
                              onClick={() => onInviteClick(driver)}
                            >
                              Invite to SALLY
                            </Button>
                          )}
                          {driver.sally_access_status === 'INVITED' && (
                            <span className="text-sm text-muted-foreground">Pending invite</span>
                          )}
                          {driver.sally_access_status === 'ACTIVE' && (
                            <span className="text-sm text-muted-foreground">Has access</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!allDrivers || allDrivers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No active drivers found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {pendingLoading ? (
              <div className="text-muted-foreground">Loading pending drivers...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Driver ID</TableHead>
                      <TableHead>External Source</TableHead>
                      <TableHead>Synced At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingDrivers?.map((driver: any) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-1 py-0.5 rounded">
                            {driver.driverId}
                          </code>
                        </TableCell>
                        <TableCell>
                          {driver.externalSource ? (
                            <Badge variant="outline">{driver.externalSource}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {driver.lastSyncedAt
                            ? new Date(driver.lastSyncedAt).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onActivateClick(driver)}
                            >
                              Activate
                            </Button>
                            {onInviteClick && (
                              <Button
                                size="sm"
                                onClick={() => onInviteClick(driver)}
                              >
                                Activate &amp; Invite
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!pendingDrivers || pendingDrivers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No pending drivers
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="inactive" className="mt-4">
            {inactiveLoading ? (
              <div className="text-muted-foreground">Loading inactive drivers...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Driver ID</TableHead>
                      <TableHead>Deactivated By</TableHead>
                      <TableHead>Deactivated At</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveDrivers?.map((driver: any) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-1 py-0.5 rounded">
                            {driver.driverId}
                          </code>
                        </TableCell>
                        <TableCell>
                          {driver.deactivatedByUser
                            ? `${driver.deactivatedByUser.firstName} ${driver.deactivatedByUser.lastName}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {driver.deactivatedAt
                            ? new Date(driver.deactivatedAt).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {driver.deactivationReason || 'No reason provided'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => onActivateClick(driver)}
                          >
                            Reactivate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!inactiveDrivers || inactiveDrivers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No inactive drivers
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

export default DriverList;

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

interface DriverListProps {
  onActivateClick: (driver: any) => void;
  onDeactivateClick: (driver: any) => void;
}

export function DriverList({ onActivateClick, onDeactivateClick }: DriverListProps) {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  // Fetch all drivers
  const { data: allDrivers, isLoading: allLoading } = useQuery({
    queryKey: ['drivers', 'all'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/drivers`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch drivers');
      return response.json();
    },
    enabled: !!accessToken,
  });

  // Fetch pending drivers
  const { data: pendingDrivers, isLoading: pendingLoading } = useQuery({
    queryKey: ['drivers', 'pending'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/drivers/pending/list`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch pending drivers');
      return response.json();
    },
    enabled: !!accessToken && activeTab === 'pending',
  });

  // Fetch inactive drivers
  const { data: inactiveDrivers, isLoading: inactiveLoading } = useQuery({
    queryKey: ['drivers', 'inactive'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/drivers/inactive/list`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch inactive drivers');
      return response.json();
    },
    enabled: !!accessToken && activeTab === 'inactive',
  });

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
                      <TableHead>Status</TableHead>
                      <TableHead>External Source</TableHead>
                      <TableHead>Last Synced</TableHead>
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
                          {getStatusBadge(driver.status || 'ACTIVE', driver.is_active)}
                        </TableCell>
                        <TableCell>
                          {driver.external_source ? (
                            <Badge variant="outline">{driver.external_source}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Manual</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {driver.last_synced_at
                            ? new Date(driver.last_synced_at).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
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
                          <Badge variant="outline">{driver.externalSource}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(driver.lastSyncedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => onActivateClick(driver)}
                          >
                            Activate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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

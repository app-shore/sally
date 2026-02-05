'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { getSyncHistory, getSyncStats, type SyncLog, type SyncStats } from '@/features/integrations';

interface IntegrationSyncHistoryProps {
  integrationId: string;
}

export function IntegrationSyncHistory({ integrationId }: IntegrationSyncHistoryProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [integrationId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [logsData, statsData] = await Promise.all([
        getSyncHistory(integrationId),
        getSyncStats(integrationId),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync history');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button onClick={loadData} variant="outline">Retry</Button>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No sync history yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Syncs</p>
              <p className="text-2xl font-bold text-foreground">{stats.total_syncs}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.success_rate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.successful_syncs}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.failed_syncs}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Syncs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Records</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <SyncStatusBadge status={log.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.sync_type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeTime(log.started_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.records_processed} processed
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SyncStatusBadge({ status }: { status: string }) {
  const config = {
    success: {
      icon: CheckCircle2,
      label: 'Success',
      className: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200',
    },
    failed: {
      icon: XCircle,
      label: 'Failed',
      className: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200',
    },
  }[status] || {
    icon: Clock,
    label: status,
    className: 'bg-gray-100 dark:bg-gray-950',
  };

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

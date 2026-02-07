'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { useAlertHistory } from '@/features/operations/alerts/hooks/use-alert-analytics';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';

const PRIORITY_BADGE: Record<string, 'destructive' | 'outline' | 'default'> = {
  critical: 'destructive',
  high: 'default',
  medium: 'outline',
  low: 'outline',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getResponseTime(alert: any): string {
  if (!alert.acknowledged_at || !alert.created_at) return '—';
  const diff = new Date(alert.acknowledged_at).getTime() - new Date(alert.created_at).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function AlertsHistoryPage() {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');
  const [status, setStatus] = useState('all');
  const [driverId, setDriverId] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {
      page: String(page),
      limit: '20',
    };
    if (startDate) p.start_date = startDate;
    if (endDate) p.end_date = endDate;
    if (category && category !== 'all') p.category = category;
    if (priority && priority !== 'all') p.priority = priority;
    if (status && status !== 'all') p.status = status;
    if (driverId.trim()) p.driver_id = driverId.trim();
    return p;
  }, [page, startDate, endDate, category, priority, status, driverId]);

  const { data, isLoading } = useAlertHistory(params);

  const handleReset = () => {
    setPage(1);
    setStartDate('');
    setEndDate('');
    setCategory('all');
    setPriority('all');
    setStatus('all');
    setDriverId('');
  };

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-6 lg:px-8 py-4 md:py-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Alert History</h1>
          <p className="text-sm text-muted-foreground">Browse and search past alerts</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="hos">HOS</SelectItem>
                  <SelectItem value="route">Route</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="snoozed">Snoozed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="auto_resolved">Auto-resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Driver ID</label>
              <Input
                placeholder="e.g. driver-123"
                value={driverId}
                onChange={(e) => { setDriverId(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleReset} className="w-full">
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="hidden lg:table-cell">Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.items?.length ? (
                  data.items.map((alert: any) => (
                    <TableRow key={alert.alertId || alert.alert_id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(alert.createdAt || alert.created_at)}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-xs max-w-[150px] truncate">
                        {alert.alertType || alert.alert_type}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="capitalize text-xs">
                          {alert.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={PRIORITY_BADGE[alert.priority] || 'outline'} className="capitalize text-xs">
                          {alert.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {alert.driverId || alert.driver_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {alert.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-sm text-muted-foreground">
                        {getResponseTime(alert)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No alerts found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

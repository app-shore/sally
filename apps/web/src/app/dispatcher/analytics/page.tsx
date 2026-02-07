'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import {
  useAlertVolume,
  useResponseTimeTrend,
  useResolutionRates,
  useTopAlertTypes,
} from '@/features/operations/alerts/hooks/use-alert-analytics';
import { BarChart3, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500 dark:bg-red-400',
  high: 'bg-yellow-500 dark:bg-yellow-400',
  medium: 'bg-blue-500 dark:bg-blue-400',
  low: 'bg-gray-400 dark:bg-gray-500',
};

const CATEGORY_COLORS: Record<string, string> = {
  hos: 'bg-red-500 dark:bg-red-400',
  route: 'bg-blue-500 dark:bg-blue-400',
  driver: 'bg-yellow-500 dark:bg-yellow-400',
  vehicle: 'bg-green-500 dark:bg-green-400',
  external: 'bg-gray-500 dark:bg-gray-400',
  system: 'bg-gray-700 dark:bg-gray-300',
};

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);

  const { data: volume, isLoading: volumeLoading } = useAlertVolume(days);
  const { data: responseTime, isLoading: responseLoading } = useResponseTimeTrend(days);
  const { data: resolution, isLoading: resolutionLoading } = useResolutionRates(days);
  const { data: topTypes, isLoading: topTypesLoading } = useTopAlertTypes(days);

  const maxCategoryCount = volume?.byCategory?.reduce((max, c) => Math.max(max, c.count), 0) || 1;
  const maxPriorityCount = volume?.byPriority?.reduce((max, p) => Math.max(max, p.count), 0) || 1;
  const maxTypeCount = topTypes?.reduce((max, t) => Math.max(max, t.count), 0) || 1;

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-6 lg:px-8 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Alert Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance metrics and trends</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Alerts</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {resolutionLoading ? '—' : resolution?.total ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Resolution Rate</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {resolutionLoading ? '—' : `${resolution?.resolutionRate ?? 0}%`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg Response</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {responseLoading || !responseTime?.length
                ? '—'
                : `${Math.round(responseTime.reduce((s, r) => s + r.avgResponseMinutes, 0) / responseTime.length)}m`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Escalation Rate</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {resolutionLoading ? '—' : `${resolution?.escalationRate ?? 0}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Volume by Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Volume by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {volumeLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : volume?.byCategory?.length ? (
              volume.byCategory.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground capitalize">{c.category}</span>
                    <span className="text-muted-foreground">{c.count}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${CATEGORY_COLORS[c.category] || 'bg-foreground'}`}
                      style={{ width: `${(c.count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No data for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Volume by Priority */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Volume by Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {volumeLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : volume?.byPriority?.length ? (
              volume.byPriority.map((p) => (
                <div key={p.priority} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground capitalize">{p.priority}</span>
                    <span className="text-muted-foreground">{p.count}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${PRIORITY_COLORS[p.priority] || 'bg-foreground'}`}
                      style={{ width: `${(p.count / maxPriorityCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No data for this period</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Response Time Trend and Resolution Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Response Time Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Response Time Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {responseLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : responseTime?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Avg Response</TableHead>
                    <TableHead className="text-right">Alerts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responseTime.map((entry) => (
                    <TableRow key={entry.date}>
                      <TableCell className="text-sm">{entry.date}</TableCell>
                      <TableCell className="text-right text-sm">{entry.avgResponseMinutes}m</TableCell>
                      <TableCell className="text-right text-sm">{entry.alertCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No response time data for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Resolution Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resolution Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resolutionLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : resolution ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Resolved</p>
                    <p className="text-lg font-semibold text-foreground">{resolution.resolved}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Auto-resolved</p>
                    <p className="text-lg font-semibold text-foreground">{resolution.autoResolved}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Escalated</p>
                    <p className="text-lg font-semibold text-foreground">{resolution.escalated}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold text-foreground">{resolution.total}</p>
                  </div>
                </div>
                {resolution.total > 0 && (
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-green-500 dark:bg-green-400"
                        style={{ width: `${(resolution.resolved / resolution.total) * 100}%` }}
                      />
                      <div
                        className="h-full bg-blue-500 dark:bg-blue-400"
                        style={{ width: `${(resolution.autoResolved / resolution.total) * 100}%` }}
                      />
                      <div
                        className="h-full bg-red-500 dark:bg-red-400"
                        style={{ width: `${(resolution.escalated / resolution.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" /> Resolved
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" /> Auto
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" /> Escalated
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Alert Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Top Alert Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topTypesLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : topTypes?.length ? (
            topTypes.map((t) => (
              <div key={t.alertType} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-mono text-xs">{t.alertType}</span>
                  <Badge variant="outline">{t.count}</Badge>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${(t.count / maxTypeCount) * 100}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No alert type data for this period</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

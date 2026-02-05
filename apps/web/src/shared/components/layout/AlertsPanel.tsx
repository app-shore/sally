'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAlerts, acknowledgeAlert, resolveAlert } from '@/features/operations/alerts';

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const priorityConfig = {
  critical: { icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950', badgeVariant: 'destructive' as const },
  high: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950', badgeVariant: 'default' as const },
  medium: { icon: Info, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-950', badgeVariant: 'default' as const },
  low: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950', badgeVariant: 'outline' as const },
};

export function AlertsPanel({ isOpen, onClose }: AlertsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Fetch active alerts
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: () => listAlerts({ status: 'active' }),
    refetchInterval: 30000, // Poll every 30 seconds
    enabled: isOpen,
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const filteredAlerts = selectedFilter === 'all'
    ? alerts
    : alerts.filter((alert) => alert.priority === selectedFilter);

  const getAlertIcon = (priority: string) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.low;
    const Icon = config.icon;
    return <Icon className={`h-5 w-5 ${config.color}`} />;
  };

  const getAlertConfig = (priority: string) => {
    return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.low;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen w-full sm:w-[400px] bg-background shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">Alerts</h2>
                {alerts.length > 0 && (
                  <Badge variant="muted">{alerts.length}</Badge>
                )}
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                aria-label="Close alerts panel"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 p-4 border-b border-border overflow-x-auto">
              {['all', 'critical', 'high', 'medium', 'low'].map((filter) => (
                <Button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  variant={selectedFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>

            {/* Alert list */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedFilter === 'all' ? 'No active alerts' : `No ${selectedFilter} priority alerts`}
                  </div>
                ) : (
                  filteredAlerts.map((alert) => {
                    const config = getAlertConfig(alert.priority);
                    return (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${config.bgColor} border-border`}
                      >
                        <div className="flex items-start gap-3">
                          {getAlertIcon(alert.priority)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={config.badgeVariant} className="text-xs">
                                {alert.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {alert.category}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-foreground mb-1">
                              {alert.title}
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {alert.message}
                            </p>
                            {alert.metadata && (
                              <p className="text-xs text-muted-foreground mb-2">
                                {JSON.stringify(alert.metadata)}
                              </p>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {new Date(alert.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                          {alert.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeMutation.mutate(alert.id)}
                              disabled={acknowledgeMutation.isPending}
                            >
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => resolveMutation.mutate(alert.id)}
                            disabled={resolveMutation.isPending}
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AlertsPanel;

'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAlerts, acknowledgeAlert, resolveAlert } from '@/lib/api/alerts';

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const priorityConfig = {
  critical: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50', badgeVariant: 'destructive' as const },
  high: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-50', badgeVariant: 'default' as const },
  medium: { icon: Info, color: 'text-yellow-600', bgColor: 'bg-yellow-50', badgeVariant: 'secondary' as const },
  low: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-50', badgeVariant: 'outline' as const },
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
            className="fixed right-0 top-0 h-screen w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Alerts</h2>
                {alerts.length > 0 && (
                  <Badge variant="secondary">{alerts.length}</Badge>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Close alerts panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 p-4 border-b border-gray-200 overflow-x-auto">
              {['all', 'critical', 'high', 'medium', 'low'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedFilter === filter
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {/* Alert list */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading alerts...</div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {selectedFilter === 'all' ? 'No active alerts' : `No ${selectedFilter} priority alerts`}
                  </div>
                ) : (
                  filteredAlerts.map((alert) => {
                    const config = getAlertConfig(alert.priority);
                    return (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${config.bgColor} border-gray-200`}
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
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {alert.title}
                            </p>
                            <p className="text-xs text-gray-600 mb-2">
                              {alert.message}
                            </p>
                            {alert.metadata && (
                              <p className="text-xs text-gray-600 mb-2">
                                {JSON.stringify(alert.metadata)}
                              </p>
                            )}
                            <div className="text-xs text-gray-500">
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

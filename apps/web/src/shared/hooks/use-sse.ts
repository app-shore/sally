'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { playAlertSound } from '@/shared/lib/alert-sounds';
import { flashTabTitle } from '@/shared/lib/tab-flash';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UseSSEOptions {
  enabled?: boolean;
  onAlertNew?: (alert: any) => void;
  onNotificationNew?: (notification: any) => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!accessToken || !isAuthenticated) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE_URL}/sse/stream?token=${encodeURIComponent(accessToken)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('alert:new', (e) => {
      const data = JSON.parse(e.data);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });

      if (!document.hasFocus()) {
        if (data.playSound) {
          playAlertSound(data.priority ?? 'medium');
        }
        if (data.flashTab) {
          flashTabTitle(`⚠ ${data.title ?? 'New Alert'}`);
        }
        if (
          data.showBrowserNotification &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          new Notification(data.title ?? 'New Alert', {
            body: data.message ?? '',
            tag: `alert-${data.alertId ?? Date.now()}`,
          });
        }
      }

      options.onAlertNew?.(data);
    });

    eventSource.addEventListener('alert:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    eventSource.addEventListener('alert:resolved', () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    eventSource.addEventListener('alert:escalated', () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    eventSource.addEventListener('notification:new', (e) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      options.onNotificationNew?.(JSON.parse(e.data));
    });

    eventSource.addEventListener('heartbeat', () => {
      // Connection alive
    });

    eventSource.addEventListener('monitoring:cycle_complete', () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring'] });
    });

    eventSource.addEventListener('monitoring:trigger_fired', () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    eventSource.onerror = () => {
      eventSource.close();
      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, [accessToken, isAuthenticated, queryClient, options]);

  useEffect(() => {
    if (enabled && isAuthenticated) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, isAuthenticated, connect]);

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
  };
}

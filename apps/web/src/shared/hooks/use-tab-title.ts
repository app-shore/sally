'use client';

import { useEffect, useRef } from 'react';

export function useTabTitle(criticalCount: number) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const originalTitle = useRef<string>('SALLY');

  useEffect(() => {
    if (criticalCount > 0) {
      let showAlert = true;

      intervalRef.current = setInterval(() => {
        document.title = showAlert
          ? `⚠️ ${criticalCount} CRITICAL ALERT${criticalCount > 1 ? 'S' : ''}`
          : originalTitle.current;
        showAlert = !showAlert;
      }, 1500);
    } else {
      document.title = originalTitle.current;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.title = originalTitle.current;
    };
  }, [criticalCount]);
}

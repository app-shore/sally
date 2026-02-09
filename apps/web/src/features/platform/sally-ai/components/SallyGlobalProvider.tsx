'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/features/auth';
import { useSallyStore } from '../store';
import { SallyStrip } from './SallyStrip';
import type { UserMode } from '../engine/types';

function detectMode(pathname: string | null, userRole: string | undefined, isAuthenticated: boolean): UserMode {
  if (!isAuthenticated) return 'prospect';
  if (pathname?.startsWith('/driver')) return 'driver';
  if (userRole === 'DRIVER') return 'driver';
  return 'dispatcher';
}

export function SallyGlobalProvider() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const { setUserMode, userMode } = useSallyStore();

  useEffect(() => {
    const mode = detectMode(pathname, user?.role, isAuthenticated);
    if (mode !== userMode) {
      setUserMode(mode);
    }
  }, [pathname, user?.role, isAuthenticated, setUserMode, userMode]);

  return <SallyStrip />;
}

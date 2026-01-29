'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { LoginScreen } from '@/components/auth/LoginScreen';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSessionStore();

  useEffect(() => {
    // If user is already authenticated, redirect to their dashboard
    if (isAuthenticated) {
      if (user?.role === 'DISPATCHER') {
        router.push('/dispatcher/overview');
      } else if (user?.role === 'DRIVER') {
        router.push('/driver/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  if (isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <LoginScreen />;
}

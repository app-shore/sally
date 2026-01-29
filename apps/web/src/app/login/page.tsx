'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { LoginScreen } from '@/components/auth/LoginScreen';

export default function LoginPage() {
  const router = useRouter();
  const { is_authenticated, user_type } = useSessionStore();

  useEffect(() => {
    // If user is already authenticated, redirect to their dashboard
    if (is_authenticated) {
      if (user_type === 'dispatcher') {
        router.push('/dispatcher/overview');
      } else if (user_type === 'driver') {
        router.push('/driver/dashboard');
      }
    }
  }, [is_authenticated, user_type, router]);

  if (is_authenticated) {
    return null; // Will redirect in useEffect
  }

  return <LoginScreen />;
}

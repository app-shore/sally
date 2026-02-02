'use client';

/**
 * AuthProvider - Simple Firebase auth sync
 * Does NOT handle token exchange or redirects
 * Just keeps firebaseUser in sync with Firebase auth state
 */

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/stores/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setFirebaseUser = useAuthStore(state => state.setFirebaseUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setFirebaseUser(firebaseUser);
    });

    return () => unsubscribe();
  }, [setFirebaseUser]);

  return <>{children}</>;
}

'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/stores/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setFirebaseUser, exchangeFirebaseToken, clearAuth } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);

        // Exchange Firebase token for SALLY JWT
        try {
          const token = await firebaseUser.getIdToken();
          await exchangeFirebaseToken(token);
        } catch (error) {
          console.error('Token exchange failed:', error);
          // If exchange fails, clear auth (might be pending approval, etc.)
          clearAuth();
        }
      } else {
        setFirebaseUser(null);
      }
    });

    return () => unsubscribe();
  }, [setFirebaseUser, exchangeFirebaseToken, clearAuth]);

  return <>{children}</>;
}

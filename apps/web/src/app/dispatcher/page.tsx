'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DispatcherPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to overview page
    router.replace('/dispatcher/overview');
  }, [router]);

  return null;
}

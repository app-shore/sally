'use client';

import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';

interface OnboardingBannerProps {
  incompleteCount: number;
  onDismiss: () => void;
}

export function OnboardingBanner({ incompleteCount, onDismiss }: OnboardingBannerProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show on setup hub page itself
  if (pathname === '/setup-hub') {
    return null;
  }

  const handleCompleteSetup = () => {
    router.push('/setup-hub');
  };

  return (
    <div className="sticky top-0 z-40 border-b border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-900 dark:text-amber-100" />
          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Setup incomplete: {incompleteCount} of 3 critical {incompleteCount === 1 ? 'step' : 'steps'} remaining
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCompleteSetup}
            className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-800"
          >
            Complete Setup
          </Button>
          <button
            onClick={onDismiss}
            className="rounded-md p-1 text-amber-900 transition-colors hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

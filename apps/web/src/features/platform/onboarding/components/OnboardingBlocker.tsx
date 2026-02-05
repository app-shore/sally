'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { OnboardingItem } from '@/stores/onboardingStore';

interface OnboardingBlockerProps {
  incompleteCriticalItems: OnboardingItem[];
}

export function OnboardingBlocker({ incompleteCriticalItems }: OnboardingBlockerProps) {
  const router = useRouter();

  const handleGoToSetup = () => {
    router.push('/setup-hub');
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Setup Required</h2>
            <p className="text-muted-foreground">
              Complete these steps to start planning routes
            </p>
          </div>

          <div className="w-full space-y-3 rounded-lg border border-border bg-muted p-4 text-left">
            {incompleteCriticalItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-foreground">{item.title}</span>
              </div>
            ))}
          </div>

          <Button onClick={handleGoToSetup} size="lg" className="w-full sm:w-auto">
            Go to Setup Hub
          </Button>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">Once complete, you'll be able to:</p>
            <ul className="space-y-1">
              <li>• Plan optimized routes</li>
              <li>• Assign drivers to loads</li>
              <li>• Monitor HOS compliance</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OnboardingBlocker;

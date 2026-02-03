'use client';

import { CheckCircle2, Circle, Rocket } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { OnboardingStatus } from '@/lib/store/onboardingStore';

interface OnboardingWidgetProps {
  status: OnboardingStatus;
  onItemClick?: (itemId: string) => void;
}

export function OnboardingWidget({ status, onItemClick }: OnboardingWidgetProps) {
  const router = useRouter();

  const handleContinueSetup = () => {
    router.push('/setup-hub');
  };

  const totalItems =
    status.items.critical.length +
    status.items.recommended.length +
    status.items.optional.length;

  const completedItems =
    status.items.critical.filter((i) => i.complete).length +
    status.items.recommended.filter((i) => i.complete).length +
    status.items.optional.filter((i) => i.complete).length;

  const criticalIncomplete = status.items.critical.filter((i) => !i.complete);
  const recommendedIncomplete = status.items.recommended.filter((i) => !i.complete);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Setup Hub - Get SALLY Running
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Progress: {completedItems}/{totalItems} items complete
            </span>
            <span className="font-medium">{status.overallProgress}%</span>
          </div>
          <Progress value={status.overallProgress} className="h-2" />
        </div>

        {criticalIncomplete.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">
              Critical ({criticalIncomplete.length} remaining)
            </h4>
            {status.items.critical.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                {item.complete ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <Circle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                )}
                <span className={item.complete ? 'text-muted-foreground line-through' : 'text-foreground'}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {recommendedIncomplete.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">
              Recommended ({recommendedIncomplete.length} remaining)
            </h4>
            {status.items.recommended.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                {item.complete ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
                <span className={item.complete ? 'text-muted-foreground line-through' : 'text-foreground'}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        )}

        <Button onClick={handleContinueSetup} className="w-full" variant="outline">
          Continue Setup →
        </Button>
      </CardContent>
    </Card>
  );
}

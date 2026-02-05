'use client';

import { CheckCircle2, AlertTriangle, Zap, ExternalLink } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { OnboardingItem } from '@/features/platform/onboarding';
import { useRouter } from 'next/navigation';

interface OnboardingItemCardProps {
  item: OnboardingItem;
  priority: 'critical' | 'recommended' | 'optional';
  actionLink?: string;
  actionLabel?: string;
  description?: string;
  whyMatters?: string;
  statusText?: string;
}

export function OnboardingItemCard({
  item,
  priority,
  actionLink,
  actionLabel,
  description,
  whyMatters,
  statusText,
}: OnboardingItemCardProps) {
  const router = useRouter();

  const handleActionClick = () => {
    if (actionLink) {
      router.push(actionLink);
    }
  };

  const getStatusIcon = () => {
    if (item.complete) {
      return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    }
    if (priority === 'critical') {
      return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
    }
    if (priority === 'recommended') {
      return <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
    return <CheckCircle2 className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <AccordionItem value={item.id} className="border-b border-border">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          {getStatusIcon()}
          <span className={item.complete ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}>
            {item.title}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pl-8 pr-4 pb-2">
          {description && (
            <div>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          )}

          {whyMatters && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Why this matters</h4>
              <p className="text-sm text-muted-foreground">{whyMatters}</p>
            </div>
          )}

          {statusText && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Current status</h4>
              <p className="text-sm text-muted-foreground">{statusText}</p>
            </div>
          )}

          {!item.complete && actionLink && actionLabel && (
            <Button onClick={handleActionClick} size="sm" className="gap-2">
              {actionLabel}
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}

          {item.complete && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Complete</span>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default OnboardingItemCard;

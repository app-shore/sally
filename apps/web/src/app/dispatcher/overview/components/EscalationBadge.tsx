'use client';

import { Badge } from '@/shared/components/ui/badge';
import { ArrowUp } from 'lucide-react';

interface EscalationBadgeProps {
  level: number;
}

export function EscalationBadge({ level }: EscalationBadgeProps) {
  if (level === 0) return null;

  return (
    <Badge variant="destructive" className="gap-1 text-xs">
      <ArrowUp className="h-3 w-3" />
      Escalated L{level}
    </Badge>
  );
}

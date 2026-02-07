'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import type { Alert } from '@/features/operations/alerts/types';
import { EscalationBadge } from './EscalationBadge';

interface AlertGroupProps {
  parentAlert: Alert;
  childAlerts: Alert[];
  onSelect: (alertId: string) => void;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}

export function AlertGroup({ parentAlert, childAlerts, onSelect, onAcknowledge, onResolve }: AlertGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = childAlerts.length > 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => hasChildren ? setExpanded(!expanded) : onSelect(parentAlert.alert_id)}
      >
        {hasChildren && (
          expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        {!hasChildren && <div className="w-4" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground truncate">{parentAlert.title}</span>
            <Badge variant={parentAlert.priority === 'critical' ? 'destructive' : 'outline'} className="text-xs">
              {parentAlert.priority}
            </Badge>
            <EscalationBadge level={parentAlert.escalation_level || 0} />
            {hasChildren && (
              <Badge variant="outline" className="text-xs">+{childAlerts.length} related</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">{parentAlert.message}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {parentAlert.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={(e) => { e.stopPropagation(); onAcknowledge(parentAlert.alert_id); }}
            >
              Ack
            </Button>
          )}
          <Button
            size="sm"
            className="text-xs h-7"
            onClick={(e) => { e.stopPropagation(); onResolve(parentAlert.alert_id); }}
          >
            Resolve
          </Button>
        </div>
      </div>

      {expanded && childAlerts.map((child) => (
        <div
          key={child.alert_id}
          className="flex items-center gap-3 p-3 pl-10 border-t border-border bg-muted/30 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => onSelect(child.alert_id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">{child.title}</span>
              <Badge variant="outline" className="text-xs">{child.priority}</Badge>
              <EscalationBadge level={child.escalation_level || 0} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{child.message}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {child.status === 'active' && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={(e) => { e.stopPropagation(); onAcknowledge(child.alert_id); }}
              >
                Ack
              </Button>
            )}
            <Button
              size="sm"
              className="text-xs h-7"
              onClick={(e) => { e.stopPropagation(); onResolve(child.alert_id); }}
            >
              Resolve
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

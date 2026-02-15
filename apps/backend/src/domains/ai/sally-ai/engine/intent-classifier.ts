import type { ClassifiedIntent, Intent } from './types';

interface KeywordRule {
  intent: Intent;
  keywords: string[];
  entities?: { name: string; pattern: RegExp }[];
}

const PROSPECT_RULES: KeywordRule[] = [
  {
    intent: 'demo_request',
    keywords: ['demo', 'trial', 'show me', 'try', 'test drive'],
  },
  {
    intent: 'pricing',
    keywords: ['price', 'pricing', 'cost', 'how much', 'plan', 'subscription'],
  },
  {
    intent: 'integration',
    keywords: ['integrate', 'integration', 'tms', 'eld', 'samsara', 'connect'],
  },
  {
    intent: 'product_info',
    keywords: ['what is', 'what does', 'feature', 'how does', 'capability', 'about sally'],
  },
  {
    intent: 'lead_capture',
    keywords: ['contact', 'reach out', 'get in touch', 'sign up', 'interested'],
  },
];

const DISPATCHER_RULES: KeywordRule[] = [
  {
    intent: 'alert_ack',
    keywords: ['acknowledge', 'ack'],
    entities: [{ name: 'alert_id', pattern: /A-\d{3}/i }],
  },
  {
    intent: 'alert_query',
    keywords: ['alert', 'critical', 'warning'],
  },
  {
    intent: 'driver_lookup',
    keywords: ['driver', 'find driver', 'where is'],
    entities: [{ name: 'driver_name', pattern: /(?:driver|find)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i }],
  },
  {
    intent: 'route_query',
    keywords: ['route', 'routes'],
    entities: [{ name: 'route_id', pattern: /R-\d{3}/i }],
  },
  {
    intent: 'hos_check',
    keywords: ['hos', 'hours of service', 'hours remaining', 'drive time'],
  },
  {
    intent: 'fleet_status',
    keywords: ['fleet', 'overview', 'summary', 'how many', 'status'],
  },
  {
    intent: 'add_note',
    keywords: ['add note', 'note to', 'annotate'],
  },
  {
    intent: 'flag_driver',
    keywords: ['flag', 'follow up', 'follow-up'],
  },
];

const DRIVER_RULES: KeywordRule[] = [
  {
    intent: 'delay_report',
    keywords: ['delay', 'delayed', 'late', 'behind'],
    entities: [{ name: 'duration', pattern: /(\d+)\s*(?:min|minute|hour|hr)/i }],
  },
  {
    intent: 'arrival_report',
    keywords: ['arrived', 'here', 'at the', 'pulled in'],
  },
  {
    intent: 'fuel_stop_report',
    keywords: ['fueled', 'fuel stop', 'filled up', 'refueled'],
  },
  {
    intent: 'hos_status',
    keywords: ['break', 'rest', 'hours', 'hos', 'how long', 'next break'],
  },
  {
    intent: 'route_status',
    keywords: ['route', 'next stop', 'progress', 'where am i'],
  },
  {
    intent: 'eta_query',
    keywords: ['eta', 'arrive', 'when do i', 'how far', 'time left'],
  },
  {
    intent: 'weather_query',
    keywords: ['weather', 'storm', 'rain', 'snow', 'wind'],
  },
];

function getRulesForMode(mode: string): KeywordRule[] {
  switch (mode) {
    case 'prospect': return PROSPECT_RULES;
    case 'dispatcher': return DISPATCHER_RULES;
    case 'driver': return DRIVER_RULES;
    default: return PROSPECT_RULES;
  }
}

export function classifyIntent(message: string, mode: string): ClassifiedIntent {
  const lower = message.toLowerCase();
  const rules = getRulesForMode(mode);
  let bestMatch: ClassifiedIntent | null = null;
  let bestScore = 0;

  for (const rule of rules) {
    let matchCount = 0;

    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(0.5 + matchCount * 0.2, 1.0);

      if (confidence > bestScore) {
        const entities: Record<string, string> = {};
        if (rule.entities) {
          for (const entity of rule.entities) {
            const match = message.match(entity.pattern);
            if (match) {
              entities[entity.name] = match[1] || match[0];
            }
          }
        }

        bestMatch = { intent: rule.intent, confidence, entities };
        bestScore = confidence;
      }
    }
  }

  return bestMatch ?? { intent: 'general', confidence: 0.3, entities: {} };
}

# Sally AI Nerve Center — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the existing mock chat into a production-ready AI assistant with voice and text capabilities, three user modes (prospect/dispatcher/driver), intent-based mock engine, animated orb, and rich response cards.

**Architecture:** New `features/platform/sally-ai/` directory replaces `features/platform/chat/`. A collapsible "Sally Strip" with animated orb docks to the right edge. A keyword-based intent classifier routes user messages to handler functions that return structured responses with optional rich cards. Voice input (Web Speech API STT) and voice readback (SpeechSynthesis TTS) are layered on top. The engine layer is designed for future Claude API swap with zero UI changes.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Zustand 5, Framer Motion 12, Web Speech API, SpeechSynthesis API, Shadcn/ui, Tailwind CSS with dark theme tokens.

**Design Doc:** `.docs/plans/2026-02-08-sally-ai-nerve-center-design.md`

---

## Task 1: Types & Mock Data

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/engine/types.ts`
- Create: `apps/web/src/features/platform/sally-ai/engine/mock-data.ts`

**Step 1: Create the types file**

Create `apps/web/src/features/platform/sally-ai/engine/types.ts`:

```typescript
// ── User Modes ──
export type UserMode = 'prospect' | 'dispatcher' | 'driver';

// ── Orb States ──
export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

// ── Input Mode ──
export type InputMode = 'voice' | 'text';

// ── Intent names by mode ──
export type ProspectIntent =
  | 'product_info'
  | 'pricing'
  | 'integration'
  | 'demo_request'
  | 'lead_capture'
  | 'general';

export type DispatcherIntent =
  | 'alert_query'
  | 'alert_ack'
  | 'driver_lookup'
  | 'route_query'
  | 'hos_check'
  | 'fleet_status'
  | 'add_note'
  | 'flag_driver'
  | 'general';

export type DriverIntent =
  | 'route_status'
  | 'hos_status'
  | 'eta_query'
  | 'delay_report'
  | 'arrival_report'
  | 'fuel_stop_report'
  | 'weather_query'
  | 'general';

export type Intent = ProspectIntent | DispatcherIntent | DriverIntent;

// ── Classified Intent ──
export interface ClassifiedIntent {
  intent: Intent;
  confidence: number;
  entities: Record<string, string>;
}

// ── Rich Cards ──
export type RichCardType = 'alert' | 'alert_list' | 'driver' | 'route' | 'hos' | 'fleet' | 'lead_form';

export interface RichCard {
  type: RichCardType;
  data: Record<string, unknown>;
}

// ── Action Results ──
export interface ActionResult {
  type: string;
  success: boolean;
  message: string;
}

// ── Sally Response ──
export interface SallyResponse {
  text: string;
  card?: RichCard;
  followUp?: string;
  action?: ActionResult;
  speakText?: string;
}

// ── Chat Message ──
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  inputMode: InputMode;
  timestamp: Date;
  intent?: Intent;
  card?: RichCard;
  action?: ActionResult;
  speakText?: string;
}

// ── Lead Data ──
export interface LeadData {
  name?: string;
  email?: string;
  fleetSize?: string;
}

// ── Mock Data Types ──
export interface MockDriver {
  id: string;
  name: string;
  status: 'driving' | 'at_dock' | 'resting' | 'off_duty';
  hos_remaining: number;
  vehicle: string;
  current_route: string | null;
}

export interface MockAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  driver: string | null;
  vehicle?: string;
  message: string;
  route: string;
}

export interface MockRoute {
  id: string;
  origin: string;
  destination: string;
  stops: number;
  eta: string;
  status: 'in_progress' | 'planned' | 'completed';
  driver: string | null;
}

export interface MockFleet {
  active_vehicles: number;
  active_routes: number;
  pending_alerts: number;
  drivers_available: number;
  drivers_driving: number;
  drivers_resting: number;
}

// ── Voice Provider Interfaces ──
export interface STTProvider {
  start(): void;
  stop(): void;
  onResult: ((transcript: string, isFinal: boolean) => void) | null;
  onError: ((error: Error) => void) | null;
  isSupported: boolean;
}

export interface TTSProvider {
  speak(text: string): Promise<void>;
  stop(): void;
  isSpeaking: boolean;
  isSupported: boolean;
}
```

**Step 2: Create the mock data file**

Create `apps/web/src/features/platform/sally-ai/engine/mock-data.ts`:

```typescript
import type { MockDriver, MockAlert, MockRoute, MockFleet } from './types';

export const MOCK_DRIVERS: MockDriver[] = [
  { id: 'D-001', name: 'John Davis', status: 'driving', hos_remaining: 4.2, vehicle: 'V-101', current_route: 'R-456' },
  { id: 'D-002', name: 'Mike Johnson', status: 'at_dock', hos_remaining: 7.8, vehicle: 'V-102', current_route: 'R-789' },
  { id: 'D-003', name: 'Sarah Chen', status: 'resting', hos_remaining: 0, vehicle: 'V-103', current_route: null },
  { id: 'D-004', name: 'Carlos Rivera', status: 'driving', hos_remaining: 6.1, vehicle: 'V-104', current_route: 'R-012' },
  { id: 'D-005', name: 'Lisa Thompson', status: 'off_duty', hos_remaining: 11, vehicle: 'V-105', current_route: null },
];

export const MOCK_ALERTS: MockAlert[] = [
  { id: 'A-101', severity: 'critical', type: 'hos_warning', driver: 'John Davis', message: '2.1 hrs remaining on drive window', route: 'R-456' },
  { id: 'A-102', severity: 'warning', type: 'delay', driver: null, message: '45 min behind ETA', route: 'R-456' },
  { id: 'A-103', severity: 'info', type: 'fuel_low', vehicle: 'V-789', driver: null, message: 'Range: 45 miles', route: 'R-789' },
  { id: 'A-104', severity: 'critical', type: 'driver_not_moving', driver: 'Mike Johnson', message: 'Stationary for 47 minutes at dock', route: 'R-789' },
  { id: 'A-105', severity: 'warning', type: 'weather', driver: null, message: 'Severe thunderstorm warning on I-40', route: 'R-012' },
];

export const MOCK_ROUTES: MockRoute[] = [
  { id: 'R-456', origin: 'Dallas, TX', destination: 'Houston, TX', stops: 3, eta: '3:45 PM', status: 'in_progress', driver: 'John Davis' },
  { id: 'R-789', origin: 'Chicago, IL', destination: 'Memphis, TN', stops: 5, eta: '8:30 PM', status: 'in_progress', driver: 'Mike Johnson' },
  { id: 'R-012', origin: 'Atlanta, GA', destination: 'Miami, FL', stops: 4, eta: 'Tomorrow 6:00 AM', status: 'in_progress', driver: 'Carlos Rivera' },
  { id: 'R-345', origin: 'Los Angeles, CA', destination: 'Phoenix, AZ', stops: 2, eta: 'Tomorrow 10:00 AM', status: 'planned', driver: null },
];

export const MOCK_FLEET: MockFleet = {
  active_vehicles: 12,
  active_routes: 8,
  pending_alerts: 5,
  drivers_available: 4,
  drivers_driving: 6,
  drivers_resting: 2,
};

// Suggested action chips per mode
export const PROSPECT_SUGGESTIONS = [
  'What is SALLY?',
  'See pricing',
  'Book a demo',
  'Integrations',
];

export const DISPATCHER_SUGGESTIONS = [
  'Active alerts',
  'Fleet status',
  'Find a driver',
  'Route updates',
];

export const DRIVER_SUGGESTIONS = [
  'Next break',
  'My ETA',
  'Route status',
  'Report delay',
];
```

**Step 3: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/engine/types.ts apps/web/src/features/platform/sally-ai/engine/mock-data.ts
git commit -m "feat(sally-ai): add types and mock data for nerve center engine"
```

---

## Task 2: Intent Classifier

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/engine/intent-classifier.ts`

**Step 1: Create intent classifier**

Create `apps/web/src/features/platform/sally-ai/engine/intent-classifier.ts`:

```typescript
import type { ClassifiedIntent, UserMode, Intent } from './types';

interface KeywordRule {
  intent: Intent;
  keywords: string[][];  // OR groups of AND keywords: [[word1 AND word2], [word3 AND word4]]
  entities?: { name: string; pattern: RegExp }[];
}

const PROSPECT_RULES: KeywordRule[] = [
  {
    intent: 'demo_request',
    keywords: [['demo'], ['trial'], ['show me'], ['try'], ['test drive']],
  },
  {
    intent: 'pricing',
    keywords: [['price'], ['pricing'], ['cost'], ['how much'], ['plan'], ['subscription']],
  },
  {
    intent: 'integration',
    keywords: [['integrate'], ['integration'], ['tms'], ['eld'], ['samsara'], ['connect']],
  },
  {
    intent: 'product_info',
    keywords: [['what is'], ['what does'], ['feature'], ['how does'], ['capability'], ['about sally']],
  },
  {
    intent: 'lead_capture',
    keywords: [['contact'], ['reach out'], ['get in touch'], ['sign up'], ['interested']],
  },
];

const DISPATCHER_RULES: KeywordRule[] = [
  {
    intent: 'alert_ack',
    keywords: [['acknowledge'], ['ack']],
    entities: [{ name: 'alert_id', pattern: /A-\d{3}/i }],
  },
  {
    intent: 'alert_query',
    keywords: [['alert'], ['critical'], ['warning']],
  },
  {
    intent: 'driver_lookup',
    keywords: [['driver'], ['find driver'], ['where is']],
    entities: [{ name: 'driver_name', pattern: /(?:driver|find)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i }],
  },
  {
    intent: 'route_query',
    keywords: [['route'], ['routes']],
    entities: [{ name: 'route_id', pattern: /R-\d{3}/i }],
  },
  {
    intent: 'hos_check',
    keywords: [['hos'], ['hours of service'], ['hours remaining'], ['drive time']],
  },
  {
    intent: 'fleet_status',
    keywords: [['fleet'], ['overview'], ['summary'], ['how many'], ['status']],
  },
  {
    intent: 'add_note',
    keywords: [['add note'], ['note to'], ['annotate']],
  },
  {
    intent: 'flag_driver',
    keywords: [['flag'], ['follow up'], ['follow-up']],
  },
];

const DRIVER_RULES: KeywordRule[] = [
  {
    intent: 'delay_report',
    keywords: [['delay'], ['delayed'], ['late'], ['behind']],
    entities: [{ name: 'duration', pattern: /(\d+)\s*(?:min|minute|hour|hr)/i }],
  },
  {
    intent: 'arrival_report',
    keywords: [['arrived'], ['here'], ['at the'], ['pulled in']],
  },
  {
    intent: 'fuel_stop_report',
    keywords: [['fueled'], ['fuel stop'], ['filled up'], ['refueled']],
  },
  {
    intent: 'hos_status',
    keywords: [['break'], ['rest'], ['hours'], ['hos'], ['how long'], ['next break']],
  },
  {
    intent: 'route_status',
    keywords: [['route'], ['next stop'], ['progress'], ['where am i']],
  },
  {
    intent: 'eta_query',
    keywords: [['eta'], ['arrive'], ['when do i'], ['how far'], ['time left']],
  },
  {
    intent: 'weather_query',
    keywords: [['weather'], ['storm'], ['rain'], ['snow'], ['wind']],
  },
];

function getRulesForMode(mode: UserMode): KeywordRule[] {
  switch (mode) {
    case 'prospect': return PROSPECT_RULES;
    case 'dispatcher': return DISPATCHER_RULES;
    case 'driver': return DRIVER_RULES;
  }
}

export function classifyIntent(message: string, mode: UserMode): ClassifiedIntent {
  const lower = message.toLowerCase();
  const rules = getRulesForMode(mode);
  let bestMatch: ClassifiedIntent | null = null;
  let bestScore = 0;

  for (const rule of rules) {
    let matched = false;
    let matchCount = 0;

    for (const keywordGroup of rule.keywords) {
      // Each element in keywordGroup is a phrase to match
      const phrase = typeof keywordGroup === 'string' ? keywordGroup : keywordGroup[0];
      if (lower.includes(phrase)) {
        matched = true;
        matchCount++;
      }
    }

    if (matched) {
      const confidence = Math.min(0.5 + matchCount * 0.2, 1.0);

      if (confidence > bestScore) {
        // Extract entities
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
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/engine/intent-classifier.ts
git commit -m "feat(sally-ai): add keyword-based intent classifier"
```

---

## Task 3: Response Generator

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/engine/response-generator.ts`

**Step 1: Create response generator**

Create `apps/web/src/features/platform/sally-ai/engine/response-generator.ts`:

```typescript
import type { ClassifiedIntent, SallyResponse, UserMode } from './types';
import { MOCK_DRIVERS, MOCK_ALERTS, MOCK_ROUTES, MOCK_FLEET } from './mock-data';

// ── Prospect Handlers ──

function handleProductInfo(): SallyResponse {
  return {
    text: "SALLY is your fleet operations assistant. I handle route planning with HOS-aware optimization, continuous monitoring with 14 trigger types, and proactive dispatcher alerts. Want to know about pricing or see a demo?",
    speakText: "SALLY is your fleet operations assistant. I handle route planning, continuous monitoring, and proactive dispatcher alerts. Want to know about pricing or see a demo?",
  };
}

function handlePricing(): SallyResponse {
  return {
    text: "SALLY pricing is based on fleet size and features. We offer flexible plans from basic route planning to full enterprise monitoring with API access. Most fleets see ROI within the first month from violation prevention alone. Want me to connect you with sales for a custom quote?",
    followUp: "What size is your fleet?",
  };
}

function handleIntegration(): SallyResponse {
  return {
    text: "Yes! SALLY integrates with major TMS platforms (McLeod, TMW), ELD systems (Samsara, KeepTruckin), and external data sources for fuel prices, weather, and traffic. We provide REST APIs and webhooks for seamless integration.",
    speakText: "Yes, SALLY integrates with major TMS platforms, ELD systems, and external data sources. We provide REST APIs and webhooks.",
  };
}

function handleDemoRequest(): SallyResponse {
  return {
    text: "I'd love to show you SALLY in action! You can explore the dispatcher dashboard right now, or I can help you schedule a personalized demo with our team. What works better for you?",
    followUp: "Would you like to try the dashboard or schedule a call?",
  };
}

function handleLeadCapture(): SallyResponse {
  return {
    text: "I'd love to send you more details! Let me get a few quick things from you.",
    card: { type: 'lead_form', data: {} },
    speakText: "I'd love to send you more details. Please fill in the form.",
  };
}

// ── Dispatcher Handlers ──

function handleAlertQuery(): SallyResponse {
  const critical = MOCK_ALERTS.filter(a => a.severity === 'critical');
  const warning = MOCK_ALERTS.filter(a => a.severity === 'warning');
  const info = MOCK_ALERTS.filter(a => a.severity === 'info');

  return {
    text: `You have ${MOCK_ALERTS.length} active alerts: ${critical.length} critical, ${warning.length} warning, ${info.length} info.`,
    card: {
      type: 'alert_list',
      data: { alerts: MOCK_ALERTS },
    },
    followUp: "Want me to acknowledge any of these?",
    speakText: `You have ${MOCK_ALERTS.length} active alerts. ${critical.length} are critical.`,
  };
}

function handleAlertAck(entities: Record<string, string>): SallyResponse {
  const alertId = entities.alert_id;
  if (!alertId) {
    return {
      text: "Which alert would you like me to acknowledge? Give me the alert ID (e.g., A-101).",
    };
  }
  const alert = MOCK_ALERTS.find(a => a.id.toLowerCase() === alertId.toLowerCase());
  if (!alert) {
    return { text: `I couldn't find alert ${alertId}. Current alerts: ${MOCK_ALERTS.map(a => a.id).join(', ')}.` };
  }
  return {
    text: `Done. Alert ${alert.id} ("${alert.message}") has been acknowledged.`,
    action: { type: 'alert_ack', success: true, message: `Acknowledged ${alert.id}` },
    card: { type: 'alert', data: { ...alert, acknowledged: true } },
    speakText: `Alert ${alert.id} acknowledged.`,
  };
}

function handleDriverLookup(entities: Record<string, string>): SallyResponse {
  const name = entities.driver_name;
  let driver;

  if (name) {
    driver = MOCK_DRIVERS.find(d => d.name.toLowerCase().includes(name.toLowerCase()));
  }

  if (!driver && name) {
    return { text: `I couldn't find a driver named "${name}". Available drivers: ${MOCK_DRIVERS.map(d => d.name).join(', ')}.` };
  }

  if (!driver) {
    // Return all drivers
    return {
      text: `Here are all ${MOCK_DRIVERS.length} drivers on file.`,
      card: { type: 'driver', data: { drivers: MOCK_DRIVERS } },
    };
  }

  const routeInfo = driver.current_route
    ? ` on route ${driver.current_route}`
    : ', currently unassigned';

  return {
    text: `${driver.name} is currently ${driver.status.replace('_', ' ')}${routeInfo}. ${driver.hos_remaining > 0 ? `${driver.hos_remaining} hours remaining on drive window.` : 'Off duty / resting.'}`,
    card: { type: 'driver', data: driver },
    speakText: `${driver.name} is ${driver.status.replace('_', ' ')} with ${driver.hos_remaining} hours remaining.`,
  };
}

function handleRouteQuery(entities: Record<string, string>): SallyResponse {
  const routeId = entities.route_id;

  if (routeId) {
    const route = MOCK_ROUTES.find(r => r.id.toLowerCase() === routeId.toLowerCase());
    if (!route) {
      return { text: `Route ${routeId} not found. Active routes: ${MOCK_ROUTES.map(r => r.id).join(', ')}.` };
    }
    return {
      text: `Route ${route.id}: ${route.origin} → ${route.destination}. ${route.stops} stops, ETA ${route.eta}. Status: ${route.status.replace('_', ' ')}. Driver: ${route.driver || 'unassigned'}.`,
      card: { type: 'route', data: route },
      speakText: `Route ${route.id} from ${route.origin} to ${route.destination}. ETA ${route.eta}. Status ${route.status.replace('_', ' ')}.`,
    };
  }

  return {
    text: `${MOCK_ROUTES.length} active routes. ${MOCK_ROUTES.filter(r => r.status === 'in_progress').length} in progress, ${MOCK_ROUTES.filter(r => r.status === 'planned').length} planned.`,
    card: { type: 'route', data: { routes: MOCK_ROUTES } },
    speakText: `${MOCK_ROUTES.length} routes total. ${MOCK_ROUTES.filter(r => r.status === 'in_progress').length} currently in progress.`,
  };
}

function handleHosCheck(): SallyResponse {
  const driving = MOCK_DRIVERS.filter(d => d.status === 'driving');
  const lowHos = driving.filter(d => d.hos_remaining < 3);

  let text = `${driving.length} drivers currently driving.`;
  if (lowHos.length > 0) {
    text += ` ${lowHos.length} approaching HOS limits: ${lowHos.map(d => `${d.name} (${d.hos_remaining}h)`).join(', ')}.`;
  } else {
    text += ' All within safe HOS margins.';
  }

  return {
    text,
    card: { type: 'hos', data: { drivers: driving } },
    speakText: `${driving.length} drivers driving. ${lowHos.length} approaching HOS limits.`,
  };
}

function handleFleetStatus(): SallyResponse {
  return {
    text: `Fleet overview: ${MOCK_FLEET.active_vehicles} active vehicles, ${MOCK_FLEET.active_routes} active routes, ${MOCK_FLEET.pending_alerts} pending alerts. Drivers: ${MOCK_FLEET.drivers_driving} driving, ${MOCK_FLEET.drivers_available} available, ${MOCK_FLEET.drivers_resting} resting.`,
    card: { type: 'fleet', data: MOCK_FLEET },
    speakText: `${MOCK_FLEET.active_vehicles} vehicles active. ${MOCK_FLEET.pending_alerts} pending alerts. ${MOCK_FLEET.drivers_driving} drivers on the road.`,
  };
}

// ── Driver Handlers ──

function handleRouteStatus(): SallyResponse {
  // Simulate "current driver" as John Davis (D-001)
  const driver = MOCK_DRIVERS[0];
  const route = MOCK_ROUTES.find(r => r.id === driver.current_route);

  if (!route) {
    return { text: "You don't have an active route right now." };
  }

  return {
    text: `You're on route ${route.id}: ${route.origin} → ${route.destination}. ${route.stops} stops remaining. ETA: ${route.eta}. Status: on track.`,
    card: { type: 'route', data: route },
    speakText: `Route ${route.id}. ${route.stops} stops remaining. ETA ${route.eta}.`,
  };
}

function handleHosStatus(): SallyResponse {
  const driver = MOCK_DRIVERS[0];
  const nextBreakHours = Math.min(driver.hos_remaining, 8);

  return {
    text: `You have ${driver.hos_remaining} hours remaining on your drive window. Next mandatory break in ${nextBreakHours.toFixed(1)} hours (around ${getTimeFromNow(nextBreakHours)}).`,
    card: { type: 'hos', data: { driver, nextBreak: getTimeFromNow(nextBreakHours) } },
    speakText: `${driver.hos_remaining} hours remaining. Next break around ${getTimeFromNow(nextBreakHours)}.`,
  };
}

function handleEtaQuery(): SallyResponse {
  const route = MOCK_ROUTES[0];
  return {
    text: `Your ETA to the next stop is approximately 1 hour 15 minutes. Final destination (${route.destination}) ETA: ${route.eta}.`,
    speakText: `Next stop in about 1 hour 15 minutes. Final destination ETA ${route.eta}.`,
  };
}

function handleDelayReport(entities: Record<string, string>): SallyResponse {
  const duration = entities.duration || 'unknown';
  return {
    text: `Got it. I've logged a ${duration}-minute delay at your current stop. Dispatch has been notified and your route timing has been updated.`,
    action: { type: 'status_updated', success: true, message: `Delay of ${duration} minutes reported` },
    speakText: `Delay of ${duration} minutes logged. Dispatch has been notified.`,
  };
}

function handleArrivalReport(): SallyResponse {
  return {
    text: "Arrival confirmed! I've updated your route status. Take your time — your next segment departs based on the planned schedule.",
    action: { type: 'status_updated', success: true, message: 'Arrival confirmed' },
    speakText: 'Arrival confirmed. Route status updated.',
  };
}

function handleFuelStopReport(): SallyResponse {
  return {
    text: "Fuel stop logged. Your range has been updated. Safe travels on the next segment!",
    action: { type: 'status_updated', success: true, message: 'Fuel stop completed' },
    speakText: 'Fuel stop logged. Range updated.',
  };
}

function handleWeatherQuery(): SallyResponse {
  return {
    text: "Current weather along your route: Clear skies until Memphis. Thunderstorm warning on I-40 near Little Rock starting at 6 PM. Consider adjusting your schedule if passing through that area.",
    speakText: "Clear skies ahead. Thunderstorm warning near Little Rock after 6 PM.",
  };
}

// ── General Handler ──

function handleGeneral(mode: UserMode): SallyResponse {
  switch (mode) {
    case 'prospect':
      return {
        text: "I can help you learn about SALLY's fleet operations platform. Ask me about route planning, HOS compliance, monitoring, integrations, pricing, or request a demo!",
      };
    case 'dispatcher':
      return {
        text: "I can help with alerts, fleet status, driver lookups, route queries, HOS checks, and more. Try asking: 'Show me active alerts' or 'Find driver John'.",
      };
    case 'driver':
      return {
        text: "I can help with your route status, HOS, ETA, delays, fuel stops, and weather. Try: 'When is my next break?' or 'What's my ETA?'",
      };
  }
}

// ── Main Router ──

export function generateResponse(classified: ClassifiedIntent, mode: UserMode): SallyResponse {
  const { intent, entities } = classified;

  switch (intent) {
    // Prospect
    case 'product_info': return handleProductInfo();
    case 'pricing': return handlePricing();
    case 'integration': return handleIntegration();
    case 'demo_request': return handleDemoRequest();
    case 'lead_capture': return handleLeadCapture();

    // Dispatcher
    case 'alert_query': return handleAlertQuery();
    case 'alert_ack': return handleAlertAck(entities);
    case 'driver_lookup': return handleDriverLookup(entities);
    case 'route_query': return handleRouteQuery(entities);
    case 'hos_check': return handleHosCheck();
    case 'fleet_status': return handleFleetStatus();
    case 'add_note': return { text: "Note added. I'll attach it to the relevant record.", action: { type: 'note_added', success: true, message: 'Note added' } };
    case 'flag_driver': return { text: "Driver flagged for follow-up. It'll appear in your action items.", action: { type: 'driver_flagged', success: true, message: 'Driver flagged' } };

    // Driver
    case 'route_status': return handleRouteStatus();
    case 'hos_status': return handleHosStatus();
    case 'eta_query': return handleEtaQuery();
    case 'delay_report': return handleDelayReport(entities);
    case 'arrival_report': return handleArrivalReport();
    case 'fuel_stop_report': return handleFuelStopReport();
    case 'weather_query': return handleWeatherQuery();

    // Fallback
    case 'general':
    default:
      return handleGeneral(mode);
  }
}

// ── Helpers ──

function getTimeFromNow(hours: number): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + hours * 60);
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/engine/response-generator.ts
git commit -m "feat(sally-ai): add response generator with handlers for all intents"
```

---

## Task 4: Zustand Store

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/store.ts`

**Step 1: Create the store**

Create `apps/web/src/features/platform/sally-ai/store.ts`:

```typescript
import { create } from 'zustand';
import type { ChatMessage, OrbState, UserMode, LeadData, InputMode } from './engine/types';
import { classifyIntent } from './engine/intent-classifier';
import { generateResponse } from './engine/response-generator';

interface SallyState {
  // Strip state
  isOpen: boolean;
  isExpanded: boolean;

  // Session
  sessionId: string | null;
  messages: ChatMessage[];

  // Voice
  orbState: OrbState;
  isVoiceEnabled: boolean;
  isTTSEnabled: boolean;
  isMicActive: boolean;
  interimTranscript: string;

  // User context
  userMode: UserMode;

  // Lead capture (prospect mode)
  leadData: LeadData | null;
  leadCaptureStep: number;

  // Actions
  toggleStrip: () => void;
  expandStrip: () => void;
  collapseStrip: () => void;
  setUserMode: (mode: UserMode) => void;
  sendMessage: (content: string, inputMode: InputMode) => void;
  setOrbState: (state: OrbState) => void;
  toggleTTS: () => void;
  toggleMic: () => void;
  setMicActive: (active: boolean) => void;
  setInterimTranscript: (text: string) => void;
  clearSession: () => void;
}

function createSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getGreeting(mode: UserMode): string {
  switch (mode) {
    case 'prospect':
      return "Hi! I'm SALLY. I can tell you about our fleet operations platform, pricing, integrations, or set up a demo. What would you like to know?";
    case 'dispatcher':
      return "Hi! I'm SALLY. I can check alerts, look up drivers, query routes, and manage your fleet. What do you need?";
    case 'driver':
      return "Hey! I'm SALLY. I can show your route, check HOS, report delays, or find fuel. What's up?";
  }
}

function createInitialMessage(mode: UserMode): ChatMessage {
  return {
    id: 'initial',
    role: 'assistant',
    content: getGreeting(mode),
    inputMode: 'text',
    timestamp: new Date(),
    speakText: getGreeting(mode),
  };
}

export const useSallyStore = create<SallyState>((set, get) => ({
  // Initial state
  isOpen: false,
  isExpanded: false,
  sessionId: null,
  messages: [],
  orbState: 'idle',
  isVoiceEnabled: false,
  isTTSEnabled: false,
  isMicActive: false,
  interimTranscript: '',
  userMode: 'prospect',
  leadData: null,
  leadCaptureStep: 0,

  // Actions
  toggleStrip: () => set(state => {
    const nextOpen = !state.isOpen;
    // If opening and no session, initialize
    if (nextOpen && !state.sessionId) {
      return {
        isOpen: true,
        isExpanded: true,
        sessionId: createSessionId(),
        messages: [createInitialMessage(state.userMode)],
      };
    }
    return { isOpen: nextOpen, isExpanded: nextOpen ? state.isExpanded : false };
  }),

  expandStrip: () => set(state => {
    if (!state.sessionId) {
      return {
        isExpanded: true,
        isOpen: true,
        sessionId: createSessionId(),
        messages: [createInitialMessage(state.userMode)],
      };
    }
    return { isExpanded: true, isOpen: true };
  }),

  collapseStrip: () => set({ isExpanded: false }),

  setUserMode: (mode) => set(state => {
    if (mode === state.userMode) return {};
    // Reset session on mode change
    return {
      userMode: mode,
      sessionId: null,
      messages: [],
      leadData: null,
      leadCaptureStep: 0,
      // Set voice defaults per mode
      isTTSEnabled: mode === 'driver',
      isVoiceEnabled: mode !== 'prospect',
    };
  }),

  sendMessage: (content, inputMode) => {
    const state = get();
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      inputMode,
      timestamp: new Date(),
    };

    // Add user message and set thinking state
    set(s => ({
      messages: [...s.messages, userMessage],
      orbState: 'thinking' as OrbState,
      interimTranscript: '',
    }));

    // Simulate processing delay (300-800ms)
    const delay = 300 + Math.random() * 500;
    setTimeout(() => {
      const currentState = get();
      const classified = classifyIntent(content, currentState.userMode);
      const response = generateResponse(classified, currentState.userMode);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.text + (response.followUp ? `\n\n${response.followUp}` : ''),
        inputMode: 'text',
        timestamp: new Date(),
        intent: classified.intent,
        card: response.card,
        action: response.action,
        speakText: response.speakText,
      };

      set(s => ({
        messages: [...s.messages, assistantMessage],
        orbState: 'idle' as OrbState,
      }));
    }, delay);
  },

  setOrbState: (orbState) => set({ orbState }),
  toggleTTS: () => set(state => ({ isTTSEnabled: !state.isTTSEnabled })),
  toggleMic: () => set(state => ({ isMicActive: !state.isMicActive })),
  setMicActive: (active) => set({ isMicActive: active }),
  setInterimTranscript: (text) => set({ interimTranscript: text }),

  clearSession: () => set({
    sessionId: null,
    messages: [],
    orbState: 'idle',
    isMicActive: false,
    interimTranscript: '',
    leadData: null,
    leadCaptureStep: 0,
  }),
}));
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/store.ts
git commit -m "feat(sally-ai): add Zustand store with session, voice, and mode management"
```

---

## Task 5: Voice Hooks (STT + TTS)

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/voice/use-speech-recognition.ts`
- Create: `apps/web/src/features/platform/sally-ai/voice/use-speech-synthesis.ts`
- Create: `apps/web/src/features/platform/sally-ai/voice/types.ts`

**Step 1: Create voice types**

Create `apps/web/src/features/platform/sally-ai/voice/types.ts`:

```typescript
export interface STTHookResult {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  start: () => void;
  stop: () => void;
  error: string | null;
}

export interface TTSHookResult {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  stop: () => void;
  error: string | null;
}
```

**Step 2: Create STT hook**

Create `apps/web/src/features/platform/sally-ai/voice/use-speech-recognition.ts`:

```typescript
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { STTHookResult } from './types';

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as Record<string, unknown>).SpeechRecognition ??
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  ) as (new () => SpeechRecognitionInstance) | null ?? null;
}

export function useSpeechRecognition(): STTHookResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isSupported = typeof window !== 'undefined' && !!getSpeechRecognitionConstructor();

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) setTranscript(final);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, isSupported, transcript, interimTranscript, start, stop, error };
}
```

**Step 3: Create TTS hook**

Create `apps/web/src/features/platform/sally-ai/voice/use-speech-synthesis.ts`:

```typescript
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TTSHookResult } from './types';

export function useSpeechSynthesis(): TTSHookResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported) {
      setError('Speech synthesis not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    setError(null);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      v => v.name.includes('Google UK English Female') ||
           v.name.includes('Samantha') ||
           v.name.includes('Karen') ||
           (v.lang === 'en-US' && v.localService)
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      setError(`Speech synthesis error: ${e.error}`);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return { isSpeaking, isSupported, speak, stop, error };
}
```

**Step 4: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/voice/
git commit -m "feat(sally-ai): add speech recognition (STT) and speech synthesis (TTS) hooks"
```

---

## Task 6: SallyOrb Component

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/components/SallyOrb.tsx`

**Step 1: Create the orb component**

Create `apps/web/src/features/platform/sally-ai/components/SallyOrb.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import type { OrbState } from '../engine/types';

interface SallyOrbProps {
  state: OrbState;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const sizeMap = { sm: 32, md: 48, lg: 64 };

const orbAnimations: Record<OrbState, object> = {
  idle: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
  },
  listening: {
    scale: 1.1,
    opacity: 1,
  },
  thinking: {
    scale: [1, 1.08, 1],
    rotate: [0, 5, -5, 0],
  },
  speaking: {
    scale: [1, 1.03, 1],
  },
};

const orbTransitions: Record<OrbState, object> = {
  idle: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  listening: { duration: 0.3 },
  thinking: { duration: 1, repeat: Infinity },
  speaking: { duration: 0.5, repeat: Infinity },
};

export function SallyOrb({ state, size = 'md', onClick, className = '' }: SallyOrbProps) {
  const px = sizeMap[size];

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center focus:outline-none ${className}`}
      style={{ width: px, height: px }}
      aria-label={`SALLY assistant - ${state}`}
    >
      {/* Ripple rings for speaking state */}
      {state === 'speaking' && [0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-gray-400 dark:border-gray-600"
          style={{ width: px, height: px }}
          initial={{ scale: 1, opacity: 0.3 }}
          animate={{ scale: [1, 2 + i], opacity: [0.3, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Glow ring for listening state */}
      {state === 'listening' && (
        <motion.div
          className="absolute rounded-full"
          style={{ width: px + 12, height: px + 12 }}
          animate={{
            boxShadow: [
              '0 0 15px rgba(150,150,150,0.3)',
              '0 0 30px rgba(150,150,150,0.5)',
              '0 0 15px rgba(150,150,150,0.3)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Main orb */}
      <motion.div
        className="rounded-full bg-black dark:bg-white flex items-center justify-center cursor-pointer"
        style={{ width: px, height: px }}
        animate={orbAnimations[state]}
        transition={orbTransitions[state]}
      >
        {/* S icon */}
        <svg
          width={px * 0.5}
          height={px * 0.5}
          viewBox="0 0 32 32"
          fill="none"
        >
          <path
            d="M 16 8 Q 10 8, 10 12 Q 10 14, 13 15 Q 19 16, 19 19 Q 19 22, 16 22 Q 12 22, 10 19"
            stroke="white"
            className="dark:stroke-black"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </motion.div>
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/components/SallyOrb.tsx
git commit -m "feat(sally-ai): add animated SallyOrb with 4 visual states"
```

---

## Task 7: Rich Response Cards

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/components/cards/AlertCard.tsx`
- Create: `apps/web/src/features/platform/sally-ai/components/cards/DriverCard.tsx`
- Create: `apps/web/src/features/platform/sally-ai/components/cards/RouteCard.tsx`
- Create: `apps/web/src/features/platform/sally-ai/components/cards/HOSCard.tsx`
- Create: `apps/web/src/features/platform/sally-ai/components/cards/FleetCard.tsx`
- Create: `apps/web/src/features/platform/sally-ai/components/cards/LeadFormCard.tsx`
- Create: `apps/web/src/features/platform/sally-ai/components/cards/RichCardRenderer.tsx`

**Step 1: Create AlertCard**

Create `apps/web/src/features/platform/sally-ai/components/cards/AlertCard.tsx`:

```tsx
'use client';

import { Badge } from '@/shared/components/ui/badge';
import type { MockAlert } from '../../engine/types';

const severityStyles: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export function AlertCard({ data }: { data: Record<string, unknown> }) {
  // Single alert
  if (data.id) {
    const alert = data as unknown as MockAlert & { acknowledged?: boolean };
    return (
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Badge className={severityStyles[alert.severity]}>{alert.severity}</Badge>
          <span className="text-xs text-muted-foreground">{alert.id}</span>
        </div>
        <p className="text-sm text-foreground">{alert.message}</p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {alert.driver && <span>Driver: {alert.driver}</span>}
          <span>Route: {alert.route}</span>
        </div>
        {alert.acknowledged && (
          <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-400">
            Acknowledged
          </Badge>
        )}
      </div>
    );
  }

  // Alert list
  const alerts = (data.alerts ?? []) as MockAlert[];
  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <div key={alert.id} className="rounded-lg border border-border bg-card p-2 flex items-center gap-3">
          <Badge className={`${severityStyles[alert.severity]} text-[10px] px-1.5 py-0.5`}>
            {alert.severity === 'critical' ? '!!!' : alert.severity === 'warning' ? '!!' : 'i'}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">{alert.message}</p>
            <p className="text-[10px] text-muted-foreground">{alert.id} {alert.driver ? `· ${alert.driver}` : ''}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Create DriverCard**

Create `apps/web/src/features/platform/sally-ai/components/cards/DriverCard.tsx`:

```tsx
'use client';

import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import type { MockDriver } from '../../engine/types';

const statusStyles: Record<string, string> = {
  driving: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  at_dock: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  resting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  off_duty: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

export function DriverCard({ data }: { data: Record<string, unknown> }) {
  // Multiple drivers
  if (Array.isArray(data.drivers)) {
    const drivers = data.drivers as MockDriver[];
    return (
      <div className="space-y-2">
        {drivers.map(driver => (
          <div key={driver.id} className="rounded-lg border border-border bg-card p-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-foreground">
              {driver.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{driver.name}</p>
              <div className="flex items-center gap-2">
                <Badge className={`${statusStyles[driver.status]} text-[10px] px-1.5 py-0`}>
                  {driver.status.replace('_', ' ')}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{driver.hos_remaining}h HOS</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Single driver
  const driver = data as unknown as MockDriver;
  const hosPercent = (driver.hos_remaining / 11) * 100;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-foreground">
          {driver.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{driver.name}</p>
          <Badge className={statusStyles[driver.status]}>{driver.status.replace('_', ' ')}</Badge>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>HOS Remaining</span>
          <span>{driver.hos_remaining}h / 11h</span>
        </div>
        <Progress value={hosPercent} className="h-2" />
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Vehicle: {driver.vehicle}</span>
        {driver.current_route && <span>Route: {driver.current_route}</span>}
      </div>
    </div>
  );
}
```

**Step 3: Create RouteCard**

Create `apps/web/src/features/platform/sally-ai/components/cards/RouteCard.tsx`:

```tsx
'use client';

import { Badge } from '@/shared/components/ui/badge';
import type { MockRoute } from '../../engine/types';

const statusBadge: Record<string, string> = {
  in_progress: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

export function RouteCard({ data }: { data: Record<string, unknown> }) {
  // Multiple routes
  if (Array.isArray(data.routes)) {
    const routes = data.routes as MockRoute[];
    return (
      <div className="space-y-2">
        {routes.map(route => (
          <div key={route.id} className="rounded-lg border border-border bg-card p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{route.id}</span>
              <Badge className={`${statusBadge[route.status]} text-[10px] px-1.5 py-0`}>
                {route.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">{route.origin} → {route.destination}</p>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span>{route.stops} stops</span>
              <span>ETA: {route.eta}</span>
              {route.driver && <span>{route.driver}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Single route
  const route = data as unknown as MockRoute;
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{route.id}</span>
        <Badge className={statusBadge[route.status]}>{route.status.replace('_', ' ')}</Badge>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="text-foreground font-medium">{route.origin} → {route.destination}</p>
        <div className="flex gap-4">
          <span>{route.stops} stops</span>
          <span>ETA: {route.eta}</span>
        </div>
        {route.driver && <p>Driver: {route.driver}</p>}
      </div>
    </div>
  );
}
```

**Step 4: Create HOSCard**

Create `apps/web/src/features/platform/sally-ai/components/cards/HOSCard.tsx`:

```tsx
'use client';

import { Progress } from '@/shared/components/ui/progress';
import type { MockDriver } from '../../engine/types';

export function HOSCard({ data }: { data: Record<string, unknown> }) {
  // Multiple drivers
  if (Array.isArray(data.drivers)) {
    const drivers = data.drivers as MockDriver[];
    return (
      <div className="space-y-2">
        {drivers.map(driver => {
          const hosPercent = (driver.hos_remaining / 11) * 100;
          const isLow = driver.hos_remaining < 3;
          return (
            <div key={driver.id} className="rounded-lg border border-border bg-card p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{driver.name}</span>
                <span className={`text-xs font-medium ${isLow ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}>
                  {driver.hos_remaining}h
                </span>
              </div>
              <Progress value={hosPercent} className="h-1.5" />
            </div>
          );
        })}
      </div>
    );
  }

  // Single driver + next break
  const driver = data.driver as MockDriver;
  const nextBreak = data.nextBreak as string | undefined;
  const hosPercent = (driver.hos_remaining / 11) * 100;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <p className="text-sm font-medium text-foreground">{driver.name} — HOS Status</p>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Drive Time Remaining</span>
          <span>{driver.hos_remaining}h / 11h</span>
        </div>
        <Progress value={hosPercent} className="h-2" />
      </div>
      {nextBreak && (
        <p className="text-xs text-muted-foreground">Next break: ~{nextBreak}</p>
      )}
    </div>
  );
}
```

**Step 5: Create FleetCard**

Create `apps/web/src/features/platform/sally-ai/components/cards/FleetCard.tsx`:

```tsx
'use client';

import type { MockFleet } from '../../engine/types';

export function FleetCard({ data }: { data: Record<string, unknown> }) {
  const fleet = data as unknown as MockFleet;

  const stats = [
    { label: 'Active Vehicles', value: fleet.active_vehicles },
    { label: 'Active Routes', value: fleet.active_routes },
    { label: 'Pending Alerts', value: fleet.pending_alerts },
    { label: 'Driving', value: fleet.drivers_driving },
    { label: 'Available', value: fleet.drivers_available },
    { label: 'Resting', value: fleet.drivers_resting },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-medium text-foreground mb-2">Fleet Overview</p>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(stat => (
          <div key={stat.label} className="text-center p-1.5 rounded bg-muted">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 6: Create LeadFormCard**

Create `apps/web/src/features/platform/sally-ai/components/cards/LeadFormCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export function LeadFormCard() {
  const [formData, setFormData] = useState({ name: '', email: '', fleetSize: '' });
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 text-center">
        <p className="text-sm font-medium text-foreground">Thanks, {formData.name}!</p>
        <p className="text-xs text-muted-foreground mt-1">We'll be in touch at {formData.email}.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <p className="text-sm font-medium text-foreground">Get in Touch</p>
      <div className="space-y-2">
        <div>
          <Label className="text-xs">Name</Label>
          <Input
            value={formData.name}
            onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
            placeholder="Your name"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
            placeholder="you@company.com"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Fleet Size</Label>
          <Input
            value={formData.fleetSize}
            onChange={e => setFormData(d => ({ ...d, fleetSize: e.target.value }))}
            placeholder="e.g., 50 trucks"
            className="h-8 text-xs"
          />
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => setSubmitted(true)}
        disabled={!formData.name || !formData.email}
        className="w-full"
      >
        Send
      </Button>
    </div>
  );
}
```

**Step 7: Create RichCardRenderer**

Create `apps/web/src/features/platform/sally-ai/components/cards/RichCardRenderer.tsx`:

```tsx
'use client';

import type { RichCard } from '../../engine/types';
import { AlertCard } from './AlertCard';
import { DriverCard } from './DriverCard';
import { RouteCard } from './RouteCard';
import { HOSCard } from './HOSCard';
import { FleetCard } from './FleetCard';
import { LeadFormCard } from './LeadFormCard';

export function RichCardRenderer({ card }: { card: RichCard }) {
  switch (card.type) {
    case 'alert':
    case 'alert_list':
      return <AlertCard data={card.data} />;
    case 'driver':
      return <DriverCard data={card.data} />;
    case 'route':
      return <RouteCard data={card.data} />;
    case 'hos':
      return <HOSCard data={card.data} />;
    case 'fleet':
      return <FleetCard data={card.data} />;
    case 'lead_form':
      return <LeadFormCard />;
    default:
      return null;
  }
}
```

**Step 8: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/components/cards/
git commit -m "feat(sally-ai): add rich response cards (alert, driver, route, HOS, fleet, lead form)"
```

---

## Task 8: SallyMessage & SallySuggestions Components

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/components/SallyMessage.tsx`
- Create: `apps/web/src/features/platform/sally-ai/components/SallySuggestions.tsx`

**Step 1: Create SallyMessage**

Create `apps/web/src/features/platform/sally-ai/components/SallyMessage.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/shared/components/ui/badge';
import type { ChatMessage } from '../engine/types';
import { RichCardRenderer } from './cards/RichCardRenderer';

export function SallyMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[90%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message bubble */}
        <div
          className={`rounded-lg px-3 py-2 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-foreground border border-border'
          }`}
        >
          {/* Input mode indicator for voice */}
          {isUser && message.inputMode === 'voice' && (
            <span className="text-[10px] opacity-60 block mb-0.5">
              <svg className="inline w-3 h-3 mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
              Voice
            </span>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Rich card */}
        {message.card && (
          <div className="w-full">
            <RichCardRenderer card={message.card} />
          </div>
        )}

        {/* Action result */}
        {message.action && (
          <Badge
            variant="outline"
            className={message.action.success
              ? 'text-green-600 dark:text-green-400 border-green-300 dark:border-green-700'
              : 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700'
            }
          >
            {message.action.success ? '✓' : '✗'} {message.action.message}
          </Badge>
        )}

        {/* Timestamp */}
        <p className={`text-[10px] px-1 ${isUser ? 'text-right' : 'text-left'} text-muted-foreground`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}
```

**Step 2: Create SallySuggestions**

Create `apps/web/src/features/platform/sally-ai/components/SallySuggestions.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import type { UserMode } from '../engine/types';
import { PROSPECT_SUGGESTIONS, DISPATCHER_SUGGESTIONS, DRIVER_SUGGESTIONS } from '../engine/mock-data';

interface SallySuggestionsProps {
  mode: UserMode;
  onSelect: (text: string) => void;
}

function getSuggestions(mode: UserMode): string[] {
  switch (mode) {
    case 'prospect': return PROSPECT_SUGGESTIONS;
    case 'dispatcher': return DISPATCHER_SUGGESTIONS;
    case 'driver': return DRIVER_SUGGESTIONS;
  }
}

export function SallySuggestions({ mode, onSelect }: SallySuggestionsProps) {
  const suggestions = getSuggestions(mode);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-wrap gap-2 px-4 py-3"
    >
      {suggestions.map((text, i) => (
        <motion.button
          key={text}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.05 }}
          onClick={() => onSelect(text)}
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
        >
          {text}
        </motion.button>
      ))}
    </motion.div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/components/SallyMessage.tsx apps/web/src/features/platform/sally-ai/components/SallySuggestions.tsx
git commit -m "feat(sally-ai): add SallyMessage and SallySuggestions components"
```

---

## Task 9: SallyInput Component

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/components/SallyInput.tsx`

**Step 1: Create SallyInput**

Create `apps/web/src/features/platform/sally-ai/components/SallyInput.tsx`:

```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { useSallyStore } from '../store';
import { useSpeechRecognition } from '../voice/use-speech-recognition';

export function SallyInput() {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    orbState,
    isVoiceEnabled,
    isMicActive,
    interimTranscript,
    sendMessage,
    setOrbState,
    setMicActive,
    setInterimTranscript,
  } = useSallyStore();

  const { isListening, isSupported: sttSupported, transcript, interimTranscript: sttInterim, start: startSTT, stop: stopSTT } = useSpeechRecognition();

  const isThinking = orbState === 'thinking';
  const showMic = isVoiceEnabled && sttSupported;

  // Handle final transcript
  useEffect(() => {
    if (transcript) {
      sendMessage(transcript, 'voice');
      setMicActive(false);
    }
  }, [transcript, sendMessage, setMicActive]);

  // Sync interim transcript
  useEffect(() => {
    setInterimTranscript(sttInterim);
  }, [sttInterim, setInterimTranscript]);

  // Sync orb state with listening
  useEffect(() => {
    if (isListening) {
      setOrbState('listening');
    } else if (orbState === 'listening') {
      setOrbState('idle');
    }
  }, [isListening, orbState, setOrbState]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isThinking) return;
    sendMessage(text, 'text');
    setInput('');
    inputRef.current?.focus();
  }, [input, isThinking, sendMessage]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopSTT();
      setMicActive(false);
    } else {
      startSTT();
      setMicActive(true);
    }
  }, [isListening, startSTT, stopSTT, setMicActive]);

  return (
    <div className="border-t border-border bg-background p-3 space-y-2">
      {/* Interim transcript preview */}
      <AnimatePresence>
        {interimTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-muted-foreground italic px-1"
          >
            {interimTranscript}...
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        {/* Mic button */}
        {showMic && (
          <Button
            type="button"
            variant={isListening ? 'default' : 'outline'}
            size="icon"
            onClick={handleMicToggle}
            disabled={isThinking}
            className="shrink-0 h-9 w-9"
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isListening ? (
                <rect x="6" y="6" width="12" height="12" rx="2" />
              ) : (
                <>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                </>
              )}
            </svg>
          </Button>
        )}

        {/* Text input */}
        <Textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={isListening ? 'Listening...' : 'Ask Sally anything...'}
          className="min-h-[36px] max-h-[120px] resize-none text-sm"
          disabled={isThinking || isListening}
          rows={1}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || isThinking}
          className="shrink-0 h-9 w-9"
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/components/SallyInput.tsx
git commit -m "feat(sally-ai): add SallyInput with text input and voice mic toggle"
```

---

## Task 10: SallyChat Component

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/components/SallyChat.tsx`

**Step 1: Create SallyChat**

Create `apps/web/src/features/platform/sally-ai/components/SallyChat.tsx`:

```tsx
'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useSallyStore } from '../store';
import { SallyMessage } from './SallyMessage';
import { SallySuggestions } from './SallySuggestions';
import { SallyInput } from './SallyInput';

export function SallyChat() {
  const { messages, orbState, userMode, sendMessage } = useSallyStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {messages.map(message => (
            <SallyMessage key={message.id} message={message} />
          ))}

          {/* Thinking indicator */}
          <AnimatePresence>
            {orbState === 'thinking' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="bg-card border border-border rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {showSuggestions && (
        <SallySuggestions
          mode={userMode}
          onSelect={(text) => sendMessage(text, 'text')}
        />
      )}

      {/* Input */}
      <SallyInput />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/components/SallyChat.tsx
git commit -m "feat(sally-ai): add SallyChat component with messages, suggestions, and input"
```

---

## Task 11: SallyStrip Component

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/components/SallyStrip.tsx`

**Step 1: Create SallyStrip**

Create `apps/web/src/features/platform/sally-ai/components/SallyStrip.tsx`:

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { useSallyStore } from '../store';
import { SallyOrb } from './SallyOrb';
import { SallyChat } from './SallyChat';
import { useSpeechSynthesis } from '../voice/use-speech-synthesis';
import { useEffect, useRef } from 'react';

export function SallyStrip() {
  const {
    isOpen,
    isExpanded,
    orbState,
    userMode,
    isTTSEnabled,
    messages,
    toggleStrip,
    expandStrip,
    collapseStrip,
    toggleTTS,
  } = useSallyStore();

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();
  const lastMessageRef = useRef<string | null>(null);

  // TTS: Speak new assistant messages
  useEffect(() => {
    if (!isTTSEnabled || !ttsSupported) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant') return;
    if (lastMsg.id === lastMessageRef.current) return;

    lastMessageRef.current = lastMsg.id;
    const textToSpeak = lastMsg.speakText || lastMsg.content;
    speak(textToSpeak);
  }, [messages, isTTSEnabled, ttsSupported, speak]);

  // Sync orb state with TTS
  useEffect(() => {
    if (isSpeaking) {
      useSallyStore.getState().setOrbState('speaking');
    } else if (useSallyStore.getState().orbState === 'speaking') {
      useSallyStore.getState().setOrbState('idle');
    }
  }, [isSpeaking]);

  const showTTSToggle = userMode !== 'prospect' && ttsSupported;

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={collapseStrip}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Strip container */}
      <div className="fixed right-0 top-0 h-full z-50 flex">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            /* Expanded strip */
            <motion.div
              key="expanded"
              initial={{ width: 48, opacity: 0.5 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 48, opacity: 0.5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="h-full bg-background border-l border-border flex flex-col w-full max-w-[100vw] sm:max-w-[360px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <SallyOrb state={orbState} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">SALLY</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{userMode} mode</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* TTS toggle */}
                  {showTTSToggle && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        toggleTTS();
                        if (isSpeaking) stopSpeaking();
                      }}
                      className="h-7 w-7"
                      aria-label={isTTSEnabled ? 'Disable voice readback' : 'Enable voice readback'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {isTTSEnabled ? (
                          <>
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          </>
                        ) : (
                          <>
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <line x1="23" y1="9" x2="17" y2="15" />
                            <line x1="17" y1="9" x2="23" y2="15" />
                          </>
                        )}
                      </svg>
                    </Button>
                  )}

                  {/* Collapse button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={collapseStrip}
                    className="h-7 w-7"
                    aria-label="Collapse Sally"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Chat */}
              <SallyChat />
            </motion.div>
          ) : (
            /* Collapsed strip — just the orb */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-12 flex flex-col items-center pt-4 bg-background border-l border-border"
            >
              <SallyOrb state={orbState} size="sm" onClick={expandStrip} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/components/SallyStrip.tsx
git commit -m "feat(sally-ai): add SallyStrip with collapsed/expanded states and TTS integration"
```

---

## Task 12: SallyGlobalProvider & Barrel Export

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/components/SallyGlobalProvider.tsx`
- Create: `apps/web/src/features/platform/sally-ai/index.ts`

**Step 1: Create SallyGlobalProvider**

Create `apps/web/src/features/platform/sally-ai/components/SallyGlobalProvider.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/features/auth';
import { useSallyStore } from '../store';
import { SallyStrip } from './SallyStrip';
import type { UserMode } from '../engine/types';

function detectMode(pathname: string | null, userRole: string | undefined, isAuthenticated: boolean): UserMode {
  if (!isAuthenticated) return 'prospect';
  if (pathname?.startsWith('/driver')) return 'driver';
  if (userRole === 'DRIVER') return 'driver';
  return 'dispatcher';
}

export function SallyGlobalProvider() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const { setUserMode, userMode } = useSallyStore();

  useEffect(() => {
    const mode = detectMode(pathname, user?.role, isAuthenticated);
    if (mode !== userMode) {
      setUserMode(mode);
    }
  }, [pathname, user?.role, isAuthenticated, setUserMode, userMode]);

  return <SallyStrip />;
}
```

**Step 2: Create barrel export**

Create `apps/web/src/features/platform/sally-ai/index.ts`:

```typescript
// Store
export { useSallyStore } from './store';

// Components
export { SallyGlobalProvider } from './components/SallyGlobalProvider';
export { SallyStrip } from './components/SallyStrip';
export { SallyOrb } from './components/SallyOrb';
export { SallyChat } from './components/SallyChat';
export { SallyInput } from './components/SallyInput';
export { SallyMessage } from './components/SallyMessage';
export { SallySuggestions } from './components/SallySuggestions';

// Types
export type { UserMode, OrbState, ChatMessage, RichCard, SallyResponse, InputMode } from './engine/types';
```

**Step 3: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/components/SallyGlobalProvider.tsx apps/web/src/features/platform/sally-ai/index.ts
git commit -m "feat(sally-ai): add SallyGlobalProvider and barrel exports"
```

---

## Task 13: Wire Into Layout (Replace Old Chat)

**Files:**
- Modify: `apps/web/src/app/layout-client.tsx:1-87`

**Step 1: Update layout-client.tsx**

Replace the old `GlobalSallyChat` import and usage in `apps/web/src/app/layout-client.tsx`:

1. Change line 7 import from:
   ```typescript
   import { GlobalSallyChat } from "@/features/platform/chat/components/GlobalSallyChat";
   ```
   to:
   ```typescript
   import { SallyGlobalProvider } from "@/features/platform/sally-ai";
   ```

2. Change line 8 import from:
   ```typescript
   import { useChatStore } from "@/features/platform/chat";
   ```
   to:
   ```typescript
   import { useSallyStore } from "@/features/platform/sally-ai";
   ```

3. Change line 15 from:
   ```typescript
   const { isOpen } = useChatStore();
   ```
   to:
   ```typescript
   const { isOpen } = useSallyStore();
   ```

4. Change line 84 from:
   ```tsx
   <GlobalSallyChat />
   ```
   to:
   ```tsx
   <SallyGlobalProvider />
   ```

**Step 2: Verify the build compiles**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -30`

If there are TypeScript errors, fix them. Common issues:
- Missing imports
- Type mismatches

**Step 3: Commit**

```bash
git add apps/web/src/app/layout-client.tsx
git commit -m "feat(sally-ai): wire SallyGlobalProvider into layout, replacing old chat"
```

---

## Task 14: Accessibility & Reduced Motion

**Files:**
- Modify: `apps/web/src/features/platform/sally-ai/components/SallyOrb.tsx`

**Step 1: Add reduced motion support to SallyOrb**

Add this import at the top of `SallyOrb.tsx`:
```typescript
import { useReducedMotion } from 'framer-motion';
```

Inside the component function, add:
```typescript
const prefersReducedMotion = useReducedMotion();
```

Wrap the orb animation to use simpler animation when reduced motion is preferred:
- If `prefersReducedMotion`, use opacity-only for idle state: `{ opacity: [0.7, 1, 0.7] }`
- Skip ripple rings and glow ring animations
- Use instant transitions instead of spring

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/components/SallyOrb.tsx
git commit -m "feat(sally-ai): add reduced motion support to SallyOrb"
```

---

## Task 15: Final Build Verification & Cleanup

**Step 1: Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | tail -50`

Fix any type errors found.

**Step 2: Run linter**

Run: `cd apps/web && npx next lint 2>&1 | tail -30`

Fix any lint issues.

**Step 3: Run build**

Run: `cd apps/web && npx next build 2>&1 | tail -30`

Ensure build passes.

**Step 4: Final commit with any fixes**

```bash
git add -A
git commit -m "fix(sally-ai): resolve build errors and lint issues"
```

---

## Task 16: Push & Create PR

**Step 1: Push branch**

```bash
git push -u origin feature/sally-ai-nerve-center
```

**Step 2: Create PR**

```bash
gh pr create \
  --title "feat: Sally AI Nerve Center — voice + text assistant with 3 modes" \
  --body "$(cat <<'EOF'
## Summary
- New `features/platform/sally-ai/` replaces old `features/platform/chat/` mock
- Collapsible Sally Strip with animated orb (4 states: idle, listening, thinking, speaking)
- Three experience modes: Prospect (text-only, sales Q&A + lead capture), Dispatcher (voice + text, fleet ops), Driver (voice-first, route/HOS)
- Keyword-based intent classifier with entity extraction (18 intents across 3 modes)
- Rich response cards: Alert, Driver, Route, HOS, Fleet, Lead Form
- Voice engine: Web Speech API STT + SpeechSynthesis TTS with provider interfaces for future swap
- Zustand store with session, voice, and mode state management
- Dark theme compliant, responsive, Shadcn components throughout
- Designed for future Claude API swap — only engine layer changes, zero UI changes

## Test plan
- [ ] Verify strip renders collapsed (orb visible) on all pages
- [ ] Click orb → strip expands with greeting
- [ ] Type messages → intent classified → response with cards
- [ ] Test each mode: navigate to /, /dispatcher/*, /driver/*
- [ ] Test voice input (Chrome): click mic → speak → transcript submitted
- [ ] Test TTS toggle in dispatcher/driver mode
- [ ] Test lead form card in prospect mode
- [ ] Verify dark theme: toggle theme, check all components
- [ ] Verify mobile: resize to 375px, check full-screen overlay
- [ ] Verify reduced motion: enable in OS settings, check animations simplified

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Types & Mock Data | `engine/types.ts`, `engine/mock-data.ts` |
| 2 | Intent Classifier | `engine/intent-classifier.ts` |
| 3 | Response Generator | `engine/response-generator.ts` |
| 4 | Zustand Store | `store.ts` |
| 5 | Voice Hooks | `voice/use-speech-recognition.ts`, `voice/use-speech-synthesis.ts`, `voice/types.ts` |
| 6 | SallyOrb | `components/SallyOrb.tsx` |
| 7 | Rich Cards (6) | `components/cards/*.tsx` |
| 8 | Message & Suggestions | `components/SallyMessage.tsx`, `components/SallySuggestions.tsx` |
| 9 | Input | `components/SallyInput.tsx` |
| 10 | Chat | `components/SallyChat.tsx` |
| 11 | Strip | `components/SallyStrip.tsx` |
| 12 | Provider & Exports | `components/SallyGlobalProvider.tsx`, `index.ts` |
| 13 | Wire Into Layout | `layout-client.tsx` |
| 14 | Accessibility | `SallyOrb.tsx` (reduced motion) |
| 15 | Build Verification | Fix any type/lint/build errors |
| 16 | Push & PR | Push branch, create GitHub PR |

All files live under `apps/web/src/features/platform/sally-ai/`. Total: ~20 new files, 1 modified file.

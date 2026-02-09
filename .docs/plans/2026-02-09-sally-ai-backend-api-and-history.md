# Sally AI — Backend API Layer + Chat History Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move Sally AI's hardcoded frontend response engine to a NestJS backend API (still mock responses), add Prisma-backed conversation persistence, and show view-only chat history in the frontend empty state.

**Architecture:** Frontend becomes a thin client calling backend APIs for dispatcher/driver modes. Prospect mode stays frontend-only (no auth). Backend receives user messages, classifies intent via keyword matching, generates mock responses, stores both in Postgres, and returns the assistant message. Chat history loads from `GET /conversations` and renders read-only in the Sally panel's empty state.

**Tech Stack:** NestJS 11, Prisma 7.3, PostgreSQL, class-validator DTOs, nanoid IDs, Zustand 5, `apiClient` from `@/shared/lib/api`, Framer Motion (history UI animations)

### Implementation Decision: Domain Naming (decided during execution)

The plan originally used `conversations/` as the backend domain folder. During implementation, we renamed it to **`sally-ai/`** to:
- Mirror the frontend feature folder (`features/platform/sally-ai/`)
- Accommodate future AI features (RAG, streaming, Claude API integration, context injection) under one domain
- Avoid needing to restructure later when the domain grows beyond just conversations

**Backend structure:**
```
domains/platform/sally-ai/
  ├── engine/              (classifier, generator, mock-data, types)
  ├── dto/                 (create-conversation, send-message)
  ├── sally-ai.module.ts   (SallyAiModule)
  ├── sally-ai.controller.ts (SallyAiController, route prefix: /conversations)
  └── sally-ai.service.ts  (SallyAiService)
```

The HTTP route prefix remains `/conversations` — only the code organization changed.

---

## Task 1: Prisma Schema — Conversation + Message Models

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Add Conversation and ConversationMessage models to the schema**

Add at the end of the file, before any closing comments:

```prisma
// ============================================================================
// SALLY AI CONVERSATION MODELS
// ============================================================================

model Conversation {
  id                Int                   @id @default(autoincrement())
  conversationId    String                @unique @map("conversation_id") @db.VarChar(50)

  tenant            Tenant                @relation(fields: [tenantId], references: [id])
  tenantId          Int                   @map("tenant_id")

  user              User                  @relation(fields: [userId], references: [id])
  userId            Int                   @map("user_id")

  userMode          String                @map("user_mode") @db.VarChar(20)
  title             String?               @db.VarChar(255)
  isActive          Boolean               @default(true) @map("is_active")

  createdAt         DateTime              @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime              @updatedAt @map("updated_at") @db.Timestamptz

  messages          ConversationMessage[]

  @@index([tenantId, userId, createdAt])
  @@map("conversations")
}

model ConversationMessage {
  id                Int                   @id @default(autoincrement())
  messageId         String                @unique @map("message_id") @db.VarChar(50)

  conversation      Conversation          @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  conversationId    Int                   @map("conversation_id")

  role              String                @db.VarChar(20)
  content           String                @db.Text
  inputMode         String                @map("input_mode") @db.VarChar(10)
  intent            String?               @db.VarChar(50)
  card              Json?
  action            Json?
  speakText         String?               @map("speak_text") @db.Text

  createdAt         DateTime              @default(now()) @map("created_at") @db.Timestamptz

  @@index([conversationId, createdAt])
  @@map("conversation_messages")
}
```

**Step 2: Add relation arrays to existing Tenant and User models**

In the `Tenant` model, after the `shiftNotes` relation line, add:
```prisma
  conversations     Conversation[]
```

In the `User` model, after the `shiftNotes` relation line, add:
```prisma
  conversations     Conversation[]
```

**Step 3: Generate Prisma client and create migration**

Run:
```bash
cd apps/backend && npx prisma generate
```
Expected: "Generated Prisma Client"

Run:
```bash
cd apps/backend && npx prisma migrate dev --name add_sally_conversations
```
Expected: Migration created and applied successfully.

**Step 4: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(sally-ai): add Conversation and ConversationMessage Prisma models"
```

---

## Task 2: Backend Engine — Types

**Files:**
- Create: `apps/backend/src/domains/platform/sally-ai/engine/types.ts`

**Step 1: Create engine types file**

These are the subset of types needed by the backend engine (no UI types like OrbState, ChatMessage, LeadData — those stay frontend-only):

```typescript
// ── User Modes ──
export type UserMode = 'prospect' | 'dispatcher' | 'driver';

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
export type RichCardType =
  | 'alert'
  | 'alert_list'
  | 'driver'
  | 'route'
  | 'hos'
  | 'fleet'
  | 'lead_form';

export interface RichCard {
  type: RichCardType;
  data: Record<string, any>;
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
```

**Step 2: Verify compilation**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors related to `conversations/engine/types.ts`

**Step 3: Commit**

```bash
git add apps/backend/src/domains/platform/sally-ai/engine/types.ts
git commit -m "feat(sally-ai): add backend engine types"
```

---

## Task 3: Backend Engine — Mock Data, Intent Classifier, Response Generator

**Files:**
- Create: `apps/backend/src/domains/platform/sally-ai/engine/mock-data.ts`
- Create: `apps/backend/src/domains/platform/sally-ai/engine/intent-classifier.ts`
- Create: `apps/backend/src/domains/platform/sally-ai/engine/response-generator.ts`

**Step 1: Create mock data file**

Copy from frontend `apps/web/src/features/platform/sally-ai/engine/mock-data.ts` — change import path only:

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
```

**Step 2: Create intent classifier**

Copy from frontend `apps/web/src/features/platform/sally-ai/engine/intent-classifier.ts` — change import path only:

```typescript
import type { ClassifiedIntent, UserMode, Intent } from './types';

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
```

**Step 3: Create response generator**

Copy from frontend `apps/web/src/features/platform/sally-ai/engine/response-generator.ts` — change import paths only:

```typescript
import type { ClassifiedIntent, SallyResponse } from './types';
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
      text: `Route ${route.id}: ${route.origin} \u2192 ${route.destination}. ${route.stops} stops, ETA ${route.eta}. Status: ${route.status.replace('_', ' ')}. Driver: ${route.driver || 'unassigned'}.`,
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
  const driver = MOCK_DRIVERS[0];
  const route = MOCK_ROUTES.find(r => r.id === driver.current_route);

  if (!route) {
    return { text: "You don't have an active route right now." };
  }

  return {
    text: `You're on route ${route.id}: ${route.origin} \u2192 ${route.destination}. ${route.stops} stops remaining. ETA: ${route.eta}. Status: on track.`,
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
    text: "Arrival confirmed! I've updated your route status. Take your time \u2014 your next segment departs based on the planned schedule.",
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

function handleGeneral(mode: string): SallyResponse {
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
    default:
      return { text: "How can I help you today?" };
  }
}

// ── Greeting Generator ──

export function getGreeting(mode: string): string {
  switch (mode) {
    case 'prospect':
      return "Hi! I'm SALLY. I can tell you about our fleet operations platform, pricing, integrations, or set up a demo. What would you like to know?";
    case 'dispatcher':
      return "Hi! I'm SALLY. I can check alerts, look up drivers, query routes, and manage your fleet. What do you need?";
    case 'driver':
      return "Hey! I'm SALLY. I can show your route, check HOS, report delays, or find fuel. What's up?";
    default:
      return "Hi! I'm SALLY. How can I help you today?";
  }
}

// ── Main Router ──

export function generateResponse(classified: ClassifiedIntent, mode: string): SallyResponse {
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

**Step 4: Verify compilation**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors related to `conversations/engine/`

**Step 5: Commit**

```bash
git add apps/backend/src/domains/platform/sally-ai/engine/
git commit -m "feat(sally-ai): add backend mock engine (classifier, generator, data)"
```

---

## Task 4: Backend DTOs

**Files:**
- Create: `apps/backend/src/domains/platform/sally-ai/dto/create-conversation.dto.ts`
- Create: `apps/backend/src/domains/platform/sally-ai/dto/send-message.dto.ts`

**Step 1: Create conversation DTO**

```typescript
import { IsNotEmpty, IsIn } from 'class-validator';

export class CreateConversationDto {
  @IsNotEmpty()
  @IsIn(['dispatcher', 'driver'])
  userMode: string;
}
```

Note: Only `dispatcher` and `driver` are valid — prospect mode stays frontend-only.

**Step 2: Create send message DTO**

```typescript
import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsIn(['text', 'voice'])
  inputMode: string;
}
```

**Step 3: Verify compilation**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors

**Step 4: Commit**

```bash
git add apps/backend/src/domains/platform/sally-ai/dto/
git commit -m "feat(sally-ai): add conversation DTOs"
```

---

## Task 5: Conversations Service

**Files:**
- Create: `apps/backend/src/domains/platform/sally-ai/sally-ai.service.ts`

**Step 1: Create the service**

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { generateId } from '../../../shared/utils/id-generator';
import { classifyIntent } from './engine/intent-classifier';
import { generateResponse, getGreeting } from './engine/response-generator';

@Injectable()
export class SallyAiService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(userId: number, tenantId: number, userMode: string) {
    const conversationId = generateId('conv');
    const greetingMessageId = generateId('msg');
    const greetingText = getGreeting(userMode);

    const conversation = await this.prisma.conversation.create({
      data: {
        conversationId,
        tenantId,
        userId,
        userMode,
        messages: {
          create: {
            messageId: greetingMessageId,
            role: 'assistant',
            content: greetingText,
            inputMode: 'text',
            speakText: greetingText,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    const greeting = conversation.messages[0];

    return {
      conversationId: conversation.conversationId,
      userMode: conversation.userMode,
      createdAt: conversation.createdAt.toISOString(),
      greeting: {
        messageId: greeting.messageId,
        role: greeting.role,
        content: greeting.content,
        inputMode: greeting.inputMode,
        speakText: greeting.speakText,
        createdAt: greeting.createdAt.toISOString(),
      },
    };
  }

  async sendMessage(
    conversationId: string,
    content: string,
    inputMode: string,
    userId: number,
    tenantId: number,
  ) {
    // Find and verify ownership
    const conversation = await this.prisma.conversation.findUnique({
      where: { conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    if (conversation.userId !== userId || conversation.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Store user message
    const userMessageId = generateId('msg');
    const userMessage = await this.prisma.conversationMessage.create({
      data: {
        messageId: userMessageId,
        conversationId: conversation.id,
        role: 'user',
        content,
        inputMode,
      },
    });

    // Classify intent and generate response
    const classified = classifyIntent(content, conversation.userMode);
    const response = generateResponse(classified, conversation.userMode);

    // Build assistant message content
    const assistantContent = response.text + (response.followUp ? `\n\n${response.followUp}` : '');

    // Store assistant message
    const assistantMessageId = generateId('msg');
    const assistantMessage = await this.prisma.conversationMessage.create({
      data: {
        messageId: assistantMessageId,
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantContent,
        inputMode: 'text',
        intent: classified.intent,
        card: response.card ? (response.card as any) : undefined,
        action: response.action ? (response.action as any) : undefined,
        speakText: response.speakText,
      },
    });

    // Auto-set title from first user message (if not yet set)
    if (!conversation.title) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: content.slice(0, 100) },
      });
    }

    return {
      userMessage: {
        messageId: userMessage.messageId,
        role: userMessage.role,
        content: userMessage.content,
        inputMode: userMessage.inputMode,
        createdAt: userMessage.createdAt.toISOString(),
      },
      assistantMessage: {
        messageId: assistantMessage.messageId,
        role: assistantMessage.role,
        content: assistantMessage.content,
        inputMode: assistantMessage.inputMode,
        intent: assistantMessage.intent,
        card: assistantMessage.card,
        action: assistantMessage.action,
        speakText: assistantMessage.speakText,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
    };
  }

  async listConversations(userId: number, tenantId: number, limit: number = 10) {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId, tenantId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    return {
      conversations: conversations.map(c => ({
        conversationId: c.conversationId,
        userMode: c.userMode,
        title: c.title,
        messageCount: c._count.messages,
        lastMessageAt: c.messages[0]?.createdAt.toISOString() ?? c.createdAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async getMessages(conversationId: string, userId: number, tenantId: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    if (conversation.userId !== userId || conversation.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return {
      conversationId: conversation.conversationId,
      userMode: conversation.userMode,
      title: conversation.title,
      messages: conversation.messages.map(m => ({
        messageId: m.messageId,
        role: m.role,
        content: m.content,
        inputMode: m.inputMode,
        intent: m.intent,
        card: m.card,
        action: m.action,
        speakText: m.speakText,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }
}
```

**Step 2: Verify compilation**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors

**Step 3: Commit**

```bash
git add apps/backend/src/domains/platform/sally-ai/sally-ai.service.ts
git commit -m "feat(sally-ai): add conversations service with CRUD operations"
```

---

## Task 6: Conversations Controller

**Files:**
- Create: `apps/backend/src/domains/platform/sally-ai/sally-ai.controller.ts`

**Step 1: Create the controller**

```typescript
import { Controller, Get, Post, Param, Query, Body, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { SallyAiService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Sally AI Conversations')
@Controller('conversations')
export class SallyAiController {
  constructor(private readonly service: SallyAiService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Create a new Sally AI conversation' })
  async createConversation(
    @CurrentUser() user: any,
    @Body() dto: CreateConversationDto,
  ) {
    return this.service.createConversation(user.userId, user.tenantDbId, dto.userMode);
  }

  @Post(':conversationId/messages')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Send a message and get Sally AI response' })
  async sendMessage(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.sendMessage(
      conversationId,
      dto.content,
      dto.inputMode,
      user.userId,
      user.tenantDbId,
    );
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  @ApiOperation({ summary: 'List conversations for the current user' })
  async listConversations(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.service.listConversations(user.userId, user.tenantDbId, limit);
  }

  @Get(':conversationId/messages')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Get messages for a conversation (view-only history)' })
  async getMessages(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
  ) {
    return this.service.getMessages(conversationId, user.userId, user.tenantDbId);
  }
}
```

**Step 2: Verify compilation**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors

**Step 3: Commit**

```bash
git add apps/backend/src/domains/platform/sally-ai/sally-ai.controller.ts
git commit -m "feat(sally-ai): add conversations controller with REST endpoints"
```

---

## Task 7: Conversations Module + Registration in Platform Module

**Files:**
- Create: `apps/backend/src/domains/platform/sally-ai/sally-ai.module.ts`
- Modify: `apps/backend/src/domains/platform/platform.module.ts`

**Step 1: Create conversations module**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { SallyAiController } from './conversations.controller';
import { SallyAiService } from './conversations.service';

/**
 * SallyAiModule handles Sally AI chat conversations:
 * - Create conversations with mode-specific greetings
 * - Send messages and receive mock AI responses
 * - List past conversations for history view
 * - Retrieve conversation messages (view-only)
 */
@Module({
  imports: [PrismaModule],
  controllers: [SallyAiController],
  providers: [SallyAiService],
  exports: [SallyAiService],
})
export class SallyAiModule {}
```

**Step 2: Register in platform module**

In `apps/backend/src/domains/platform/platform.module.ts`, add:

Import at the top:
```typescript
import { SallyAiModule } from './conversations/conversations.module';
```

Add `SallyAiModule` to both `imports` and `exports` arrays.

**Step 3: Verify the backend starts**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors

**Step 4: Commit**

```bash
git add apps/backend/src/domains/platform/sally-ai/ apps/backend/src/domains/platform/platform.module.ts
git commit -m "feat(sally-ai): register conversations module in platform"
```

---

## Task 8: Frontend API Client

**Files:**
- Create: `apps/web/src/features/platform/sally-ai/api.ts`

**Step 1: Create the API client**

```typescript
import { apiClient } from '@/shared/lib/api';

// ── Response Types ──

export interface ConversationGreeting {
  messageId: string;
  role: string;
  content: string;
  inputMode: string;
  speakText?: string;
  createdAt: string;
}

export interface CreateConversationResponse {
  conversationId: string;
  userMode: string;
  createdAt: string;
  greeting: ConversationGreeting;
}

export interface MessageResponse {
  messageId: string;
  role: string;
  content: string;
  inputMode: string;
  intent?: string;
  card?: any;
  action?: any;
  speakText?: string;
  createdAt: string;
}

export interface SendMessageResponse {
  userMessage: MessageResponse;
  assistantMessage: MessageResponse;
}

export interface ConversationSummary {
  conversationId: string;
  userMode: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface ListConversationsResponse {
  conversations: ConversationSummary[];
}

export interface GetMessagesResponse {
  conversationId: string;
  userMode: string;
  title: string | null;
  messages: MessageResponse[];
}

// ── API Functions ──

export async function createConversation(userMode: string): Promise<CreateConversationResponse> {
  return apiClient<CreateConversationResponse>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ userMode }),
  });
}

export async function sendMessageApi(
  conversationId: string,
  content: string,
  inputMode: string,
): Promise<SendMessageResponse> {
  return apiClient<SendMessageResponse>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, inputMode }),
  });
}

export async function listConversations(limit: number = 10): Promise<ListConversationsResponse> {
  return apiClient<ListConversationsResponse>(`/conversations?limit=${limit}`);
}

export async function getConversationMessages(conversationId: string): Promise<GetMessagesResponse> {
  return apiClient<GetMessagesResponse>(`/conversations/${conversationId}/messages`);
}
```

**Step 2: Verify compilation**

Run:
```bash
cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors related to `sally-ai/api.ts`

**Step 3: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/api.ts
git commit -m "feat(sally-ai): add frontend API client for conversations"
```

---

## Task 9: Update Store — API Integration + History State

**Files:**
- Modify: `apps/web/src/features/platform/sally-ai/store.ts`

**Step 1: Replace the store with API-integrated version**

The key changes:
- `sendMessage()` calls API for dispatcher/driver, keeps frontend engine for prospect
- `expandStrip()` / `toggleStrip()` call `createConversation` API for non-prospect modes
- Add `pastConversations`, `isViewingHistory`, `viewedMessages` state
- Add `loadHistory()`, `viewConversation()`, `clearView()` actions
- Keep `clearSession()` for local reset (conversation persists in DB)

```typescript
import { create } from 'zustand';
import type { ChatMessage, OrbState, UserMode, LeadData, InputMode, Intent } from './engine/types';
import { classifyIntent } from './engine/intent-classifier';
import { generateResponse } from './engine/response-generator';
import {
  createConversation as createConversationApi,
  sendMessageApi,
  listConversations,
  getConversationMessages,
  type ConversationSummary,
  type MessageResponse,
} from './api';

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

  // Chat history
  pastConversations: ConversationSummary[];
  isViewingHistory: boolean;
  viewedMessages: ChatMessage[];
  isLoadingHistory: boolean;

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
  loadHistory: () => Promise<void>;
  viewConversation: (conversationId: string) => Promise<void>;
  clearView: () => void;
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

function apiMessageToChatMessage(msg: MessageResponse, role: 'user' | 'assistant'): ChatMessage {
  return {
    id: msg.messageId,
    role,
    content: msg.content,
    inputMode: msg.inputMode as InputMode,
    timestamp: new Date(msg.createdAt),
    intent: msg.intent as Intent | undefined,
    card: msg.card,
    action: msg.action,
    speakText: msg.speakText,
  };
}

async function initConversationViaApi(mode: UserMode): Promise<{ sessionId: string; messages: ChatMessage[] } | null> {
  if (mode === 'prospect') return null;
  try {
    const res = await createConversationApi(mode);
    const greeting: ChatMessage = {
      id: res.greeting.messageId,
      role: 'assistant',
      content: res.greeting.content,
      inputMode: 'text',
      timestamp: new Date(res.greeting.createdAt),
      speakText: res.greeting.speakText,
    };
    return { sessionId: res.conversationId, messages: [greeting] };
  } catch {
    // Fallback to frontend-only if API fails
    return null;
  }
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
  pastConversations: [],
  isViewingHistory: false,
  viewedMessages: [],
  isLoadingHistory: false,

  toggleStrip: () => {
    const state = get();
    const nextOpen = !state.isOpen;
    if (nextOpen && !state.sessionId) {
      if (state.userMode === 'prospect') {
        set({
          isOpen: true,
          isExpanded: true,
          sessionId: createSessionId(),
          messages: [createInitialMessage(state.userMode)],
        });
      } else {
        // Start with loading state, then create via API
        set({ isOpen: true, isExpanded: true, orbState: 'thinking' });
        initConversationViaApi(state.userMode).then(result => {
          if (result) {
            set({ sessionId: result.sessionId, messages: result.messages, orbState: 'idle' });
          } else {
            set({
              sessionId: createSessionId(),
              messages: [createInitialMessage(state.userMode)],
              orbState: 'idle',
            });
          }
        });
      }
      return;
    }
    set({ isOpen: nextOpen, isExpanded: nextOpen ? state.isExpanded : false });
  },

  expandStrip: () => {
    const state = get();
    if (!state.sessionId) {
      if (state.userMode === 'prospect') {
        set({
          isExpanded: true,
          isOpen: true,
          sessionId: createSessionId(),
          messages: [createInitialMessage(state.userMode)],
        });
      } else {
        set({ isExpanded: true, isOpen: true, orbState: 'thinking' });
        initConversationViaApi(state.userMode).then(result => {
          if (result) {
            set({ sessionId: result.sessionId, messages: result.messages, orbState: 'idle' });
          } else {
            set({
              sessionId: createSessionId(),
              messages: [createInitialMessage(state.userMode)],
              orbState: 'idle',
            });
          }
        });
      }
      return;
    }
    set({ isExpanded: true, isOpen: true });
  },

  collapseStrip: () => set({ isExpanded: false }),

  setUserMode: (mode) => set(state => {
    if (mode === state.userMode) return {};
    return {
      userMode: mode,
      sessionId: null,
      messages: [],
      leadData: null,
      leadCaptureStep: 0,
      isTTSEnabled: mode === 'driver',
      isVoiceEnabled: mode !== 'prospect',
      pastConversations: [],
      isViewingHistory: false,
      viewedMessages: [],
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

    set(s => ({
      messages: [...s.messages, userMessage],
      orbState: 'thinking' as OrbState,
      interimTranscript: '',
    }));

    if (state.userMode === 'prospect') {
      // Prospect mode: frontend-only (no auth, no API)
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
    } else {
      // Dispatcher/Driver mode: call backend API
      const sessionId = state.sessionId;
      if (!sessionId) return;

      sendMessageApi(sessionId, content, inputMode)
        .then(res => {
          // Update user message ID from backend
          const assistantMsg = apiMessageToChatMessage(res.assistantMessage, 'assistant');

          set(s => {
            // Replace the optimistic user message with backend-confirmed one
            const msgs = [...s.messages];
            const lastUserIdx = msgs.length - 1;
            if (msgs[lastUserIdx]?.role === 'user') {
              msgs[lastUserIdx] = {
                ...msgs[lastUserIdx],
                id: res.userMessage.messageId,
              };
            }
            return {
              messages: [...msgs, assistantMsg],
              orbState: 'idle' as OrbState,
            };
          });
        })
        .catch(() => {
          // Fallback to frontend engine on API error
          const classified = classifyIntent(content, state.userMode);
          const response = generateResponse(classified, state.userMode);

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
        });
    }
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
    isViewingHistory: false,
    viewedMessages: [],
  }),

  loadHistory: async () => {
    const state = get();
    if (state.userMode === 'prospect') return;

    set({ isLoadingHistory: true });
    try {
      const res = await listConversations(10);
      set({ pastConversations: res.conversations, isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  viewConversation: async (conversationId: string) => {
    set({ isLoadingHistory: true });
    try {
      const res = await getConversationMessages(conversationId);
      const messages: ChatMessage[] = res.messages.map(m => ({
        id: m.messageId,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        inputMode: m.inputMode as InputMode,
        timestamp: new Date(m.createdAt),
        intent: m.intent as Intent | undefined,
        card: m.card as any,
        action: m.action as any,
        speakText: m.speakText ?? undefined,
      }));
      set({ isViewingHistory: true, viewedMessages: messages, isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  clearView: () => set({ isViewingHistory: false, viewedMessages: [] }),
}));
```

**Step 2: Verify compilation**

Run:
```bash
cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors related to `sally-ai/store.ts` (ignore pre-existing zod/hookform errors)

**Step 3: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/store.ts
git commit -m "feat(sally-ai): integrate store with backend API + add history state"
```

---

## Task 10: Chat History UI + View-Only Mode in SallyChat

**Files:**
- Modify: `apps/web/src/features/platform/sally-ai/components/SallyChat.tsx`

**Step 1: Update SallyChat to show history and support view-only mode**

Replace the full component with this updated version that:
- Shows recent conversations in empty state (below orb)
- Supports view-only mode (renders `viewedMessages`, hides input)
- Calls `loadHistory()` on mount for non-prospect modes
- Shows a "Back" button when viewing history

```typescript
'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useSallyStore } from '../store';
import { SallyMessage } from './SallyMessage';
import { SallySuggestions } from './SallySuggestions';
import { SallyInput } from './SallyInput';
import { SallyOrb } from './SallyOrb';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function SallyChat() {
  const {
    messages,
    orbState,
    userMode,
    pastConversations,
    isViewingHistory,
    viewedMessages,
    isLoadingHistory,
    sendMessage,
    clearSession,
    expandStrip,
    loadHistory,
    viewConversation,
    clearView,
  } = useSallyStore();

  const bottomRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, viewedMessages]);

  // Re-show suggestions when conversation is cleared (new session)
  useEffect(() => {
    if (messages.length <= 1) {
      setShowSuggestions(true);
    }
  }, [messages.length]);

  // Load history on mount for non-prospect modes
  useEffect(() => {
    if (userMode !== 'prospect') {
      loadHistory();
    }
  }, [userMode, loadHistory]);

  const hasOnlyGreeting = messages.length <= 1;
  const displayMessages = isViewingHistory ? viewedMessages : messages;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages area with subtle dot grid */}
      <ScrollArea className="flex-1">
        <div className="relative">
          {/* Command center dot grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          <div className="relative p-4 space-y-4">
            {/* View-only banner */}
            {isViewingHistory && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearView}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                  Back
                </Button>
                <span className="text-[10px] text-muted-foreground">View-only</span>
              </motion.div>
            )}

            {/* Empty state: centered orb with "How can I help?" */}
            {!isViewingHistory && hasOnlyGreeting && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center py-10"
              >
                <div className="mb-4">
                  <SallyOrb state="idle" size="lg" />
                </div>
                <p className="text-sm text-muted-foreground">How can I help?</p>
              </motion.div>
            )}

            {/* Recent conversations (empty state, non-prospect) */}
            {!isViewingHistory && hasOnlyGreeting && userMode !== 'prospect' && pastConversations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2 px-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Recent</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-1">
                  {pastConversations.slice(0, 5).map((conv, i) => (
                    <motion.button
                      key={conv.conversationId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      onClick={() => viewConversation(conv.conversationId)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">
                          {conv.title || 'Untitled conversation'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {conv.messageCount} messages
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Loading history spinner */}
            {isLoadingHistory && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-[3px] h-6">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-[3px] bg-muted-foreground rounded-full"
                      animate={{ height: ['6px', '14px', '6px'] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {displayMessages.map(message => (
              <SallyMessage key={message.id} message={message} />
            ))}

            {/* Thinking: animated waveform */}
            <AnimatePresence>
              {!isViewingHistory && orbState === 'thinking' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="pl-4 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-gray-300 dark:bg-gray-700" />
                    <div className="flex items-center gap-[3px] h-6">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="w-[3px] bg-muted-foreground rounded-full"
                          animate={{ height: ['6px', '18px', '6px'] }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inline "start new" — appears after a few exchanges */}
            {!isViewingHistory && messages.length >= 4 && orbState !== 'thinking' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="flex justify-center pt-2"
              >
                <button
                  onClick={() => {
                    clearSession();
                    expandStrip();
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1 px-3 rounded-full"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Start new conversation
                </button>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Suggestions — hidden when viewing history */}
      {!isViewingHistory && (
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border"
            >
              <SallySuggestions
                mode={userMode}
                onSelect={(text) => {
                  sendMessage(text, 'text');
                  setShowSuggestions(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Input area — hidden when viewing history */}
      {!isViewingHistory && (
        <div className="border-t border-border">
          <div className="flex items-center justify-end px-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(prev => !prev)}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
            >
              {/* Sparkle icon */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 1L7 5L11 6L7 7L6 11L5 7L1 6L5 5L6 1Z" />
              </svg>
              {showSuggestions ? 'Hide quick actions' : 'Quick actions'}
            </Button>
          </div>
          <SallyInput />
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify compilation**

Run:
```bash
cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: No errors related to `SallyChat.tsx` (ignore pre-existing zod/hookform errors)

**Step 3: Commit**

```bash
git add apps/web/src/features/platform/sally-ai/components/SallyChat.tsx
git commit -m "feat(sally-ai): add chat history UI with view-only mode in SallyChat"
```

---

## Task 11: Build Verification + Full Compile Check

**Files:** None (verification only)

**Step 1: Run backend type check**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty
```
Expected: No errors

**Step 2: Run frontend type check**

Run:
```bash
cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -v "hookform\|resolvers"
```
Expected: No errors (filtering out pre-existing zod/hookform issues)

**Step 3: Run frontend build**

Run:
```bash
npx turbo run build --filter=@sally/web
```
Expected: Build succeeds (webpack compilation is separate from TS type checking, so it should pass)

**Step 4: Run backend build**

Run:
```bash
cd apps/backend && npm run build
```
Expected: Build succeeds

---

## What Stays the Same

- **SallyOrb** — nerve system animation (no change)
- **SallyMessage** — renders messages (no change, used for both active + history)
- **SallySuggestions** — quick action chips (no change)
- **SallyInput** — text/voice input (hidden in history view mode by SallyChat)
- **SallyStrip** — panel container (no change)
- **Voice hooks** — STT/TTS (no change)
- **Frontend engine files** — kept for prospect mode only + API error fallback
- **Rich cards** — all 6 card types (no change, card data comes from API now)

## What Changes

| Component | Change |
|-----------|--------|
| **Prisma schema** | New `Conversation` + `ConversationMessage` models |
| **Backend** | New `sally-ai/` domain with SallyAiController, SallyAiService, DTOs, engine |
| **Frontend API** | New `api.ts` client for conversation endpoints |
| **Store** | `sendMessage` calls API (dispatcher/driver), adds history state |
| **SallyChat** | Empty state shows recent conversations, supports view-only mode |

## Future (Not This PR)

- Streaming responses via WebSocket/SSE
- Real Claude API integration (swap `engine/` in backend)
- RAG context injection from real fleet data
- Conversation search
- Conversation deletion
- Resume conversations (currently view-only)

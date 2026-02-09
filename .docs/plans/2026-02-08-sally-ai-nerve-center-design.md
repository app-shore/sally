# Sally AI Nerve Center — Complete Feature Design

**Date:** 2026-02-08
**Status:** Design
**Type:** Feature — AI Assistant with Voice + Text

---

## 1. Overview

Transform the existing mock chat into a production-ready AI assistant with voice and text capabilities. Three distinct modes serve three audiences: prospects (sales), dispatchers (operations), and drivers (route/status).

**Current state:** Floating button → docked text chat panel with hardcoded mock responses.
**Target state:** Collapsible Sally Strip with reactive orb, voice input (STT), voice readback (TTS), intent-based mock engine, and rich response cards. Architected for LLM + RAG + MCP swap later.

---

## 2. Three Experience Modes

| Aspect | Prospect (unauth) | Dispatcher (auth/desktop) | Driver (auth/mobile) |
|---|---|---|---|
| Input | Text only | Voice + Text | Voice-first + Text |
| Voice activation | None | Tap-to-toggle | Push-to-talk |
| TTS readback | No | Yes (toggleable) | Yes (always on) |
| Scope | Sales Q&A + lead capture | Read data + safe writes | Route info + status updates |
| UI | Strip on landing page | Docked strip (collapsible) | Full-screen strip |

### Intents by Mode

**Prospect:**
- `product_info` — What does SALLY do? Features, capabilities
- `pricing` — How much does it cost? Plans?
- `integration` — Can you integrate with my TMS/ELD?
- `demo_request` — I want a demo / show me how it works
- `lead_capture` — Collect name, email, fleet size conversationally
- `general` — Anything else

**Dispatcher:**
- `alert_query` — Show me active alerts, critical alerts, alert count
- `alert_ack` — Acknowledge alert A-123 (safe write)
- `driver_lookup` — Find driver John, driver status, driver HOS
- `route_query` — Show route R-456, active routes, route status
- `hos_check` — Check HOS for driver, hours remaining
- `fleet_status` — Fleet overview, vehicles active, loads pending
- `add_note` — Add note to route/driver/load (safe write)
- `flag_driver` — Flag driver for follow-up (safe write)
- `general` — General questions

**Driver:**
- `route_status` — My current route, next stop, route progress
- `hos_status` — When's my next break? Hours remaining?
- `eta_query` — What's my ETA to next stop / final destination?
- `delay_report` — Report delay at current stop (status update)
- `arrival_report` — I've arrived at stop X (status update)
- `fuel_stop_report` — Fuel stop completed (status update)
- `weather_query` — Weather at next stop, weather alerts
- `general` — General questions

---

## 3. UI Component Design

### 3.1 The Sally Strip

**Collapsed state** — 48px wide strip on right edge:
- Small orb (32px) with breathing animation
- Click/tap to expand
- Always visible on all pages (auth + landing)

**Expanded state** — 360px wide docked panel:
- Orb hero (64px) at top with state-reactive animation
- Role-based greeting below orb
- Suggested action chips (role-based)
- Chat/conversation area (scrollable)
- Input area: mic button + text input

### 3.2 The Orb

Four visual states, all monochrome (white glow on dark, dark glow on light):

| State | Animation | Duration | Trigger |
|---|---|---|---|
| Idle | Slow breathing (scale 1.0↔1.05) | 3s cycle | Default |
| Listening | Bright glow ring, amplitude-reactive | Continuous | Mic active |
| Thinking | Fast pulse, slight rotation | 1s cycle | Processing input |
| Speaking | Ripple out effect, wave pulse | Matches TTS | Sally responding |

**Implementation:** CSS animations + Framer Motion. No WebGL/Three.js needed — keep it lightweight for ops dashboards. Reference existing `BreathingOrb.tsx` and `Pulse.tsx` patterns.

### 3.3 Message Types

Messages in the chat area display differently based on type:

```
Voice input:    🎙 icon + transcribed text + timestamp
Text input:     ⌨ icon + typed text + timestamp
Sally response: Text + optional rich card + timestamp
Action confirm: ✅ icon + confirmation text + timestamp
```

### 3.4 Rich Response Cards

Inline cards for data-heavy responses. Styled with Shadcn Card component:

- **Alert Card** — severity badge, description, driver/route, action button
- **Driver Card** — name, status, HOS remaining (progress bar), vehicle
- **Route Card** — route ID, origin→destination, stops count, ETA, status
- **HOS Card** — driver name, drive hours bar, duty hours bar, next break time
- **Fleet Card** — active vehicles, active routes, pending alerts counts
- **Lead Form Card** — name, email, fleet size inputs (prospect mode only — inline form after natural conversation)

### 3.5 Suggested Action Chips

Role-based quick actions displayed below the orb when chat is empty:

**Prospect:** "What is SALLY?", "See pricing", "Book a demo", "Integrations"
**Dispatcher:** "Active alerts", "Fleet status", "Find a driver", "Route updates"
**Driver:** "Next break", "My ETA", "Route status", "Report delay"

---

## 4. Voice Engine

### 4.1 Speech-to-Text (STT)

**Technology:** Browser Web Speech API (`SpeechRecognition`)
- Free, runs locally, no API cost
- Good enough for command-style input
- Fallback: text-only if browser doesn't support

**Behavior:**
- Desktop (dispatcher): Tap mic button to start → tap again to stop (toggle)
- Mobile (driver): Hold mic button to speak → release to stop (push-to-talk)
- Visual feedback: Orb transitions to "listening" state
- Interim results shown in input area as user speaks
- Final transcript submitted as message

**Browser support:** Chrome, Edge, Safari (with webkit prefix). Firefox partial. Graceful degradation to text-only.

### 4.2 Text-to-Speech (TTS)

**Technology:** Browser SpeechSynthesis API
- Free, built-in
- Voice selection: prefer "Google UK English Female" or similar natural voice
- Rate: 1.0, pitch: 1.0

**Behavior:**
- Dispatcher: TTS toggleable (speaker icon in header). Off by default.
- Driver: TTS always on. Can be muted.
- Prospect: No TTS.
- Orb transitions to "speaking" state during playback.
- User can interrupt by tapping mic or typing.

### 4.3 Upgrade Path

Interfaces designed so swapping is trivial:
```typescript
interface STTProvider {
  start(): void
  stop(): void
  onResult: (transcript: string, isFinal: boolean) => void
  onError: (error: Error) => void
  isSupported: boolean
}

interface TTSProvider {
  speak(text: string): Promise<void>
  stop(): void
  isSpeaking: boolean
  isSupported: boolean
}
```

Later: plug in Deepgram STT, ElevenLabs TTS — zero UI changes.

---

## 5. Mock Response Engine

### 5.1 Architecture

```
User message (text or voice transcript)
    ↓
Intent Classifier (keyword matching now, LLM later)
    ↓
Intent Router → selects handler
    ↓
Handler generates structured response
    ↓
Response rendered (text + optional rich card + optional TTS)
```

### 5.2 Intent Classifier

Keyword-based matching with confidence scoring:

```typescript
interface ClassifiedIntent {
  intent: string        // e.g. "alert_query"
  confidence: number    // 0-1
  entities: Record<string, string>  // extracted values
  // e.g. { driver_name: "John", alert_id: "A-123" }
}
```

**Matching rules (examples):**
- "alert" + "show/active/critical/how many" → `alert_query`
- "acknowledge/ack" + alert ID pattern → `alert_ack`
- "driver" + name → `driver_lookup`
- "route" + "status/show/where" → `route_query`
- "break/rest" + "when/next/how long" → `hos_status`
- "delay/delayed/late" + duration → `delay_report`
- "arrived/here/at" + stop → `arrival_report`
- No match → `general`

### 5.3 Mock Data

Realistic hardcoded data used by handlers:

```typescript
// Mock drivers
const MOCK_DRIVERS = [
  { id: "D-001", name: "John Davis", status: "driving", hos_remaining: 4.2, vehicle: "V-101", current_route: "R-456" },
  { id: "D-002", name: "Mike Johnson", status: "at_dock", hos_remaining: 7.8, vehicle: "V-102", current_route: "R-789" },
  { id: "D-003", name: "Sarah Chen", status: "resting", hos_remaining: 0, vehicle: "V-103", current_route: null },
]

// Mock alerts
const MOCK_ALERTS = [
  { id: "A-101", severity: "critical", type: "hos_warning", driver: "John Davis", message: "2.1 hrs remaining on drive window", route: "R-456" },
  { id: "A-102", severity: "warning", type: "delay", driver: null, message: "45 min behind ETA", route: "R-456" },
  { id: "A-103", severity: "info", type: "fuel_low", vehicle: "V-789", message: "Range: 45 miles", route: "R-789" },
]

// Mock routes
const MOCK_ROUTES = [
  { id: "R-456", origin: "Dallas, TX", destination: "Houston, TX", stops: 3, eta: "3:45 PM", status: "in_progress", driver: "John Davis" },
  { id: "R-789", origin: "Chicago, IL", destination: "Memphis, TN", stops: 5, eta: "8:30 PM", status: "in_progress", driver: "Mike Johnson" },
  { id: "R-012", origin: "Atlanta, GA", destination: "Miami, FL", stops: 4, eta: "Tomorrow 6:00 AM", status: "planned", driver: null },
]

// Mock fleet
const MOCK_FLEET = { active_vehicles: 12, active_routes: 8, pending_alerts: 3, drivers_available: 4, drivers_driving: 6, drivers_resting: 2 }
```

### 5.4 Response Templates

Each intent handler returns:

```typescript
interface SallyResponse {
  text: string                    // Main response text
  card?: RichCard                 // Optional rich card data
  followUp?: string              // Optional follow-up question
  action?: ActionResult           // If an action was executed
  speakText?: string             // TTS-friendly version (shorter/simpler)
}

interface RichCard {
  type: "alert" | "driver" | "route" | "hos" | "fleet" | "lead_form"
  data: Record<string, unknown>
}

interface ActionResult {
  type: string                   // "alert_ack", "note_added", "status_updated"
  success: boolean
  message: string
}
```

**Example responses:**

`alert_query` → "You have 3 active alerts: 1 critical, 1 warning, 1 info." + AlertListCard + "Want me to acknowledge any?"

`driver_lookup("John")` → "John Davis is currently driving on route R-456. He has 4.2 hours remaining on his drive window." + DriverCard

`hos_status` (driver mode) → "You have 4.2 hours remaining on your drive window. Next mandatory break at 3:45 PM." + HOSCard

`delay_report("30 minutes")` → "Got it. I've logged a 30-minute delay at your current stop. Dispatch has been notified." + ActionResult

`product_info` → "SALLY is your fleet operations assistant. I handle route planning with HOS-aware optimization, continuous monitoring with 14 trigger types, and proactive dispatcher alerts. Want to know about pricing or see a demo?"

`lead_capture` (after conversation) → "I'd love to send you more details. What's your name?" → (user answers) → "And your email?" → (user answers) → "Last one — roughly how many vehicles in your fleet?" → stores lead data

---

## 6. State Management

### 6.1 Zustand Store (Enhanced)

```typescript
interface SallyState {
  // Strip state
  isOpen: boolean
  isExpanded: boolean      // collapsed (orb only) vs expanded (full strip)

  // Session
  sessionId: string | null
  messages: ChatMessage[]

  // Voice
  orbState: "idle" | "listening" | "thinking" | "speaking"
  isVoiceEnabled: boolean
  isTTSEnabled: boolean
  isMicActive: boolean
  interimTranscript: string   // live STT text while speaking

  // User context
  userMode: "prospect" | "dispatcher" | "driver"

  // Lead capture (prospect mode)
  leadData: { name?: string; email?: string; fleetSize?: string } | null
  leadCaptureStep: number    // 0=not started, 1=name, 2=email, 3=fleet_size, 4=done

  // Actions
  toggleStrip: () => void
  expandStrip: () => void
  collapseStrip: () => void
  sendMessage: (content: string, inputMode: "voice" | "text") => void
  setOrbState: (state: OrbState) => void
  toggleTTS: () => void
  toggleMic: () => void
  clearSession: () => void
}
```

### 6.2 Message Type

```typescript
interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  inputMode: "voice" | "text"
  timestamp: Date
  intent?: string
  card?: RichCard
  action?: ActionResult
  speakText?: string
}
```

---

## 7. Component Structure

```
features/platform/sally-ai/
├── components/
│   ├── SallyStrip.tsx              # Main container (collapsed/expanded)
│   ├── SallyOrb.tsx                # Animated orb with 4 states
│   ├── SallyChat.tsx               # Chat area (messages + input)
│   ├── SallyInput.tsx              # Text input + mic button
│   ├── SallySuggestions.tsx         # Quick action chips
│   ├── SallyMessage.tsx            # Single message renderer
│   ├── SallyGlobalProvider.tsx     # Global mount (replaces GlobalSallyChat)
│   └── cards/
│       ├── AlertCard.tsx
│       ├── DriverCard.tsx
│       ├── RouteCard.tsx
│       ├── HOSCard.tsx
│       ├── FleetCard.tsx
│       └── LeadFormCard.tsx
├── engine/
│   ├── intent-classifier.ts        # Keyword → intent matching
│   ├── response-generator.ts       # Intent → response templates
│   ├── mock-data.ts                # All mock data (drivers, routes, alerts, etc.)
│   └── types.ts                    # Shared types (intents, responses, cards)
├── voice/
│   ├── use-speech-recognition.ts   # STT hook (Web Speech API)
│   ├── use-speech-synthesis.ts     # TTS hook (SpeechSynthesis API)
│   └── types.ts                    # STTProvider, TTSProvider interfaces
├── store.ts                        # Zustand store (enhanced)
└── index.ts                        # Barrel exports
```

**Why new directory (`sally-ai/`) instead of modifying `chat/`?**
- Clean separation — old chat can be removed after migration
- New component hierarchy is fundamentally different (Strip vs Panel)
- Voice engine is new subsystem
- Mock engine is new subsystem
- No risk of breaking existing chat during development

---

## 8. Integration Points

### 8.1 Global Mount

Replace current `<GlobalSallyChat />` in `layout-client.tsx` with `<SallyGlobalProvider />`:
- Detects auth state → prospect vs authenticated
- Detects route → dispatcher vs driver
- Renders `<SallyStrip />` with correct mode

### 8.2 Landing Page

Same Strip component renders on landing page for prospects:
- Text-only mode (no mic button)
- Sales intents + lead capture
- Collapsed by default, orb visible

### 8.3 Future Backend Integration

When ready to connect real backend:
1. Replace `intent-classifier.ts` with Claude API call (tool_use for intent detection)
2. Replace `response-generator.ts` with Claude API streaming response
3. Replace `mock-data.ts` with real API calls to existing endpoints
4. Add WebSocket connection for streaming
5. Add `chat_sessions` and `chat_messages` tables to database
6. Add `/api/v1/chat/stream` WebSocket endpoint

**Zero UI changes needed** — only the engine layer swaps.

---

## 9. Animation Specifications

### 9.1 Orb Animations (Framer Motion)

```typescript
// Idle: slow breathing
const idleAnimation = {
  scale: [1, 1.05, 1],
  opacity: [0.7, 1, 0.7],
  transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
}

// Listening: glow ring + amplitude response
const listeningAnimation = {
  scale: 1.1,
  opacity: 1,
  boxShadow: "0 0 30px rgba(255,255,255,0.4)",  // dark mode
  // Ring element scales with audio amplitude
}

// Thinking: fast pulse + rotation
const thinkingAnimation = {
  scale: [1, 1.08, 1],
  rotate: [0, 5, -5, 0],
  transition: { duration: 1, repeat: Infinity }
}

// Speaking: ripple outward
const speakingAnimation = {
  scale: [1, 1.03, 1],
  transition: { duration: 0.5, repeat: Infinity }
  // Plus: 3 ripple rings expanding outward (like Pulse.tsx)
}
```

### 9.2 Strip Transitions

```typescript
// Collapse → Expand
const expandTransition = {
  width: { from: 48, to: 360 },
  transition: { type: "spring", stiffness: 300, damping: 30 }
}

// Message appear
const messageAnimation = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
}

// Chip appear (staggered)
const chipStagger = {
  staggerChildren: 0.05,
  delayChildren: 0.2
}
```

---

## 10. Responsive Behavior

| Breakpoint | Strip Width | Orb Size | Behavior |
|---|---|---|---|
| Mobile (<640px) | Full screen overlay | 48px | Push-to-talk, full screen when expanded |
| Tablet (640-1024px) | 360px docked | 56px | Tap-to-toggle, docked right |
| Desktop (>1024px) | 360px docked | 64px | Tap-to-toggle, docked right |

**Mobile expanded:** Strip takes full screen with semi-transparent backdrop. Close button returns to collapsed orb.

---

## 11. Accessibility

- **Keyboard:** Tab to orb → Enter to expand → Tab through messages → Tab to input
- **Screen reader:** Orb announces state changes. Messages announced on arrival.
- **Reduced motion:** Orb uses opacity-only animation (no scale/rotation). Strip uses instant width change.
- **Voice fallback:** If Web Speech API unavailable, mic button hidden. Text-only mode.

---

## 12. Implementation Phases

### Phase 1: Core Strip + Text Chat (This PR)
- [ ] SallyStrip component (collapsed/expanded)
- [ ] SallyOrb with 4 animated states
- [ ] SallyChat with message rendering
- [ ] SallyInput with text input
- [ ] SallySuggestions chips
- [ ] Intent classifier (keyword matching)
- [ ] Mock response generator with all intents
- [ ] Mock data (drivers, alerts, routes, fleet)
- [ ] Rich response cards (Alert, Driver, Route, HOS, Fleet)
- [ ] Zustand store (enhanced)
- [ ] Global provider (replaces GlobalSallyChat)
- [ ] Three modes: prospect / dispatcher / driver
- [ ] Dark theme compliant
- [ ] Responsive (mobile / tablet / desktop)

### Phase 2: Voice Engine (This PR)
- [ ] useSpeechRecognition hook
- [ ] useSpeechSynthesis hook
- [ ] Tap-to-toggle (desktop)
- [ ] Push-to-talk (mobile)
- [ ] TTS readback with toggle
- [ ] Orb reactive to voice amplitude
- [ ] Interim transcript display

### Phase 3: Lead Capture (This PR)
- [ ] Conversational lead capture flow
- [ ] LeadFormCard component
- [ ] Lead data in store
- [ ] Multi-step collection (name → email → fleet size)

### Phase 4: Backend Integration (Future PR)
- [ ] Database tables (chat_sessions, chat_messages, chat_actions)
- [ ] WebSocket endpoint (/api/v1/chat/stream)
- [ ] Claude API integration with tool_use
- [ ] RAG context injection (user's fleet data)
- [ ] Real action execution (alert ack, notes, status updates)
- [ ] Conversation history persistence

### Phase 5: Premium Voice (Future PR)
- [ ] ElevenLabs TTS integration
- [ ] Deepgram STT integration
- [ ] Wake word ("Hey Sally")
- [ ] Continuous listening mode

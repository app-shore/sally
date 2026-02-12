# Sally AI Nerve Center -- Design

> **Status:** Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-08-sally-ai-nerve-center-design.md`

---

## Overview

Sally AI is the fleet operations assistant -- an AI-powered chat interface with voice and text input, three user modes (prospect/dispatcher/driver), keyword-based intent classification, rich response cards, and an animated orb providing visual state feedback. The system is architected for future LLM + RAG swap with zero UI changes.

---

## Three Experience Modes

| Aspect | Prospect (unauth) | Dispatcher (auth/desktop) | Driver (auth/mobile) |
|--------|-------------------|--------------------------|----------------------|
| Input | Text only | Voice + Text | Voice-first + Text |
| Voice activation | None | Tap-to-toggle | Push-to-talk |
| TTS readback | No | Yes (toggleable) | Yes (always on) |
| Scope | Sales Q&A + lead capture | Read data + safe writes | Route info + status updates |
| UI | Strip on landing page | Docked strip (collapsible) | Full-screen strip |

---

## Intents by Mode

### Prospect
`product_info`, `pricing`, `integration`, `demo_request`, `lead_capture`, `general`

### Dispatcher
`alert_query`, `alert_ack`, `driver_lookup`, `route_query`, `hos_check`, `fleet_status`, `add_note`, `flag_driver`, `general`

### Driver
`route_status`, `hos_status`, `eta_query`, `delay_report`, `arrival_report`, `fuel_stop_report`, `weather_query`, `general`

---

## UI Component Design

### Sally Strip
- **Collapsed:** 48px wide strip on right edge with small orb (32px) and breathing animation
- **Expanded:** 360px wide docked panel with orb hero (64px), greeting, suggestion chips, chat area, input area

### The Orb (4 States)
| State | Animation | Trigger |
|-------|-----------|---------|
| Idle | Slow breathing (scale 1.0 to 1.05, 3s cycle) | Default |
| Listening | Bright glow ring, amplitude-reactive | Mic active |
| Thinking | Fast pulse + slight rotation (1s cycle) | Processing input |
| Speaking | Ripple out effect, wave pulse | Sally responding (TTS) |

Implementation: CSS animations + Framer Motion. No WebGL/Three.js.

### Rich Response Cards
- **AlertCard** -- severity badge, description, driver/route, action button
- **AlertListCard** -- summary of active alerts with counts
- **DriverCard** -- name, status, HOS remaining (progress bar), vehicle
- **RouteCard** -- route ID, origin to destination, stops count, ETA, status
- **HOSCard** -- driver name, drive hours bar, duty hours bar, next break time
- **FleetCard** -- active vehicles, routes, alerts counts
- **LeadFormCard** -- name, email, fleet size inputs (prospect only)

### Suggested Action Chips
- **Prospect:** "What is SALLY?", "See pricing", "Book a demo", "Integrations"
- **Dispatcher:** "Active alerts", "Fleet status", "Find a driver", "Route updates"
- **Driver:** "Next break", "My ETA", "Route status", "Report delay"

---

## Voice Engine

### Speech-to-Text (STT)
- Technology: Browser Web Speech API (`SpeechRecognition`)
- Desktop: Tap mic to start, tap again to stop (toggle)
- Mobile: Hold mic to speak, release to stop (push-to-talk)
- Interim results shown in input area as user speaks
- Graceful fallback to text-only if browser unsupported

### Text-to-Speech (TTS)
- Technology: Browser SpeechSynthesis API
- Dispatcher: Toggleable (off by default)
- Driver: Always on (can be muted)
- Prospect: No TTS
- Orb transitions to "speaking" state during playback

### Upgrade Path Interfaces
```typescript
interface STTProvider {
  start(): void;
  stop(): void;
  onResult: ((transcript: string, isFinal: boolean) => void) | null;
  onError: ((error: Error) => void) | null;
  isSupported: boolean;
}

interface TTSProvider {
  speak(text: string): Promise<void>;
  stop(): void;
  isSpeaking: boolean;
  isSupported: boolean;
}
```

Later: Deepgram STT, ElevenLabs TTS -- zero UI changes.

---

## Mock Response Engine

### Architecture

```
User message (text or voice transcript)
    |
    v
Intent Classifier (keyword matching now, LLM later)
    |
    v
Intent Router -> selects handler
    |
    v
Handler generates structured response
    |
    v
Response rendered (text + optional rich card + optional TTS)
```

### Intent Classifier
Keyword-based matching with confidence scoring. Each mode has its own rule set. Rules contain keyword arrays and optional entity extraction patterns (regex).

### Response Structure
```typescript
interface SallyResponse {
  text: string;
  card?: RichCard;
  followUp?: string;
  action?: ActionResult;
  speakText?: string;       // TTS-friendly version
}
```

### Mock Data
Hardcoded realistic fleet data: 5 drivers, 5 alerts, 4 routes, 1 fleet summary. Used by all handler functions.

---

## State Management (Zustand Store)

```typescript
interface SallyState {
  // Strip
  isOpen: boolean;
  isExpanded: boolean;

  // Session
  sessionId: string | null;
  messages: ChatMessage[];

  // Voice
  orbState: 'idle' | 'listening' | 'thinking' | 'speaking';
  isVoiceEnabled: boolean;
  isTTSEnabled: boolean;
  isMicActive: boolean;
  interimTranscript: string;

  // User context
  userMode: 'prospect' | 'dispatcher' | 'driver';

  // Lead capture (prospect)
  leadData: LeadData | null;
  leadCaptureStep: number;

  // Chat history
  pastConversations: ConversationSummary[];
  isViewingHistory: boolean;
  viewedMessages: ChatMessage[];
  isLoadingHistory: boolean;
}
```

---

## Component Structure (Validated Against Code)

```
apps/web/src/features/platform/sally-ai/
  components/
    SallyStrip.tsx              -- Main container (collapsed/expanded)
    SallyOrb.tsx                -- Animated orb with 4 states
    SallyChat.tsx               -- Chat area (messages + input + history)
    SallyInput.tsx              -- Text input + mic button
    SallySuggestions.tsx         -- Quick action chips
    SallyMessage.tsx            -- Single message renderer
    SallyGlobalProvider.tsx     -- Global mount (replaces GlobalSallyChat)
    cards/
      AlertCard.tsx
      AlertListCard.tsx
      DriverCard.tsx
      RouteCard.tsx
      HOSCard.tsx
      FleetCard.tsx
      LeadFormCard.tsx (if exists)
  engine/
    intent-classifier.ts        -- Keyword to intent matching
    response-generator.ts       -- Intent to response templates
    mock-data.ts                -- All mock data
    types.ts                    -- Shared types
  voice/
    use-speech-recognition.ts   -- STT hook (Web Speech API)
    use-speech-synthesis.ts     -- TTS hook (SpeechSynthesis API)
    types.ts                    -- STTProvider, TTSProvider interfaces
  api.ts                        -- Backend API client
  store.ts                      -- Zustand store (enhanced with API + history)
  index.ts                      -- Barrel exports
```

---

## Responsive Behavior

| Breakpoint | Strip Width | Orb Size | Behavior |
|-----------|-------------|---------|----------|
| Mobile (<640px) | Full screen overlay | 48px | Push-to-talk, full screen when expanded |
| Tablet (640-1024px) | 360px docked | 56px | Tap-to-toggle, docked right |
| Desktop (>1024px) | 360px docked | 64px | Tap-to-toggle, docked right |

---

## Accessibility

- Keyboard: Tab to orb, Enter to expand, Tab through messages, Tab to input
- Screen reader: Orb announces state changes, messages announced on arrival
- Reduced motion: Opacity-only animation (no scale/rotation), instant strip width
- Voice fallback: If Web Speech API unavailable, mic button hidden

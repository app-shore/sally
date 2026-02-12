# Sally AI Nerve Center - Implementation

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-08-sally-ai-nerve-center-implementation.md`, `2026-02-09-sally-ai-backend-api-and-history.md`

---

## Overview

Production-ready AI assistant with voice and text capabilities, three user modes (prospect/dispatcher/driver), keyword-based intent classification, animated orb, rich response cards, and backend-persisted chat history. Frontend Sally AI module plus NestJS backend API with Postgres-backed conversation storage.

---

## Architecture

### Frontend Engine (Prospect Mode Only)
Prospect mode stays frontend-only (no auth required). Uses keyword-based intent classifier and response generator with mock fleet data.

### Backend API (Dispatcher/Driver Modes)
Backend receives messages, classifies intent, generates mock responses, stores conversations in Postgres, returns structured responses.

```
Frontend (SallyChat) -> POST /conversations/:id/messages -> Backend Engine
                     -> GET /conversations (history)      -> Prisma queries
```

---

## File Structure (Validated)

### Backend Files

```
apps/backend/src/domains/platform/sally-ai/
├── engine/
│   ├── types.ts                 # UserMode, Intent types, RichCard, SallyResponse
│   ├── mock-data.ts             # Mock drivers, alerts, routes, fleet data
│   ├── intent-classifier.ts     # Keyword-based intent classification
│   └── response-generator.ts    # Intent-to-response mapping
├── dto/
│   ├── create-conversation.dto.ts  # userMode validation
│   └── send-message.dto.ts         # content, inputMode validation
├── sally-ai.controller.ts       # Route prefix: /conversations
├── sally-ai.service.ts          # Conversation CRUD + message processing
└── sally-ai.module.ts           # SallyAiModule
```

### Frontend Files

```
apps/web/src/features/platform/sally-ai/
├── engine/
│   ├── types.ts                 # Full types including OrbState, ChatMessage, LeadData
│   ├── mock-data.ts             # Shared mock data + suggestion chips per mode
│   ├── intent-classifier.ts     # Frontend classifier (prospect mode)
│   └── response-generator.ts    # Frontend generator (prospect mode)
├── components/
│   ├── SallyStrip.tsx           # Collapsible right-edge panel
│   ├── SallyOrb.tsx             # Animated orb with state visualization
│   ├── SallyChat.tsx            # Main chat container
│   ├── SallyInput.tsx           # Text/voice input bar
│   ├── SallyMessage.tsx         # Message bubble component
│   ├── SallySuggestions.tsx     # Suggestion chip row
│   ├── SallyGlobalProvider.tsx  # Global keyboard shortcut (S key)
│   └── cards/
│       ├── RichCardRenderer.tsx # Card type dispatcher
│       ├── AlertCard.tsx        # Alert display card
│       ├── DriverCard.tsx       # Driver status card
│       ├── FleetCard.tsx        # Fleet overview card
│       ├── HOSCard.tsx          # HOS status card
│       ├── LeadFormCard.tsx     # Prospect lead capture
│       └── RouteCard.tsx        # Route status card
├── voice/
│   ├── types.ts                 # STTProvider, TTSProvider interfaces
│   ├── use-speech-recognition.ts # Web Speech API STT hook
│   └── use-speech-synthesis.ts   # SpeechSynthesis TTS hook
├── api.ts                        # API client for backend endpoints
├── store.ts                      # Zustand store (sessions, messages, orb state)
└── index.ts                      # Barrel exports
```

---

## Prisma Models (Validated in schema)

### Conversation Model

```prisma
model Conversation {
  id                Int                   @id @default(autoincrement())
  conversationId    String                @unique @db.VarChar(50)
  tenant            Tenant                @relation(...)
  tenantId          Int
  user              User                  @relation(...)
  userId            Int
  userMode          String                @db.VarChar(20)
  title             String?               @db.VarChar(255)
  isActive          Boolean               @default(true)
  createdAt         DateTime
  updatedAt         DateTime
  messages          ConversationMessage[]
}

model ConversationMessage {
  id                Int                   @id @default(autoincrement())
  messageId         String                @unique @db.VarChar(50)
  conversation      Conversation          @relation(...)
  conversationId    Int
  role              String                @db.VarChar(20)
  content           String                @db.Text
  inputMode         String                @db.VarChar(10)
  intent            String?               @db.VarChar(50)
  card              Json?
  action            Json?
  speakText         String?               @db.Text
  createdAt         DateTime
}
```

---

## Intent Classification

### Three Mode Rulesets

**Prospect intents:** product_info, pricing, integration, demo_request, lead_capture, general
**Dispatcher intents:** alert_query, alert_ack, driver_lookup, route_query, hos_check, fleet_status, add_note, flag_driver, general
**Driver intents:** route_status, hos_status, eta_query, delay_report, arrival_report, fuel_stop_report, weather_query, general

### Keyword Matching
Each mode has `KeywordRule[]` with OR groups of AND keywords plus optional entity extraction via regex patterns.

---

## Rich Card Types

| Card Type | Data | Used By |
|-----------|------|---------|
| `alert` | Single alert detail | Dispatcher |
| `alert_list` | List of active alerts | Dispatcher |
| `driver` | Driver status/HOS | Dispatcher |
| `route` | Route progress/ETA | Both |
| `hos` | HOS remaining | Driver |
| `fleet` | Fleet overview stats | Dispatcher |
| `lead_form` | Name/email/fleet capture | Prospect |

---

## Voice Capabilities

- **STT (Speech-to-Text):** Web Speech API via `useSpeechRecognition` hook
- **TTS (Text-to-Speech):** SpeechSynthesis API via `useSpeechSynthesis` hook
- **Orb States:** idle, listening, thinking, speaking (with Framer Motion animations)
- **Keyboard Shortcut:** Press `S` to toggle Sally panel (via SallyGlobalProvider)

---

## Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/conversations` | Create new conversation |
| GET | `/conversations` | List conversations for user |
| POST | `/conversations/:id/messages` | Send message, get response |
| GET | `/conversations/:id` | Get conversation with messages |

---

## Current State

- ✅ Full frontend Sally AI module (orb, chat, voice, cards, suggestions)
- ✅ Backend engine (classifier, generator, mock data) mirrored from frontend
- ✅ Backend API with conversation persistence
- ✅ Prisma models (Conversation, ConversationMessage) with relations
- ✅ Chat history displayed in empty state
- ✅ Three user modes with distinct intent sets
- ✅ 7 rich card types with dedicated components
- ✅ Voice input (STT) and voice readback (TTS)
- ✅ Animated orb with 4 states
- ✅ Global keyboard shortcut (S key)
- 🔲 Real Claude API integration (designed for zero UI changes when swapped)
- 🔲 RAG/context injection from fleet data

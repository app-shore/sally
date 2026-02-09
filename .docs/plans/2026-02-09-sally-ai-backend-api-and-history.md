# Sally AI — Backend API Layer + Chat History

**Date:** February 9, 2026
**Status:** Design + Implementation Plan
**Builds on:** `2026-02-08-sally-ai-nerve-center-design.md` (Phase 4 brought forward)
**Branch:** `feature/sally-ai-nerve-center`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## Problem

The current Sally AI implementation has the entire response engine hardcoded in the frontend:
- `engine/intent-classifier.ts` — keyword matching runs in browser
- `engine/response-generator.ts` — response templates live in browser
- `engine/mock-data.ts` — mock fleet data lives in browser
- `store.ts` — `sendMessage()` calls classifier + generator directly, uses `setTimeout` to simulate delay
- No conversation persistence — `clearSession()` destroys everything
- No chat history — users can't see previous conversations

This works for a demo but has two problems:
1. When we swap to real LLM (Claude API), ALL the logic needs to move to backend anyway
2. There's no history, which makes it feel like a toy

## Solution

Move the response engine to the **NestJS backend** as a proper API, keeping mock responses for now (no real LLM yet). Add conversation persistence with Prisma. Frontend becomes a thin client that calls APIs.

**Key principle:** The backend returns mock responses now, but the API contract is identical to what a real Claude-powered version would return. When we add real AI, only the service implementation changes — zero API/frontend changes.

---

## Architecture

```
Frontend (React)                    Backend (NestJS)
─────────────────                   ─────────────────
SallyInput                          POST /api/v1/conversations
  ↓ user types message                → Creates conversation
SallyStore.sendMessage()
  ↓ calls API                       POST /api/v1/conversations/:id/messages
POST /conversations/:id/messages      → Receives user message
  ↓ backend processes                 → Classifies intent (mock)
  ↓ returns response                  → Generates response (mock)
SallyStore receives response          → Stores both messages
  ↓ renders in UI                    → Returns assistant message

SallyChat (empty state)             GET /api/v1/conversations
  ↓ shows recent sessions             → Lists user's conversations
  ↓ tap to view
                                    GET /api/v1/conversations/:id/messages
                                      → Returns conversation messages
```

---

## Database Schema

### New Prisma Models

```prisma
model Conversation {
  id              Int              @id @default(autoincrement())
  conversationId  String           @unique @db.VarChar(50)
  tenant          Tenant           @relation(fields: [tenantId], references: [id])
  tenantId        Int
  user            User             @relation(fields: [userId], references: [id])
  userId          Int
  userMode        String           @db.VarChar(20)  // 'prospect' | 'dispatcher' | 'driver'
  title           String?          @db.VarChar(255) // Auto-generated from first user message
  isActive        Boolean          @default(true)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  messages        ConversationMessage[]

  @@index([tenantId, userId, createdAt])
}

model ConversationMessage {
  id              Int              @id @default(autoincrement())
  messageId       String           @unique @db.VarChar(50)
  conversation    Conversation     @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  conversationId  Int
  role            String           @db.VarChar(20)  // 'user' | 'assistant' | 'system'
  content         String           @db.Text
  inputMode       String           @db.VarChar(10)  // 'voice' | 'text'
  intent          String?          @db.VarChar(50)  // classified intent
  card            Json?            // rich card data (RichCard type)
  action          Json?            // action result (ActionResult type)
  speakText       String?          @db.Text         // TTS-friendly version
  createdAt       DateTime         @default(now())

  @@index([conversationId, createdAt])
}
```

### Relations to Add

```prisma
// In Tenant model, add:
conversations   Conversation[]

// In User model, add:
conversations   Conversation[]
```

---

## API Endpoints

### 1. Create Conversation
```
POST /api/v1/conversations
Body: { userMode: "dispatcher" }
Response: {
  conversationId: "conv_abc123",
  userMode: "dispatcher",
  greeting: { messageId, role: "assistant", content: "Hi! I'm SALLY...", ... },
  createdAt: "2026-02-09T..."
}
```

### 2. Send Message (+ get response)
```
POST /api/v1/conversations/:conversationId/messages
Body: { content: "Show me active alerts", inputMode: "text" }
Response: {
  userMessage: { messageId, role: "user", content, inputMode, createdAt },
  assistantMessage: { messageId, role: "assistant", content, intent, card?, action?, speakText?, createdAt }
}
```
Backend does: store user message → classify intent → generate response → store assistant message → return both.

### 3. List Conversations
```
GET /api/v1/conversations?limit=10
Response: {
  conversations: [
    { conversationId, userMode, title, messageCount, lastMessageAt, createdAt },
    ...
  ]
}
```

### 4. Get Conversation Messages (view-only history)
```
GET /api/v1/conversations/:conversationId/messages
Response: {
  conversationId,
  userMode,
  messages: [
    { messageId, role, content, inputMode, intent?, card?, action?, speakText?, createdAt },
    ...
  ]
}
```

### 5. Prospect (Unauthenticated) Conversation
```
POST /api/v1/conversations/prospect
Body: { userMode: "prospect" }
Response: same as #1
```
Uses `@Public()` decorator — no auth required. No persistence (returns greeting, in-memory only). Or optionally stores with a guest session token.

For simplicity in POC: **prospect mode keeps the current frontend-only approach** (no backend calls). Only dispatcher and driver modes use the API.

---

## Backend Implementation

### Module Location
```
apps/backend/src/domains/platform/conversations/
├── conversations.module.ts
├── conversations.controller.ts
├── conversations.service.ts
├── dto/
│   ├── create-conversation.dto.ts
│   ├── send-message.dto.ts
│   ├── conversation-response.dto.ts
│   └── message-response.dto.ts
└── engine/
    ├── intent-classifier.ts        # Moved from frontend (same logic)
    ├── response-generator.ts       # Moved from frontend (same logic)
    └── mock-data.ts                # Moved from frontend (same data)
```

### Service Layer

```typescript
@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async createConversation(userId: number, tenantId: number, userMode: string) {
    // 1. Create conversation record
    // 2. Generate greeting message
    // 3. Store greeting as first assistant message
    // 4. Return conversation + greeting
  }

  async sendMessage(conversationId: string, content: string, inputMode: string) {
    // 1. Store user message
    // 2. Classify intent (mock keyword matcher)
    // 3. Generate response (mock templates)
    // 4. Store assistant message
    // 5. Update conversation title (from first user message)
    // 6. Return both messages
  }

  async listConversations(userId: number, tenantId: number, limit: number) {
    // Query conversations with message count + last message timestamp
  }

  async getMessages(conversationId: string, userId: number, tenantId: number) {
    // Return all messages for a conversation (view-only)
  }
}
```

---

## Frontend Changes

### Store Updates

```typescript
// Remove from store:
// - Direct calls to classifyIntent / generateResponse
// - setTimeout mock delay

// Add to store:
interface SallyState {
  // ... existing fields ...

  // History
  pastConversations: ConversationSummary[];

  // Actions
  sendMessage: (content: string, inputMode: InputMode) => Promise<void>;  // Now async, calls API
  createConversation: () => Promise<void>;  // Calls POST /conversations
  loadHistory: () => Promise<void>;         // Calls GET /conversations
  viewConversation: (id: string) => Promise<void>;  // Calls GET /conversations/:id/messages
  clearView: () => void;                    // Back to new conversation
}

interface ConversationSummary {
  conversationId: string;
  userMode: UserMode;
  title: string | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}
```

### API Client

Create `features/platform/sally-ai/api.ts`:
```typescript
const BASE = '/api/v1/conversations';

export async function createConversation(userMode: string) { ... }
export async function sendMessage(conversationId: string, content: string, inputMode: string) { ... }
export async function listConversations(limit?: number) { ... }
export async function getConversationMessages(conversationId: string) { ... }
```

Uses existing auth token from auth store for Authorization header.

### Chat History UI

In the empty state of `SallyChat`, below the orb and "How can I help?", show recent conversations:

```
     [Nerve Orb]
   How can I help?

  ─── Recent ───────────────────
  Check driver 14 HOS          2m
  Show me critical alerts       1h
  What's the fleet status      3h
```

- Tap a conversation → loads messages read-only (no input bar, greyed out)
- "Back to new conversation" link at top returns to empty state
- Max 10 conversations shown (paginated via API)

### Prospect Mode Exception

Prospect mode continues to use the **frontend-only engine** (no auth = no API calls). The existing `intent-classifier.ts` and `response-generator.ts` stay in frontend but only for prospect mode. Dispatcher and driver modes go through the API.

---

## Implementation Tasks

### Task 1: Prisma Schema — Conversation Models
**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Steps:**
1. Add `Conversation` model with fields: id, conversationId, tenantId, userId, userMode, title, isActive, createdAt, updatedAt
2. Add `ConversationMessage` model with fields: id, messageId, conversationId, role, content, inputMode, intent, card (Json), action (Json), speakText, createdAt
3. Add `conversations` relation to `Tenant` and `User` models
4. Run `npx prisma migrate dev --name add_conversations`

**Verify:** `npx prisma generate` succeeds, migration applies cleanly.

---

### Task 2: Backend DTOs
**Files:**
- Create: `apps/backend/src/domains/platform/conversations/dto/create-conversation.dto.ts`
- Create: `apps/backend/src/domains/platform/conversations/dto/send-message.dto.ts`

**Step 1: Create conversation DTO**
```typescript
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateConversationDto {
  @IsNotEmpty()
  @IsEnum(['prospect', 'dispatcher', 'driver'])
  userMode: string;
}
```

**Step 2: Send message DTO**
```typescript
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsEnum(['text', 'voice'])
  inputMode: string;
}
```

**Verify:** DTOs compile with no errors.

---

### Task 3: Backend Mock Engine (Move from Frontend)
**Files:**
- Create: `apps/backend/src/domains/platform/conversations/engine/mock-data.ts`
- Create: `apps/backend/src/domains/platform/conversations/engine/intent-classifier.ts`
- Create: `apps/backend/src/domains/platform/conversations/engine/response-generator.ts`
- Create: `apps/backend/src/domains/platform/conversations/engine/types.ts`

**Steps:**
1. Copy types from `apps/web/src/features/platform/sally-ai/engine/types.ts` — only the engine types (Intent, ClassifiedIntent, SallyResponse, RichCard, ActionResult, MockDriver, MockAlert, MockRoute, MockFleet). Remove UI types (ChatMessage, LeadData, OrbState etc — those stay frontend-only).
2. Copy mock data from `apps/web/src/features/platform/sally-ai/engine/mock-data.ts`
3. Copy intent classifier from `apps/web/src/features/platform/sally-ai/engine/intent-classifier.ts`
4. Copy response generator from `apps/web/src/features/platform/sally-ai/engine/response-generator.ts`
5. Adjust imports to use local types

**Verify:** `npx tsc --noEmit` in backend passes.

---

### Task 4: Conversations Service
**Files:**
- Create: `apps/backend/src/domains/platform/conversations/conversations.service.ts`

**Steps:**
1. Inject `PrismaService`
2. Implement `createConversation(userId, tenantId, userMode)`:
   - Generate `conversationId` as `conv_${cuid()}`
   - Create conversation record
   - Generate greeting message based on userMode
   - Store greeting as ConversationMessage with `messageId: msg_${cuid()}`
   - Return conversation + greeting
3. Implement `sendMessage(conversationId, content, inputMode, userId, tenantId)`:
   - Verify conversation belongs to user/tenant
   - Store user message
   - Call `classifyIntent(content, userMode)`
   - Call `generateResponse(classified, userMode)`
   - Store assistant message
   - Auto-set title from first user message (truncated to 100 chars)
   - Return both messages
4. Implement `listConversations(userId, tenantId, limit)`:
   - Query conversations ordered by `updatedAt` desc
   - Include `_count: { messages: true }` for message count
   - Include last message timestamp
5. Implement `getMessages(conversationId, userId, tenantId)`:
   - Verify ownership
   - Return all messages ordered by `createdAt`

**Verify:** Service compiles, methods have correct types.

---

### Task 5: Conversations Controller
**Files:**
- Create: `apps/backend/src/domains/platform/conversations/conversations.controller.ts`

**Steps:**
1. `@Controller('conversations')` with `@ApiTags('Conversations')`
2. `POST /` — `createConversation()` — requires auth, uses `@CurrentUser()` and tenant from guard
3. `POST /:conversationId/messages` — `sendMessage()` — requires auth
4. `GET /` — `listConversations()` — requires auth, `@Query('limit')` with default 10
5. `GET /:conversationId/messages` — `getMessages()` — requires auth

All endpoints use `@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)`.

**Verify:** Controller compiles, Swagger docs render correctly.

---

### Task 6: Conversations Module + Registration
**Files:**
- Create: `apps/backend/src/domains/platform/conversations/conversations.module.ts`
- Modify: `apps/backend/src/domains/platform/platform.module.ts` (or wherever modules are registered)

**Steps:**
1. Create module importing `PrismaModule`, providing `ConversationsService`, declaring controller
2. Register in parent module
3. Verify app starts: `npm run start:dev` in backend

**Verify:** `GET /api` shows conversation endpoints in Swagger. App starts without errors.

---

### Task 7: Frontend API Client
**Files:**
- Create: `apps/web/src/features/platform/sally-ai/api.ts`

**Steps:**
1. Create typed API functions using fetch with auth headers from auth store:
   - `createConversation(userMode)` → POST
   - `sendMessage(conversationId, content, inputMode)` → POST
   - `listConversations(limit?)` → GET
   - `getConversationMessages(conversationId)` → GET
2. Handle errors, return typed responses
3. Use the backend URL from environment config (or relative `/api/v1/` path if proxied)

**Verify:** Types align with backend DTOs.

---

### Task 8: Update Store — API Integration
**Files:**
- Modify: `apps/web/src/features/platform/sally-ai/store.ts`

**Steps:**
1. Add to state: `pastConversations: ConversationSummary[]`, `isViewingHistory: boolean`, `viewedMessages: ChatMessage[]`
2. Change `sendMessage()`:
   - For `prospect` mode: keep existing frontend-only logic (no change)
   - For `dispatcher`/`driver` mode: call API, update messages from response
3. Change `expandStrip()` / `toggleStrip()`:
   - For non-prospect: call `createConversation()` API when creating new session
4. Add `loadHistory()`: calls `listConversations()`, stores in `pastConversations`
5. Add `viewConversation(id)`: calls `getConversationMessages()`, stores in `viewedMessages`, sets `isViewingHistory: true`
6. Add `clearView()`: resets `isViewingHistory: false`, clears `viewedMessages`
7. Update `clearSession()`: just resets local state (conversation stays in DB)

**Verify:** TypeScript compiles, store actions have correct types.

---

### Task 9: Chat History UI in Empty State
**Files:**
- Modify: `apps/web/src/features/platform/sally-ai/components/SallyChat.tsx`

**Steps:**
1. In empty state (below orb + "How can I help?"), if `pastConversations.length > 0`, show "Recent" section
2. Each conversation shows: title (or "Untitled"), relative timestamp, mode badge
3. Tap → calls `viewConversation(id)`
4. When `isViewingHistory: true`:
   - Render `viewedMessages` read-only (same `SallyMessage` component)
   - Show a "Back" button at top to return to new conversation
   - Hide input bar + suggestions (read-only mode)
5. Call `loadHistory()` on mount when in non-prospect mode

**Verify:** Empty state shows recent conversations, tap loads messages, back returns to new state.

---

### Task 10: Build Verification + Cleanup
**Steps:**
1. Run `npx tsc --noEmit` in both `apps/web` and `apps/backend`
2. Run `npm run lint` in both
3. Verify frontend build: `npx turbo run build --filter=@sally/web`
4. Verify backend build: `npx turbo run build --filter=@sally/backend` (or `npm run build` in apps/backend)
5. Remove the inline "Start new conversation" button from chat (replaced by proper history flow)
6. Test: open Sally → new conversation → send messages → start new → see history → tap old conversation → view-only → back

---

## What Stays the Same

- **SallyOrb** — nerve system animation (no change)
- **SallyMessage** — renders messages (no change, used for both active + history)
- **SallySuggestions** — quick action chips (no change)
- **SallyInput** — text/voice input (hidden in history view mode)
- **SallyStrip** — panel container (no change)
- **Voice hooks** — STT/TTS (no change)
- **Frontend engine files** — kept for prospect mode only
- **Rich cards** — all 6 card types (no change, card data comes from API now)

## What Changes

- **Store** — `sendMessage` calls API instead of local engine (except prospect)
- **SallyChat** — empty state shows recent conversations, supports read-only history view
- **New files** — API client, backend module/controller/service/DTOs/engine

## Future (Not This PR)

- Streaming responses via WebSocket/SSE
- Real Claude API integration (swap `engine/` in backend)
- RAG context injection from real fleet data
- Conversation search
- Conversation deletion

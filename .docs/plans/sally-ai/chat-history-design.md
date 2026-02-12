# Sally AI Chat History - Design

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-09-sally-ai-chat-history-brainstorm.md`, `2026-02-09-sally-ai-backend-api-and-history.md`

---

## Overview

Chat history persistence and display for Sally AI. Conversations are stored in Postgres via backend API. History is displayed as view-only in the Sally panel's empty state. Users can browse previous conversations and start new ones.

---

## Design Decision: Backend Persistence + Empty State Display

After evaluating 5 options (localStorage stack, sliding panel, thread sidebar, command palette, conversation memory), the implementation went beyond the initial "Option A: Recent Sessions Stack" recommendation and implemented full backend persistence.

### Rationale
- Backend persistence provides cross-device access
- Supports multi-user scenarios (dispatcher shift handoffs)
- Foundation for future AI context injection
- Prisma models already needed for conversation tracking

---

## Architecture

### Data Flow

```
User opens Sally -> Empty state shows recent conversations
  -> GET /api/v1/conversations (returns list with preview)
  -> User clicks conversation -> Load full messages
  -> GET /api/v1/conversations/:id (returns messages)
  -> View-only display of past conversation

User starts new conversation:
  -> POST /api/v1/conversations { userMode }
  -> Returns new conversation ID
  -> Messages sent via POST /conversations/:id/messages
```

### Storage Model

```prisma
model Conversation {
  conversationId    String    @unique
  tenantId          Int       // Multi-tenant isolation
  userId            Int       // Per-user conversations
  userMode          String    // 'prospect' | 'dispatcher' | 'driver'
  title             String?   // Auto-generated from first user message
  isActive          Boolean   @default(true)
  createdAt         DateTime
  messages          ConversationMessage[]
}

model ConversationMessage {
  messageId         String    @unique
  conversationId    Int
  role              String    // 'user' | 'assistant' | 'system'
  content           String
  inputMode         String    // 'voice' | 'text'
  intent            String?   // Classified intent
  card              Json?     // Rich card data
  action            Json?     // Action result data
  speakText         String?   // TTS text
  createdAt         DateTime
}
```

---

## UI Integration

### Empty State (History View)

When no active conversation, the Sally panel shows:
1. Animated orb in idle state
2. "How can I help?" greeting
3. Suggestion chips for current mode
4. **Recent conversations** list below (from backend)

Each history item shows:
- First user message as title (or auto-generated title)
- Relative timestamp ("2m ago", "1h ago")
- User mode badge (dispatcher/driver)
- Message count

### History Interaction
- Tap a conversation -> loads full messages as read-only
- Read-only messages display without input bar
- "Start New Conversation" button to return to active mode
- Current active conversation pushed to history on "New Conversation" action

### Prospect Mode Exception
Prospect mode (unauthenticated) does not persist conversations. Uses frontend-only engine with no backend calls. No history displayed for prospects.

---

## Backend Implementation

### SallyAiService Methods

```typescript
// Create new conversation
createConversation(userId: number, tenantId: number, userMode: string): Promise<Conversation>

// Send message and get AI response
sendMessage(conversationId: string, content: string, inputMode: string, userId: number): Promise<{
  userMessage: ConversationMessage;
  assistantMessage: ConversationMessage;
}>

// List conversations for user (ordered by updatedAt desc)
getConversations(userId: number, tenantId: number): Promise<Conversation[]>

// Get single conversation with all messages
getConversation(conversationId: string, userId: number): Promise<Conversation & { messages: ConversationMessage[] }>
```

### Title Generation
Conversation title is auto-set from the first user message content (truncated to 100 chars). If the message is longer, appended with "...".

---

## Frontend Store Integration

### Zustand Store Updates

```typescript
// sally-ai/store.ts additions:
pastConversations: ConversationSummary[]  // From backend
loadHistory: () => Promise<void>          // Fetches GET /conversations
restoreConversation: (id: string) => void // Loads messages from backend
clearSession: () => void                   // Now persists current to backend
```

### API Client

```typescript
// sally-ai/api.ts
createConversation(userMode: string): Promise<{ conversationId: string }>
sendMessage(conversationId: string, content: string, inputMode: string): Promise<SallyResponse>
getConversations(): Promise<ConversationSummary[]>
getConversation(conversationId: string): Promise<ConversationDetail>
```

---

## Current State

- ✅ Conversation and ConversationMessage Prisma models
- ✅ Backend SallyAiService with CRUD + message processing
- ✅ Backend SallyAiController with all endpoints
- ✅ Frontend API client for all conversation endpoints
- ✅ History display in empty state
- ✅ View-only mode for past conversations
- ✅ Auto-title generation from first user message
- ✅ Multi-tenant isolation (tenantId on conversations)
- ✅ Per-user conversations (userId filtering)
- 🔲 Conversation search/filtering
- 🔲 Conversation deletion/archival
- 🔲 Session expiry for stale conversations

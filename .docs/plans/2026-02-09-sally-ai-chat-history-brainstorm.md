# Sally AI Chat History — Brainstorm

**Date:** February 9, 2026
**Status:** Brainstorm — exploring approaches
**Context:** Sally AI Nerve Center has a working chat assistant with text/voice input, rich cards, suggestions, and a "start new conversation" inline action. Currently `clearSession()` destroys messages permanently. Users need a way to access previous conversations.

---

## The Question

How should chat history work in Sally AI, given that:
- SALLY is a **fleet operations assistant** (not a general-purpose chatbot)
- Conversations are **operational** — "check driver 14's HOS", "show me alerts"
- The panel is **380px wide** on desktop, full-width on mobile
- This is a **POC/demo** — no backend persistence yet
- Three user modes exist: prospect, dispatcher, driver

---

## Option A: Recent Sessions Stack (Lightweight)

**Concept:** Keep the last 5 sessions in a localStorage-persisted array. When user starts a new conversation, the old one gets pushed to a `pastSessions` stack. The empty state shows a "Recent" section below the orb.

**UX flow:**
1. User opens Sally → sees orb + "How can I help?" + recent sessions below
2. Recent sessions show as minimal cards: first user message as title, timestamp, message count
3. Tap a session → restores it as the active conversation
4. Max 5 sessions retained, oldest drops off automatically

**What it looks like:**
```
     [Nerve Orb]
   How can I help?

  ─── Recent ───────────
  "Check driver 14 HOS"        2m ago
  "Show me critical alerts"    1h ago
  "What's the fleet status"    3h ago
```

**Pros:**
- Dead simple — just an array in Zustand + persist middleware
- No new views or navigation needed — lives in the empty state
- Fits the 380px panel perfectly
- Feels like a natural extension of "start new conversation"
- No backend required

**Cons:**
- No search
- Limited to 5 sessions
- localStorage means per-device only
- Rich cards/action results may not serialize cleanly (Date objects, etc.)

**Implementation effort:** Small — ~2-3 hours
- Add `pastSessions` to store with persist middleware
- Modify `clearSession` to push current session to history
- Add `restoreSession` action
- Show recent list in empty state UI

---

## Option B: Sliding History Panel

**Concept:** A secondary panel that slides in from the left within the 380px space, showing a scrollable list of past conversations. Triggered by a clock/history icon in the header.

**UX flow:**
1. User taps history icon in header → conversation list slides in from left
2. List shows all sessions with preview, timestamp, mode badge
3. Tap a session → slides back to chat with that session restored
4. Swipe left on a session to delete it

**What it looks like:**
```
  ← History

  [dispatcher] Check driver 14     2m
  [dispatcher] Critical alerts     1h
  [prospect]   Demo request       2d
  [driver]     Route to Memphis   3d
```

**Pros:**
- Clean separation between chat and history
- Can show more sessions (scrollable)
- Mode badges add context
- Familiar pattern (Slack, iMessage)

**Cons:**
- More complex — needs panel state management, slide animation
- Two views in one panel can feel cramped at 380px
- History icon adds to header clutter
- Overbuilt for a POC

**Implementation effort:** Medium — ~4-5 hours

---

## Option C: Persistent Thread Sidebar (Desktop Only)

**Concept:** On wider screens (lg+), show a thin sidebar (180px) on the left edge of the Sally panel listing conversation threads. On mobile, collapse to a bottom sheet.

**UX flow:**
1. Desktop: panel becomes 560px (180px sidebar + 380px chat)
2. Sidebar shows thread list vertically
3. Mobile: swipe up from bottom or tap button for thread picker sheet

**Pros:**
- No context switching — see threads and chat simultaneously
- Power-user friendly

**Cons:**
- Significantly widens the panel on desktop (breaks push-content layout)
- Too complex for POC
- Mobile experience is completely different from desktop
- Sidebar within a sidebar feels nested

**Implementation effort:** Large — ~8-10 hours

---

## Option D: Command Palette Style (⌘K)

**Concept:** No visible history UI. Instead, typing in the input bar with a `/history` command or pressing ⌘K opens a command palette overlay showing recent sessions. Type to filter.

**UX flow:**
1. User types `/history` or presses ⌘K → palette appears
2. Shows recent sessions as searchable list
3. Arrow keys to navigate, Enter to select
4. Session restores, palette closes

**Pros:**
- Zero UI footprint when not in use
- Keyboard-first (matches S/Esc pattern)
- Searchable
- Feels futuristic/power-user

**Cons:**
- Not discoverable — users won't know it exists
- Prospect mode users definitely won't find it
- Requires teaching (tooltips, onboarding)
- Building a command palette is non-trivial

**Implementation effort:** Medium-large — ~5-7 hours

---

## Option E: Conversation Memory (No History View)

**Concept:** Don't show history at all. Instead, SALLY remembers context across sessions. When user starts a new conversation, SALLY references relevant past interactions automatically.

**Example:**
```
User: "Check driver 14"
Sally: "Last time you asked about driver 14 (2 hours ago),
        they had 4.2h HOS remaining. Here's the current status..."
```

**Pros:**
- Most "intelligent" feeling — SALLY has memory
- No UI complexity at all
- Aligns with the "nerve system" metaphor — the system remembers

**Cons:**
- Can't explicitly browse or restore old conversations
- Hard to implement with mock engine (needs real AI context)
- Might feel creepy if overdone
- Doesn't solve "I want to see what I asked earlier"

**Implementation effort:** Medium — but mostly in the response engine, not UI

---

## My Recommendation: Option A (Recent Sessions Stack)

**Why:**

1. **Right-sized for the product stage.** This is a POC. A 5-session localStorage stack is exactly enough to demonstrate the concept without overbuilding.

2. **Natural UX integration.** The empty state ("How can I help?") already exists and has space below the orb. Recent sessions fit perfectly there — no new views, panels, or navigation.

3. **Complements existing patterns.** The inline "Start new conversation" action creates sessions. History lets you get back to them. Simple loop.

4. **Smallest blast radius.** Only touches the store (add persist + pastSessions) and the empty state UI in SallyChat. No new components needed.

5. **Upgradeable.** When this becomes a real product with backend persistence, the `pastSessions` array trivially becomes an API call to `/api/v1/chat/sessions`. The UI pattern stays the same.

**Key design decisions for Option A:**
- Store last **5** sessions (not unlimited — this is localStorage)
- Each session stores: `id`, `messages`, `userMode`, `createdAt`, `preview` (first user message)
- Serialize dates as ISO strings for localStorage compatibility
- Show in empty state only (don't add header buttons or new panels)
- Tap to restore replaces current session (with confirmation if current has messages)
- Sessions older than 24 hours auto-expire (operational context goes stale)

---

## Questions for Discussion

1. **Should restoring a session be "resume" (continue chatting) or "view-only" (read-only transcript)?** Resume is simpler and more useful for ops context.

2. **Should history persist across browser sessions (localStorage) or just in-memory (lost on refresh)?** localStorage via Zustand persist middleware seems right.

3. **Should the 24-hour auto-expiry be a hard rule or configurable?** Hard rule for POC, configurable later.

4. **Should prospect mode even have history?** Prospects are typically one-and-done. Could skip history for prospect mode entirely.

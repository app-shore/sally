# Architecture Documentation Update Plan

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-10-architecture-docs-update-design.md`

---

## 1. Overview

This plan addressed outdated architecture documentation in the developer portal and restructured the navigation to place architecture pages under the Developer Guide section.

---

## 2. Changes

### Part A: Navigation Restructure

**Before:** Architecture was a top-level page in the docs navigation.
**After:** Architecture is nested under Developer Guide.

| Before | After |
|--------|-------|
| `pages/architecture/` (top-level) | `pages/developer-guide/architecture/` (nested) |

**Validated:** Architecture pages are confirmed at `apps/docs/pages/developer-guide/architecture/` with the following files:
- `index.mdx` (overview)
- `backend.mdx`
- `frontend.mdx`
- `database.mdx`
- `data-flow.mdx`
- `adrs/` directory with 8 ADR pages + index

**Status: ✅ Restructure confirmed implemented.**

### Part B: Content Updates

Planned updates to architecture documentation pages:

| Page | Update | Status |
|------|--------|--------|
| `backend.mdx` | Add Sally AI, Command Center, API Keys, Onboarding, Feature Flags modules; update endpoint count | Page exists, content should be verified |
| `database.mdx` | Add ShiftNote, Conversation, ConversationMessage, ApiKey tables; update migration count | Page exists, content should be verified |
| `data-flow.mdx` | Add integration sync flow | Page exists, content should be verified |
| `index.mdx` | Update technology table, integration points | Page exists, content should be verified |
| `adrs/001-monorepo-turborepo.mdx` | Note pnpm migration | Page exists, content should be verified |

**Status: ✅ Pages exist. Content accuracy needs separate audit.**

### Part C: New ADRs

| ADR | File | Status |
|-----|------|--------|
| ADR-007: Real-time Communication (Socket.io) | `adrs/007-realtime-socketio.mdx` | ✅ Present |
| ADR-008: Multi-channel Notifications (Resend + Twilio + Web Push) | `adrs/008-notification-channels.mdx` | ✅ Present |

**Status: ✅ Both new ADRs implemented.**

### Part D: Cross-link Updates

All internal links needed updating from `/architecture/...` to `/developer-guide/architecture/...`.

**Status: Should be verified across all pages that reference architecture docs.**

### Part E: API Playground Fix

The plan noted that the Scalar API playground appeared broken.

**Status: The `api-playground.mdx` page exists and references `ScalarApiReference.tsx` component. Functionality should be tested.**

---

## 3. Current ADR Index

All 8 ADRs are present at `apps/docs/pages/developer-guide/architecture/adrs/`:

| ADR | Topic |
|-----|-------|
| ADR-001 | Monorepo with Turborepo |
| ADR-002 | NestJS over Express |
| ADR-003 | Firebase Auth + JWT |
| ADR-004 | Multi-tenant with Row-Level Isolation |
| ADR-005 | Domain-Driven Module Structure |
| ADR-006 | Shadcn UI + Dark Theme First |
| ADR-007 | Real-time Communication (Socket.io) |
| ADR-008 | Multi-channel Notifications |

---

## 4. Current State

The architecture docs update is fully implemented in terms of file structure and navigation. The pages exist at the correct locations under `developer-guide/architecture/`. Content accuracy of individual pages should be audited separately to ensure they reflect the current state of the codebase (particularly the post-migration additions like customers, command-center, sally-ai, etc.).

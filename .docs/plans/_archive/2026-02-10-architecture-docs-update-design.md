# Architecture Documentation Update & Navigation Fix

**Date:** 2026-02-10
**Status:** In Progress
**Type:** Documentation Update + Navigation Restructure

## Problem Statement

1. Architecture pages in developer portal are outdated — missing modules, tables, and recent changes
2. Architecture section is a top-level page, not visible in Developer Guide sidebar
3. API Playground appears broken (separate fix)

## Plan

### Part A: Navigation Restructure
- Move `pages/architecture/` → `pages/developer-guide/architecture/`
- Remove architecture from root `_meta.ts`
- Add to `developer-guide/_meta.ts` after frontend, before common-tasks
- Update all internal cross-links

### Part B: Content Updates
- `backend.mdx` — Add Sally AI, Command Center, API Keys, Onboarding, Feature Flags modules; update endpoint count
- `database.mdx` — Add ShiftNote, Conversation, ConversationMessage, ApiKey tables; update migration count
- `data-flow.mdx` — Add integration sync flow
- `index.mdx` — Update technology table, integration points
- `adrs/001-monorepo-turborepo.mdx` — Note pnpm migration

### Part C: New ADRs
- ADR-007: Real-time Communication (Socket.io)
- ADR-008: Multi-channel Notifications (Resend + Twilio + Web Push)

### Part D: Cross-link Updates
- Update all `/architecture/...` → `/developer-guide/architecture/...` references

### Part E: API Playground Fix (Separate)
- Review Scalar configuration
- Fix broken playground rendering

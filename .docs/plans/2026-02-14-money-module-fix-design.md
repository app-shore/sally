# Money Module Fix — Design Document

**Date:** 2026-02-14
**Goal:** Fix all bugs, UX issues, and data contract mismatches in the Money Module (Billing + Pay) so it works end-to-end.

## Context

The Money Module (PR #25) was merged but has several issues:
- Missing database migration (fixed)
- Backend TypeScript errors from wrong field names (fixed)
- Frontend types use snake_case but backend returns camelCase (all data displays broken)
- Billing page asks for manual Load ID text input instead of a selector
- Pay page asks for manual Driver ID text input instead of a selector
- Pay page references `first_name`/`last_name` but Driver model has single `name` field
- Profitability service references wrong RoutePlan field

## Workstreams

### 1. Data Contract Alignment (camelCase)

All frontend types, API clients, and page components must use camelCase to match Prisma's output.

**Files:** `billing/types.ts`, `pay/types.ts`, `billing/api.ts`, `pay/api.ts`, all page components and dialogs.

### 2. Billing UX: Load Selector

Replace text input with searchable dropdown of delivered loads without invoices.

- Backend: Add `uninvoiced` filter to existing loads endpoint or add a dedicated endpoint
- Frontend: Combobox/Select showing load number + customer + rate

### 3. Pay UX: Driver Selector

Replace text input with dropdown of active drivers with pay structures.

- Use existing drivers API
- Default period to current week (Mon–Sun)
- Show driver name + pay type in selector

### 4. Driver Name Display Fix

Settlement table and detail dialog: `s.driver?.first_name` / `s.driver?.last_name` → `s.driver?.name`

### 5. Verify All 16 Plan Tasks

Ensure every task from the original implementation plan actually works. Fix field name issues in detail dialogs, verify QuickBooks wiring, verify profitability service.

## Out of Scope

- No new features beyond the original plan
- No schema changes
- No UI redesign

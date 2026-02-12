# Frontend Architecture Migration Design

**Status:** Implemented
**Last validated:** 2026-02-12
**Source plans:** `_archive/2026-02-05-frontend-architecture-review.md`, `_archive/2026-02-05-frontend-domain-architecture-migration.md`, `_archive/2026-02-05-frontend-refactor-complete.md`

---

## Overview

The SALLY frontend was migrated from a flat, ad-hoc structure to a hybrid domain-aligned architecture using Next.js 15 App Router with feature modules.

---

## Architecture Review Findings (Pre-Migration)

The review identified five critical issues, four cleanup opportunities, and three type safety gaps in the original codebase.

### Critical Issues Found

1. **Duplicate store directories** -- stores existed in both `src/stores/` and `src/store/` with overlapping state
2. **Legacy SessionStore wrapper** -- `sessionStore.ts` wrapped Zustand stores with browser `sessionStorage`, creating coupling and preventing SSR
3. **Mixed hook responsibilities** -- custom hooks mixed data fetching with UI state (e.g., `useRoutes` both fetched routes and managed selected state)
4. **Empty directories** -- leftover directories from earlier iterations (e.g., `src/components/dashboard/`, `src/lib/providers/`)
5. **Dead code** -- unused exports, unreferenced components

### Cleanup Opportunities

1. Consolidate two store directories into one (`src/stores/`)
2. Remove SessionStore wrapper and use Zustand persistence directly
3. Split hooks into data hooks (React Query) and state hooks (Zustand selectors)
4. Delete empty directories and dead code

### Type Safety Gaps

1. `Promise<any>` return types in API functions
2. Untyped event handler props passed to child components
3. Missing strict null checks in store selectors

---

## Migration Design: Hybrid Architecture

### Approach

A hybrid architecture that combines Next.js App Router conventions (`app/` for routing and pages) with domain-aligned feature modules (`features/` for business logic and components).

### Directory Structure

**Validated against code** -- the following structure is confirmed in `apps/web/src/`:

```
apps/web/src/
  app/           # Next.js App Router pages and layouts
  features/      # Domain-aligned business logic modules
    auth/        # Authentication (login, register, session)
    customer/    # Customer/shipper portal
    fleet/       # Fleet management (drivers, vehicles)
    integrations/# TMS and ELD integrations
    operations/  # Alerts, notifications, monitoring
    platform/    # Tenant settings, user management, feature flags
    routing/     # Route planning, optimization
  shared/        # Shared UI components and utilities
    components/  # Reusable components (common/, layout/, ui/)
  styles/        # Global styles (globals.css)
```

### Feature Module Convention

Each feature module follows a consistent internal structure:

```
features/<domain>/
  components/    # Domain-specific UI components
  hooks/         # Custom hooks (data fetching, state selection)
  store.ts       # Zustand store for domain state (if needed)
  types.ts       # Domain-specific TypeScript types
  <domain>-api.ts # API client functions for this domain
  index.ts       # Barrel exports
```

### Routing Convention

Pages in `app/` import from `features/` and `shared/`:
- `app/` defines routes, layouts, and page shells
- `features/` owns all business logic, API calls, and domain components
- `shared/` provides reusable UI primitives and layout components

---

## Refactor Execution (4 Phases)

### Phase 1: Store Consolidation

- Merged `src/store/` and `src/stores/` into single `src/stores/` directory
- 7 stores consolidated: `authStore`, `routeStore`, `alertStore`, `notificationStore`, `featureFlagsStore`, `commandCenterStore`, `preferencesStore`
- All imports updated across the codebase

### Phase 2: SessionStore Removal

- Removed `sessionStore.ts` wrapper entirely
- Updated approximately 50 files that imported from `sessionStore`
- Zustand stores now use their own persistence middleware where needed

### Phase 3: Hook Responsibility Split

- Snapshot and timeline logic moved from hooks into Zustand store actions
- Hooks now either:
  - Fetch data (React Query wrappers) -- e.g., `useRoutes()` returns `useQuery` result
  - Select state (Zustand selectors) -- e.g., `useSelectedRoute()` selects from store

### Phase 4: Type Safety

- Replaced all `Promise<any>` with typed return types in API functions
- Added strict typing to event handler props
- Enabled strict null checks in store selectors

**Total files changed:** ~55

---

## State Management Strategy

### Client State: Zustand

Each feature domain has its own scoped Zustand store:

- **authStore** -- user session, auth state, tokens
- **routeStore** -- selected route, plan state, timeline position
- **alertStore** -- alert filters, selected alert
- **notificationStore** -- unread count, notification list
- **featureFlagsStore** -- cached feature flag values with 5-min TTL
- **commandCenterStore** -- KPIs, active routes, filters
- **preferencesStore** -- UI preferences (sidebar collapsed, theme)

### Server State: React Query

All API data fetching uses React Query with standardized configuration:

- `staleTime`: 5 minutes (optimized from initial 1 minute)
- `gcTime`: 10 minutes
- `retry`: 1 (reduced from default 3)
- `refetchOnWindowFocus`: false

### Principle: No Prop Drilling

State flows from stores and queries, not through deep prop chains. Components subscribe to what they need directly.

---

## Validation Against Current Code

| Claim | Status |
|-------|--------|
| `features/` directory exists at `apps/web/src/features/` | Confirmed |
| 7 feature domains (auth, customer, fleet, integrations, operations, platform, routing) | Confirmed |
| `shared/` directory for reusable components | Confirmed |
| `app/` directory for Next.js routing | Confirmed |
| `styles/` directory for globals.css | Confirmed |
| SessionStore removed | Confirmed (no `sessionStore.ts` found) |
| Stores consolidated to single directory | Confirmed |

---

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.9 (strict mode)
- **State (client):** Zustand
- **State (server):** React Query (TanStack Query)
- **UI:** Shadcn/ui + Tailwind CSS
- **Theme:** next-themes
- **Monorepo:** Turborepo

---

## Key Design Decisions

1. **Hybrid over pure feature slices** -- Next.js App Router requires `app/` for routing; features hold the logic
2. **Zustand over Redux** -- simpler API, less boilerplate, feature-scoped stores
3. **React Query over custom fetching** -- standardized caching, deduplication, background refetching
4. **Barrel exports** -- each feature exposes a clean public API through `index.ts`
5. **No relative imports** -- all imports use `@/` absolute paths (enforced by convention)

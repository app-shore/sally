# Setup Hub / Onboarding - Design

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-02-onboarding-setup-hub-design.md`

---

## Overview

Priority-based onboarding checklist system ("Setup Hub") with three-tier visibility (banner + dashboard widget + dedicated page) and contextual blocking that prevents frustration while maintaining flexibility. Guides new tenants through critical setup steps required for route planning.

---

## Architecture

```
Frontend Layer
├── OnboardingBanner (top of all authenticated pages)
├── OnboardingWidget (admin dashboard)
├── SetupHubPage (/setup-hub)
├── OnboardingBlocker (route planning pages)
└── OnboardingStore (Zustand)
    |
    v
Backend API: GET /api/v1/onboarding/status (with Redis cache)
```

---

## API Endpoint (Validated)

### Onboarding Controller (`/api/v1/onboarding`)
File: `apps/backend/src/domains/platform/onboarding/onboarding.controller.ts`

| Method | Endpoint | Access | Status |
|--------|----------|--------|--------|
| GET | `/onboarding/status` | OWNER, ADMIN | ✅ Built |

The controller uses `JwtAuthGuard`, `TenantGuard`, `RolesGuard`, and caches responses for 30 seconds via `CACHE_MANAGER` (Redis).

---

## Checklist Items

### Critical Items (Block Route Planning)

| # | Item | Check | Action |
|---|------|-------|--------|
| 1 | Connect TMS Integration | Any TMS integration connected | `/settings/integrations` |
| 2 | Minimum 1 Active Driver | At least 1 driver with isActive=true AND status=ACTIVE | `/drivers` |
| 3 | Minimum 1 Vehicle | At least 1 vehicle record exists | `/settings/fleet` |

### Recommended Items (Soft Warning)

| # | Item | Check | Action |
|---|------|-------|--------|
| 4 | Invite Team Members | More than 1 user in tenant | `/users` |
| 5 | Connect ELD Integration | ELD integration connected | `/settings/integrations` |
| 6 | Minimum 3 Active Loads | At least 3 loads in active statuses | `/settings/fleet` |

### Optional Items (No Warning)

| # | Item | Check | Action |
|---|------|-------|--------|
| 7 | Connect Fuel Integration | Fuel integration connected | `/settings/integrations` |
| 8 | Configure Preferences | Preferences modified from defaults | `/settings/route-planning` |

---

## UI Components

### OnboardingBanner
- Shows when critical items incomplete
- Dismissible per session (sessionStorage)
- Never shows on /setup-hub itself
- Styled: `bg-amber-50 dark:bg-amber-950` with amber border

### OnboardingWidget
- Always visible on admin dashboard
- Expandable/collapsible based on critical completion
- Shows progress bar and checklist grouped by priority
- Click any item navigates to relevant page

### OnboardingBlocker
- Replaces route planning page content when critical items incomplete
- Lists missing critical items
- "Go to Setup Hub" CTA button
- Shows what features will be available after completion

### Setup Hub Page (/setup-hub)
- Full page with all 8 items organized by priority tier
- Each item shows: status (complete/incomplete), description, action link
- Progress bar at top: X/8 items complete
- Never disappears from navigation (becomes reference guide)

---

## State Management

### Zustand Store
- Fetches `/api/v1/onboarding/status` on app load (OWNER/ADMIN only)
- Computed properties: `criticalItemsComplete`, `recommendedItemsComplete`
- `refetchStatus()` called after mutations (e.g., driver activation)
- Banner dismissal state in sessionStorage

### Data Flow
1. User logs in -> layout initializes store
2. Store fetches onboarding status
3. Components subscribe to store
4. User completes task -> mutation onSuccess calls refetchStatus()
5. All components update automatically

---

## Backend Implementation

### OnboardingService (Validated)
File: `apps/backend/src/domains/platform/onboarding/onboarding.service.ts`

Queries multiple tables to compute status:
- Integration configs for TMS/ELD/Fuel connections
- Drivers count with active status
- Vehicles count
- Users count for tenant
- Loads count in active statuses
- FleetOperationsSettings for preference modification check

Response DTO:
File: `apps/backend/src/domains/platform/onboarding/dto/onboarding-status.dto.ts`

---

## Current State

- ✅ Backend `/onboarding/status` endpoint with Redis caching (30s TTL)
- ✅ OnboardingService queries all relevant tables
- ✅ RBAC restricted to OWNER and ADMIN roles
- ✅ Uses TenantGuard for multi-tenant isolation
- ✅ Frontend Setup Hub page
- ✅ OnboardingBanner component
- ✅ OnboardingWidget on dashboard
- ✅ OnboardingBlocker on route planning pages
- ✅ Zustand store with auto-refresh

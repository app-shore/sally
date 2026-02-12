# Frontend Architecture Review
**Date:** 2026-02-05
**Scope:** apps/web (Next.js 15 App Router)
**Lines of Code:** ~24,000
**Focus Areas:** State Management, File Organization, Type Safety

---

## Executive Summary

The frontend codebase follows **modern Next.js best practices** overall, with good use of:
- ✅ Next.js 15 App Router
- ✅ React Query for server state
- ✅ Zustand for client state
- ✅ Shadcn/ui component library
- ✅ TypeScript with strict mode
- ✅ Feature-based component organization

**Critical Issues Found:** 5
**Cleanup Opportunities:** 4
**Type Safety Gaps:** 3

---

## 🔴 Critical Issues

### 1. Duplicate Store Directories
**Impact:** Medium | **Effort:** Low

**Problem:**
- `src/stores/` contains only `auth-store.ts`
- `src/lib/store/` contains 7 other stores
- Inconsistent import paths across codebase

**Solution:**
✅ **AGREED:** Consolidate all stores to `src/stores/`

**Migration:**
```bash
# Move all stores from lib/store/ to stores/
mv apps/web/src/lib/store/* apps/web/src/stores/

# Update 50 import statements:
# from '@/lib/store/routePlanStore'
# to '@/stores/routePlanStore'
```

---

### 2. Legacy SessionStore Wrapper
**Impact:** High | **Effort:** Medium

**Problem:**
`sessionStore.ts` is a wrapper around `auth-store` for "backward compatibility"
- 50 files use sessionStore wrapper
- 7 files use auth-store directly
- Wrapper adds no value, creates confusion

**Solution:**
✅ **AGREED:** Remove sessionStore wrapper, update all imports to auth-store

**Migration:**
1. Update 50 files importing from sessionStore
2. Delete `src/lib/store/sessionStore.ts`
3. Verify auth flows still work

---

### 3. Mixed Responsibilities in React Query Hooks
**Impact:** Medium | **Effort:** Medium

**Problem:**
Hooks contain business logic that should live in store actions:

```typescript
// ❌ Current: Hook builds complex state
onSuccess: (plan) => {
  const store = useRoutePlanStore.getState();
  const inputSnapshot = {
    load_id: store.selectedLoad?.load_id,
    load_number: store.selectedLoad?.load_number,
    // ... 10 more fields
  };
  setCurrentPlan(planWithSnapshot);
}
```

**Solution:**
✅ **AGREED:** Move logic into store actions, hooks orchestrate only

**Refined Pattern:**
```typescript
// ✅ Better: Store action encapsulates logic
onSuccess: (plan) => {
  addPlanWithSnapshot(plan);
}

// In store:
addPlanWithSnapshot: (plan) => {
  const inputSnapshot = buildInputSnapshot(get());
  set({ currentPlan: { ...plan, inputSnapshot } });
}
```

**Files to refactor:**
- `src/lib/hooks/useRoutePlanning.ts`
- `src/stores/routePlanStore.ts`

---

## 🟡 Cleanup Opportunities

### 4. Empty Directories
**Impact:** Low | **Effort:** Trivial

Remove these empty directories:
- `src/components/forms/`
- `src/components/preferences/`

```bash
rm -rf apps/web/src/components/forms
rm -rf apps/web/src/components/preferences
```

---

### 5. Dead API Code
**Impact:** Low | **Effort:** Trivial

**Problem:**
`src/lib/api/session.ts` contains old session-based auth. Not imported anywhere.

**Solution:**
Delete the file:
```bash
rm apps/web/src/lib/api/session.ts
```

---

### 6. Misplaced Component File
**Impact:** Low | **Effort:** Low

**Problem:**
`src/components/route-planner/utils/segmentDetails.tsx` is a **component** (returns JSX), but lives in `utils/` directory.

**Solution:**
Move to shared components:
```bash
mv apps/web/src/components/route-planner/utils/segmentDetails.tsx \
   apps/web/src/components/route-planner/shared/segmentDetails.tsx
```

Keep `routeTimelineUtils.ts` in utils (pure functions).

---

### 7. Inconsistent API Client Usage
**Impact:** Low | **Effort:** Low

**Problem:**
Some API modules use the generic `apiClient`, others don't import it from `client.ts` at all.

**Example:**
```typescript
// routePlanning.ts - ✅ Good
import { apiClient } from './client';
export async function optimizeRoute(request: RoutePlanningRequest): Promise<RoutePlan> {
  return apiClient<RoutePlan>('/route-planning/optimize', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// session.ts - ❌ Bad (manual fetch, hardcoded URL)
const API_BASE_URL = 'http://localhost:8000';
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/session/login`, {
    method: 'POST',
    // ...
  });
}
```

**Solution:**
All API modules should use `apiClient` from `client.ts` for:
- Consistent auth header injection
- Automatic token refresh on 401
- Centralized error handling

---

## 🔍 Type Safety Gaps

### 8. Weak Return Types in API Layer
**Impact:** Medium | **Effort:** Low

**Problem:**
3 API functions return `Promise<any>`:

```typescript
// ❌ routePlanning.ts
export async function updateRoute(request: RouteUpdateRequest): Promise<any>
export async function getRouteStatus(driverId: string): Promise<any>

// ❌ preferences.ts
export async function resetToDefaults(scope: 'user' | 'operations' | 'driver'): Promise<any>
```

**Solution:**
Define proper return types in `src/lib/types/`:

```typescript
// types/routePlan.ts
export interface RouteUpdateResponse {
  plan_id: string;
  version: number;
  // ...
}

export interface RouteStatusResponse {
  driver_id: string;
  current_segment: RouteSegment;
  // ...
}

// routePlanning.ts
export async function updateRoute(request: RouteUpdateRequest): Promise<RouteUpdateResponse>
export async function getRouteStatus(driverId: string): Promise<RouteStatusResponse>
```

---

### 9. Missing User Type Consolidation
**Impact:** Low | **Effort:** Low

**Problem:**
User type defined in multiple places:
- `stores/auth-store.ts` (lines 12-21)
- `lib/store/sessionStore.ts` (lines 10-21) ← wrapper, will be deleted

After removing sessionStore, this is no longer an issue.

---

## ✅ What's Working Well

### State Management Pattern
- Clear separation: React Query (server state) + Zustand (client state)
- Good use of React Query caching and mutations
- Zustand persistence for auth state

### Component Organization
- Feature-based structure (`route-planner/`, `settings/`, `auth/`)
- Shadcn/ui components properly isolated in `ui/`
- Good separation of shared vs feature-specific components

### Type Safety
- TypeScript strict mode enabled
- Well-organized type definitions in `lib/types/`
- Good type coverage overall (except 3 `any` cases above)

### Next.js Best Practices
- Proper use of App Router
- Client components marked with "use client"
- Good metadata configuration in root layout
- API proxying configured in next.config.ts

---

## 📋 Recommended Refactor Plan

### Phase 1: Consolidation (Low Risk)
**Effort:** 2-3 hours

1. ✅ Move all stores to `src/stores/` directory
2. ✅ Remove empty directories (forms, preferences)
3. ✅ Delete dead code (session.ts API module)
4. ✅ Move segmentDetails.tsx to shared components

**Files Changed:** ~52 files (mostly import path updates)

---

### Phase 2: Remove SessionStore Wrapper (Medium Risk)
**Effort:** 3-4 hours

1. ✅ Update 50 files importing sessionStore → auth-store
2. ✅ Test all auth flows (login, logout, protected routes)
3. ✅ Delete sessionStore.ts

**Files Changed:** 51 files
**Testing Required:** Full auth flow regression

---

### Phase 3: Refactor Store Actions (Medium Risk)
**Effort:** 4-5 hours

1. ✅ Move snapshot building logic to store actions
2. ✅ Update useRoutePlanning hook to call store actions
3. ✅ Update useTriggerSimulation hook similarly

**Files Changed:** 2-3 files
**Testing Required:** Route planning flows

---

### Phase 4: Type Safety Improvements (Low Risk)
**Effort:** 2-3 hours

1. ✅ Define RouteUpdateResponse, RouteStatusResponse types
2. ✅ Define PreferencesResetResponse type
3. ✅ Update API function return types

**Files Changed:** 4 files (3 API + 1 types)

---

## Estimated Total Effort

**Total Time:** 11-15 hours
**Risk Level:** Low-Medium
**Impact:** High (cleaner architecture, better maintainability)

---

## Questions for Discussion

1. ✅ **RESOLVED:** Consolidate stores to `src/stores/`
2. ✅ **RESOLVED:** Remove sessionStore wrapper
3. ✅ **RESOLVED:** Keep React Query + Zustand pattern, move logic to actions
4. **Remaining:** Do you want to tackle all phases now, or prioritize specific ones?

---

## Next Steps

**Option A:** Execute all phases sequentially (full refactor, ~12-15 hours)
**Option B:** Execute Phase 1 only (quick cleanup, ~2-3 hours)
**Option C:** Execute Phases 1 + 2 (consolidation + remove wrapper, ~5-7 hours)

Which approach would you prefer?

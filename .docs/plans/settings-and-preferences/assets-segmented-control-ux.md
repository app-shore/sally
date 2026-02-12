# Assets Tab -- Segmented Control UX

> **Status:** Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-06-assets-segmented-control-ux.md`

---

## Overview

Refactored the Fleet Management Assets tab from nested tabs to a segmented control pattern (iOS/Linear/Notion style) for better visual hierarchy and mobile responsiveness.

---

## Change Summary

**Before:** Nested tabs -- Primary tabs (Drivers/Assets/Loads) with secondary tabs (Trucks/Trailers/Equipment) that looked identical to primary tabs. Confusing hierarchy.

**After:** Primary tabs (Drivers/Assets/Loads) with a segmented control inside the Assets card header (Trucks/Trailers/Equipment). Clear visual distinction between navigation and view switching.

---

## Implementation

**File:** `apps/web/src/app/dispatcher/fleet/page.tsx`

**Pattern:** Shadcn `Button` components with `variant="default"` (active) and `variant="ghost"` (inactive) inside a pill container (`rounded-lg border p-1 bg-muted`).

**State:** `useState<'trucks' | 'trailers' | 'equipment'>('trucks')`

**Responsive:** `flex-col sm:flex-row` -- stacks vertically on mobile, horizontal on desktop.

**Dark theme:** All colors use semantic tokens (`bg-muted`, `border-border`, button variants handle theme automatically).

---

## Current State

- Trucks tab: Shows trucks table (functional)
- Trailers tab: "Coming Soon" placeholder
- Equipment tab: "Coming Soon" placeholder

---

## Design Decisions

- Uses Shadcn Button components only (no custom components, no third-party libraries)
- No Tabs component for secondary navigation -- Buttons create visual differentiation from primary tabs
- Icons + text labels for clarity and accessibility
- Compact size (`size="sm"`) to fit in card header alongside "Add Truck" button

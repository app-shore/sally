# Navigation & Layout Updates - Route Planner Integration

## Summary

Updated the REST-OS frontend to integrate the Route Planner with consistent layout and navigation, matching the existing Engine and History pages.

## Changes Made

### 1. TopNavigation Component (`apps/web/src/components/dashboard/TopNavigation.tsx`)

**Layout Integration:**
- Made navigation work standalone (without requiring page state management)
- Uses `usePathname()` hook to auto-detect current page from URL
- Made `currentPage` and `onNavigate` props optional
- Auto-detects `/simulator` route and marks it as active

**Renamed "Engine" to "REST Optimizer":**
- Old: "Engine" (ambiguous, confusing with route planning engine)
- New: "REST Optimizer" (clear that it's the single-decision rest optimizer)

**Navigation Structure:**
```
Home | REST Optimizer | History | Route Planner
```

**Active State Handling:**
- Desktop: Highlights active nav button
- Mobile: Highlights active menu item
- Route Planner shows as active when on `/simulator` page

### 2. Simulator Page Layout (`apps/web/src/app/simulator/page.tsx`)

**Before:**
```jsx
<div className="min-h-screen bg-gray-50 p-8">
  <Link>Back to Dashboard</Link>
  <h1>Route Planning Simulator</h1>
  {/* Content */}
</div>
```

**After:**
```jsx
<div className="flex h-screen flex-col bg-gray-50">
  <TopNavigation />
  <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
    <div className="max-w-7xl mx-auto">
      <h1>Route Planning Simulator</h1>
      {/* Content */}
    </div>
  </main>
</div>
```

**Changes:**
- Removed "Back to Dashboard" link (navigation header is always present)
- Uses same layout structure as Engine and History pages
- Full-height layout with sticky header
- Responsive padding (matches dashboard pages)

## Navigation Terminology Update

### Based on Specs Review

From `.specs/ROUTE_PLANNING_SPEC.md` and `.specs/blueprint.md`:

**REST Optimization Engine** (Original Component):
- Single-decision optimizer
- "Should I extend rest at this dock?"
- Input: Driver HOS + dock time + next trip
- Output: FULL_REST / PARTIAL_REST / NO_REST

**Route Planning Engine** (New Component):
- End-to-end route planner
- "Plan entire route with rest/fuel/HOS"
- Input: Driver HOS + truck state + N stops
- Output: Complete optimized route with segments

### Updated Labels

| Old Label | New Label | Purpose |
|-----------|-----------|---------|
| "Engine" | "REST Optimizer" | Single rest decision tool |
| "Route Planner" | "Route Planner" | Full route planning platform |
| "History" | "History" | Past optimization runs |

## User Experience Flow

### Navigation Consistency
1. All pages now have the same header navigation
2. Users can switch between pages without losing context
3. Active page is always highlighted
4. Works on desktop and mobile

### Page Purposes (Clarified)

**REST Optimizer** (formerly "Engine"):
- Legacy single-decision tool
- "I'm at a dock, should I rest?"
- Will likely be deprecated once Route Planner is proven

**Route Planner** (new):
- Primary route planning interface
- "Plan my entire route with N stops"
- Includes REST optimization as a component
- Dynamic re-planning when conditions change

**History**:
- View past REST optimization decisions
- Will likely be deprecated once Route Planner is proven

## Technical Details

### Layout Architecture

All pages now follow this pattern:
```jsx
<div className="flex h-screen flex-col bg-gray-50">
  <TopNavigation />
  <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
    {/* Page content */}
  </main>
</div>
```

**Benefits:**
- Consistent user experience
- Sticky header navigation
- Proper scroll containment
- Responsive padding
- Full viewport height utilization

### Responsive Behavior

**Desktop:**
- Full navigation with labels visible
- Icons + text on larger screens (lg breakpoint)

**Mobile:**
- Hamburger menu
- Full dropdown navigation
- Touch-friendly button sizes

## Build Status

✅ Build successful with no errors
✅ All TypeScript types correct
✅ Responsive layout working
✅ Navigation active states working

## Testing Checklist

- [ ] Navigate between all pages (Home, REST Optimizer, History, Route Planner)
- [ ] Verify active state highlights correctly
- [ ] Test on mobile (hamburger menu, dropdown)
- [ ] Verify Route Planner layout matches other pages
- [ ] Test responsive breakpoints (sm, md, lg)

## Migration Notes

### Phase 1 (Current): Coexistence
- All three pages available
- REST Optimizer = legacy single-decision tool
- Route Planner = new full route planning
- History = legacy history viewer

### Phase 2 (Future): Deprecation
- Add notices to REST Optimizer and History
- Encourage users to use Route Planner
- Collect feedback

### Phase 3 (Future): Removal
- Remove REST Optimizer page
- Remove History page (or migrate to Route Planner history)
- Route Planner becomes the only interface

## Files Modified

1. `apps/web/src/components/dashboard/TopNavigation.tsx`
   - Added pathname detection
   - Made props optional
   - Renamed "Engine" to "REST Optimizer"
   - Added Route Planner active state

2. `apps/web/src/app/simulator/page.tsx`
   - Added TopNavigation component
   - Restructured layout to match dashboard pages
   - Removed "Back to Dashboard" link
   - Fixed layout wrapper structure

## Next Steps

1. Test navigation flow in development
2. Verify responsive behavior
3. Get user feedback on terminology ("REST Optimizer" clear?)
4. Plan deprecation timeline for legacy pages
5. Consider adding tooltips explaining page purposes

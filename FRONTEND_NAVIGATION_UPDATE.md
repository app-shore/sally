# Frontend Navigation Updates

## Summary

Added navigation link to the Route Planner Simulator in the main dashboard navigation.

## Changes Made

### 1. Updated TopNavigation Component (`apps/web/src/components/dashboard/TopNavigation.tsx`)

**Additions:**
- Imported `Route` icon from lucide-react
- Imported `Link` from next/link
- Added "Route Planner" button to desktop navigation (after History)
- Added "Route Planner" button to mobile navigation menu

**Features:**
- Desktop: Icon + text on larger screens (lg breakpoint)
- Mobile: Full text in mobile menu dropdown
- Maintains consistent styling with existing nav items
- Uses Next.js Link for client-side navigation

### 2. Enhanced Simulator Page (`apps/web/src/app/simulator/page.tsx`)

**Additions:**
- Added "Back to Dashboard" link at top of page
- Imported `ArrowLeft` icon from lucide-react
- Updated page description to clarify functionality
- Fixed TypeScript types for route update API calls
- Fixed unused variable warning

**Bug Fixes:**
- Corrected `RouteUpdateRequest` structure to match backend schema
- Removed `update_data` wrapper (fields are now top-level)
- Added `triggered_by` field (required by backend)
- Fixed key prop to use `sequence_order` instead of array index

## Navigation Flow

### Current Structure

```
REST-OS Dashboard (/)
├── Home (landing page)
├── Engine (existing REST optimization)
├── History (optimization history)
└── Route Planner (/simulator) ← NEW
    └── Back to Dashboard link
```

## User Experience

1. **From Dashboard**: Users can click "Route Planner" in the top navigation
2. **From Route Planner**: Users can click "Back to Dashboard" to return

## Technical Details

### Route Planner Features
- Generate route plans leveraging REST optimization engine logic
- Simulate real-world trigger events (dock delays, traffic, rest requests)
- Dynamic re-planning when conditions change
- HOS compliance monitoring
- Fuel stop optimization

### API Integration
- `POST /api/v1/route-planning/optimize` - Initial route planning
- `POST /api/v1/route-planning/update` - Dynamic route updates

## Future Considerations

As mentioned in your requirements:
> "Most likely once when we have this new simulator working we would get rid of this history and engine and use this simulator only"

### Migration Path
1. **Phase 1** (Current): All three pages coexist
   - Engine: Single-decision REST optimization
   - History: Past optimization runs
   - Route Planner: Full route planning with dynamic updates

2. **Phase 2** (Future): Route Planner becomes primary
   - Keep Engine/History for legacy users temporarily
   - Add deprecation notices

3. **Phase 3** (Future): Full migration
   - Remove Engine and History
   - Route Planner is the only interface
   - Archive historical data

## Testing

Build successful with no errors:
```bash
cd apps/web
npm run build
# ✓ Compiled successfully
```

## Next Steps

1. Test navigation flow in development
2. Verify route planner functionality end-to-end
3. Gather user feedback on new interface
4. Plan migration timeline from Engine/History to Route Planner

# Command Center - Implementation

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-07-command-center-implementation.md`

---

## Overview

Implementation of the dispatcher Command Center at `/dispatcher/overview`. Backend provides a single aggregated overview endpoint with mock data generators (swappable to real data), plus CRUD endpoints for shift notes. Frontend rewrites the overview page with React Query hooks and 30-second polling.

---

## Implementation Tasks

### Task 1: Backend DTOs and Types
- Created `command-center.types.ts` with ActiveRouteDto, DriverHOSChipDto, CommandCenterOverviewDto, ShiftNoteDto
- Created `create-shift-note.dto.ts` with class-validator (content min 1 / max 500 chars, optional isPinned boolean)

### Task 2: Mock Data Generators
- Created `command-center.mock.ts` (isolated file, easy to remove when real data available)
- Deterministic pseudo-random based on tenant + current 30-second window
- Functions: `generateMockActiveRoutes()`, `generateMockKPIs()`, `generateMockDriverHOS()`, `generateMockQuickActionCounts()`
- Uses realistic data: 10 driver names, 10 vehicle IDs, 15 US city stops

### Task 3: ShiftNote Prisma Migration
- Added ShiftNote model to schema with: noteId, content, isPinned, tenantId, userId, expiresAt (24h)
- Relations to Tenant and User models

### Task 4: CommandCenterService
- `getOverview(tenantId)` - Aggregates mock route/HOS data + real alert counts from database
- `getShiftNotes(tenantId)` - Queries non-expired notes, ordered by pinned first then newest
- `createShiftNote(tenantId, userId, dto)` - Creates note with 24h expiry
- `deleteShiftNote(noteId, tenantId)` - Soft validates tenant ownership before delete
- Redis caching on overview endpoint (30s TTL)

### Task 5: CommandCenterController
- `GET /command-center/overview` - Returns aggregated CommandCenterOverviewDto
- `GET /command-center/shift-notes` - Returns ShiftNoteDto[]
- `POST /command-center/shift-notes` - Creates note, returns ShiftNoteDto
- `DELETE /command-center/shift-notes/:noteId` - Deletes note

### Task 6: Frontend API Layer
- React Query hooks: `useCommandCenterOverview()` (30s polling), `useShiftNotes()`, `useCreateShiftNote()`, `useDeleteShiftNote()`
- Types matching backend DTOs

### Task 7: Frontend KPI Strip
- 5 stat cards in horizontal row using Shadcn Card component
- Color-coded On-Time % (green >=95%, yellow 85-94%, red <85%)
- HOS violations count (green if 0, red otherwise)

### Task 8: Active Routes Feed
- Route cards with progress bars, ETA badges, HOS indicators
- Filter tabs: All, At Risk, On Time, Completed
- Sorted by urgency score
- Responsive: cards stack vertically on mobile

### Task 9: Right Panel
- Alert feed using existing CompactAlertCard + real alerts API
- Quick action cards with count badges
- Shift notes with add/delete/pin functionality

### Task 10: HOS Driver Strip
- Horizontal scrollable strip with driver chips
- Color-coded drive hours bars
- Sorted ascending by hours remaining
- Summary label with approaching-limit count

---

## File Structure (Validated)

### Backend

```
apps/backend/src/domains/operations/command-center/
├── command-center.controller.ts    # 4 endpoints
├── command-center.service.ts       # Business logic + mock aggregation
├── command-center.service.spec.ts  # Unit tests
├── command-center.module.ts        # Module with Redis cache import
├── command-center.types.ts         # All TypeScript interfaces
└── dto/
    └── create-shift-note.dto.ts    # Validated DTO
```

### Frontend

```
apps/web/src/features/operations/command-center/
├── api.ts                          # API client functions
├── hooks.ts                        # React Query hooks with polling
├── types.ts                        # Frontend type definitions
└── components/
    ├── kpi-strip.tsx               # 5 stat cards
    ├── route-card.tsx              # Individual route display
    ├── routes-feed.tsx             # Filtered route list
    ├── alert-feed.tsx              # Top 5 alerts
    ├── quick-actions.tsx           # 3 action cards
    ├── shift-notes.tsx             # Notes CRUD UI
    └── hos-driver-strip.tsx        # Driver HOS chips
```

---

## Current State

- ✅ All backend endpoints implemented with mock data
- ✅ ShiftNote Prisma model and CRUD
- ✅ Redis caching on overview (30s)
- ✅ Unit tests for service
- ✅ Frontend with all 4 sections (KPIs, routes, right panel, HOS strip)
- ✅ 30-second polling via React Query
- ✅ Filter tabs on routes feed
- ✅ Responsive design (tested at 375px, 768px, 1440px)
- ✅ Dark theme support
- ✅ Shift notes with 24h auto-expiry and pinning
- 🔲 Real data integration (swap mock generators for database queries when route engine is live)

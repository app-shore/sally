# Load Status System

**Last Updated:** January 30, 2026
**Status:** Implemented

---

## Overview

The load management system uses **6 distinct status values** to track a load's lifecycle from creation through delivery or cancellation.

---

## Status Values

### 1. `pending` ⏳
- **Meaning:** Load created but not yet planned
- **UI Badge:** Gray outline
- **Icon:** ⏳ (Hourglass)
- **Transitions to:** `planned` (when route is generated)

### 2. `planned` 📋
- **Meaning:** Route has been planned but driver has not started
- **UI Badge:** Light gray (secondary)
- **Icon:** 📋 (Clipboard)
- **Transitions to:** `active` (when driver begins work)

### 3. `active` 🔄
- **Meaning:** Load is actively being worked on (driver may be at dock, loading, unloading, or stationary)
- **UI Badge:** Light gray (secondary)
- **Icon:** 🔄 (Counterclockwise arrows)
- **Transitions to:** `in_transit` (when driver begins moving)
- **Key Distinction:** Driver is working on the load but NOT moving between locations

### 4. `in_transit` 🚚
- **Meaning:** Driver is actively moving on the road between locations
- **UI Badge:** Blue (default)
- **Icon:** 🚚 (Truck)
- **Transitions to:** `active` (when arriving at stop), `completed` (when final delivery done)
- **Key Distinction:** Driver is specifically MOVING - this is the only "blue" status to highlight movement

### 5. `completed` ✅
- **Meaning:** Load has been delivered successfully
- **UI Badge:** Light gray (secondary)
- **Icon:** ✅ (Check mark)
- **Terminal state:** No further transitions

### 6. `cancelled` ❌
- **Meaning:** Load was cancelled before completion
- **UI Badge:** Red (destructive)
- **Icon:** ❌ (X mark)
- **Terminal state:** No further transitions

---

## Status Flow

```
pending ⏳
   ↓
planned 📋
   ↓
active 🔄 ⟷ in_transit 🚚  (bidirectional - driver moves between dock and road)
   ↓
completed ✅

(Any non-terminal state can transition to cancelled ❌)
```

---

## Visual Design

### Badge Variants

| Status | Variant | Color | Purpose |
|--------|---------|-------|---------|
| `pending` | outline | Gray border, transparent bg | Minimal emphasis - just created |
| `planned` | secondary | Light gray | Low emphasis - ready but not started |
| `active` | secondary | Light gray | Low emphasis - working but not moving |
| `in_transit` | **default** | **Blue** | **High emphasis - actively moving** |
| `completed` | secondary | Light gray | Low emphasis - done |
| `cancelled` | destructive | Red | High emphasis - problem status |

### Design Rationale

**Why `in_transit` is blue (default variant):**
- It's the ONLY status where the driver is actively moving
- Requires immediate attention for real-time monitoring
- Most dynamic state in the system
- Dispatcher needs to visually identify moving loads quickly

**Why `active` is NOT blue:**
- Driver could be stationary at dock for hours (loading/unloading)
- Less critical for real-time monitoring than actual movement
- Prevents "everything is blue" fatigue

---

## Implementation

### Frontend

**File:** `apps/web/src/app/settings/fleet/page.tsx`

```typescript
function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: "⏳",       // Hourglass - waiting
    planned: "📋",      // Clipboard - planned
    active: "🔄",       // Counterclockwise - active work
    in_transit: "🚚",   // Truck - moving
    completed: "✅",    // Check - done
    cancelled: "❌",    // X - cancelled
  };
  return icons[status] || "📦";
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",      // Gray - Not yet planned
    planned: "secondary",    // Light gray - Planned but not started
    active: "secondary",     // Light gray - At dock/loading/unloading
    in_transit: "default",   // Blue - Actively moving on road
    completed: "secondary",  // Light gray - Delivered
    cancelled: "destructive", // Red - Cancelled
  };
  return variants[status] || "outline";
}
```

**Usage:**
```tsx
<Badge variant={getStatusVariant(load.status)} className="gap-1">
  {getStatusIcon(load.status)}
  {load.status.replace('_', ' ')}
</Badge>
```

### Backend

**File:** `apps/backend/prisma/schema.prisma`

```prisma
model Load {
  // ...
  status         String       @db.VarChar(50)  // pending, planned, active, in_transit, completed, cancelled
  // ...
}
```

No enum enforcement - allows flexibility for future status additions.

---

## Future Enhancements

### Potential Additional Statuses

1. **`delayed`** - Load is behind schedule but still in progress
   - Badge: Yellow/warning variant
   - Icon: ⚠️

2. **`on_hold`** - Load temporarily paused (customer request, weather, etc.)
   - Badge: Orange/warning variant
   - Icon: ⏸️

3. **`partially_delivered`** - Multi-stop load with some deliveries complete
   - Badge: Light blue
   - Icon: 📦✓

### Status Transitions Tracking

Consider adding:
- `status_changed_at` timestamp
- `status_history` JSON field for audit trail
- `status_reason` for cancelled/delayed loads

---

## Testing

### Seed Data Coverage

Current seed data (`apps/backend/prisma/seed.ts`) includes loads with:
- ✅ `pending` status (LOAD-001, LOAD-002, LOAD-003)
- ❌ `planned` status (none yet)
- ❌ `active` status (none yet)
- ❌ `in_transit` status (none yet)
- ❌ `completed` status (none yet)
- ❌ `cancelled` status (none yet)

**Recommendation:** Add at least one load in each status for UI testing.

---

## Questions & Answers

**Q: Why do `active` and `in_transit` both exist?**
A: They represent fundamentally different driver activities:
- `active` = Driver is working on the load (loading, unloading, resting at dock)
- `in_transit` = Driver is physically moving between locations

This distinction is critical for:
- Dispatcher monitoring (need to know if driver is moving vs stationary)
- HOS compliance (driving time vs on-duty not driving)
- ETA calculations (only `in_transit` affects ETA)
- Route planning triggers (movement triggers different updates than stationary)

**Q: Can a load skip from `pending` directly to `in_transit`?**
A: Not recommended. The proper flow is `pending` → `planned` → `active` → `in_transit`. However, the system doesn't enforce this with database constraints to allow flexibility.

**Q: What happens if driver goes off-duty while `in_transit`?**
A: Load status should transition to `active` when driver stops moving (even for rest break). When driver resumes after break, status returns to `in_transit`.

---

## Related Documentation

- `.specs/features/07-fleet-management/IMPLEMENTATION_STATUS.md` - Fleet management feature status
- `.specs/features/07-fleet-management/INTEGRATION_ARCHITECTURE.md` - Integration design
- `.specs/ROUTE_PLANNING_SPEC.md` - Route planning system (which triggers status changes)


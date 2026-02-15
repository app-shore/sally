# Vehicle Edit/Action UX with TMS Split Ownership

**Date:** 2026-02-13
**Status:** Approved
**Scope:** Vehicle edit form, table actions, backend guard, TMS sync behavior

## Problem

TMS-synced vehicles are completely locked — edit and delete buttons are disabled with lock icons. Dispatchers cannot change operational fields (status, equipment type, fuel specs) even though these fields are not managed by the TMS. This blocks day-to-day fleet operations.

## Decision: Split Ownership Model

### TMS-owned fields (read-only when synced)

| Field | Reason |
|-------|--------|
| Unit Number | TMS identifier |
| VIN | Legal identity |
| Make | Vehicle identity |
| Model | Vehicle identity |
| Year | Vehicle identity |
| License Plate | Registration |
| License Plate State | Registration |

### Dispatcher-owned fields (always editable)

| Field | Reason |
|-------|--------|
| Status | Operational — dispatcher decides AVAILABLE/IN_SHOP/OUT_OF_SERVICE |
| Equipment Type | May differ from TMS classification |
| Fuel Capacity | Operational spec for route planning |
| MPG | Operational spec for route planning |
| Has Sleeper Berth | Operational for HOS planning |
| GVW | Operational spec |

### Sync conflict resolution

- **Local wins for operational fields** — TMS sync only updates identity fields (VIN, make, model, year, plate)
- This aligns with existing `tms-sync.service.ts` which already only upserts identity fields
- TMS sync never touches status, equipment type, fuel capacity, MPG, sleeper berth, or GVW

## Backend Changes

### Update endpoint (PUT /vehicles/:vehicle_id)

- **Remove** the blanket `ExternalSourceGuard` from the update endpoint
- **Add** field-level validation in the service: strip TMS-owned fields from the update payload when `externalSource` is set
- Backend enforces split ownership regardless of frontend behavior

### Delete endpoint (DELETE /vehicles/:vehicle_id)

- **Keep** the `ExternalSourceGuard` — TMS-synced vehicles cannot be deleted
- Deletion only possible by disconnecting TMS integration or removing from TMS system

## Frontend Changes

### Edit Form (VehicleForm component)

When editing a TMS-synced vehicle:

1. **Dialog title**: "Edit Truck" with info badge showing "Synced from [TMS Name]"
2. **TMS-owned fields**: shown as disabled inputs with lock icon and muted styling
3. **Dispatcher-owned fields**: fully editable as normal
4. **Helper text** under disabled fields: "These fields are managed by your TMS integration"
5. **More Details** section auto-expands if TMS fields are populated (existing behavior)

### Table Actions

Replace inline edit/delete buttons with dropdown menu (consistent with Drivers tab):

**TMS-synced vehicles:**
- "Edit" — opens form with split ownership
- Disabled "Read-only from [TMS]" item explaining delete is blocked

**Manual vehicles:**
- "Edit" — full edit
- "Delete" — with confirmation dialog

### TMS Alert Banner

Update text from:
> "Some trucks are synced from your TMS. Synced trucks are read-only."

To:
> "Some trucks are synced from your TMS. Vehicle details are managed by your TMS — operational fields can be edited locally."

## Files to Modify

1. `apps/backend/src/domains/fleet/vehicles/controllers/vehicles.controller.ts` — remove guard from update
2. `apps/backend/src/domains/fleet/vehicles/services/vehicles.service.ts` — add field-level TMS filtering
3. `apps/web/src/app/dispatcher/fleet/page.tsx` — form UX, table actions, banner text

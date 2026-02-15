# Customer / Shipper Portal - Implementation Reference

**Status:** Implemented
**Domain:** Fleet Management > Customer Portal
**Last Validated Against Code:** 2026-02-12
**Source Plans:** `_archive/2026-02-11-customer-shipper-portal-implementation.md`

---

## 1. Implementation Summary

The original plan outlined 9 implementation tasks. Here is the status of each:

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | CUSTOMER role in UserRole enum | Implemented | In Prisma schema |
| 2 | Public tracking endpoint (GET /tracking/:token) | Implemented | tracking.controller.ts with @Public |
| 3 | Public tracking page (/track/[token]) | Implemented | Full page with timeline, status, POD placeholder |
| 4 | Customer dashboard (/customer/dashboard) | Implemented | Active/history tabs with load cards |
| 5 | Customer backend endpoints (customer/loads/*) | Implemented | List, detail, request - all customer-scoped |
| 6 | Load request form (/customer/request-load) | Implemented | Full form with pickup/delivery/details |
| 7 | Customer invitation flow | Implemented | inviteContact creates UserInvitation |
| 8 | Auto-generate tracking token on status=active | Implemented | In updateStatus method |
| 9 | Customer management UI for dispatchers | Implemented | Tab on Loads page with create + invite |

---

## 2. Backend Implementation

### Customer Loads Controller

**File:** `apps/backend/src/domains/fleet/loads/controllers/customer-loads.controller.ts`

```typescript
@Controller('customer/loads')
export class CustomerLoadsController extends BaseTenantController {
  // All endpoints:
  // 1. Check user.customerId exists (throw ForbiddenException if not)
  // 2. Use user.customerDbId for data scoping
  // 3. Require CUSTOMER role
}
```

**GET /customer/loads (getMyLoads):**
- Calls `loadsService.findByCustomerId(user.customerDbId, user.tenantDbId)`
- Returns: `{ load_id, load_number, status, customer_name, estimated_delivery, origin_city, origin_state, destination_city, destination_state, tracking_token, created_at }[]`
- Estimated delivery computed from active RoutePlan via RoutePlanLoad junction

**GET /customer/loads/:load_id (getLoad):**
- Calls `loadsService.findOneForCustomer(loadId, user.customerDbId)`
- Validates customer ownership (load.customerId must match)
- Returns full load with stops

**POST /customer/loads/request (requestLoad):**
- Calls `loadsService.createFromCustomerRequest({ ...body, tenant_id, customer_id, customer_name })`
- Backend generates load number: `REQ-{timestamp-base36-uppercase}`
- Creates load with `status: 'draft'`, `intake_source: 'portal'`
- `intake_metadata: { requested_by: 'customer_portal' }`
- Creates two stops (pickup + delivery) inline

### Tracking Controller

**File:** `apps/backend/src/domains/fleet/loads/controllers/tracking.controller.ts`

```typescript
@Controller('tracking')
export class TrackingController {
  @Get(':token')
  @Public()  // No authentication required
  async getTrackingInfo(@Param('token') token: string) {
    return this.loadsService.getPublicTracking(token);
  }
}
```

### LoadsService - Customer Methods

**`findByCustomerId(customerId, tenantId)`:**
1. Queries loads where `customerId` matches and `isActive: true`
2. Includes stops with stop details
3. Includes `routePlanLoads` with plan's `estimatedArrival` and `isActive`
4. Extracts first pickup stop for origin, last delivery stop for destination
5. Finds active plan for estimated delivery
6. Returns customer-safe response (no driver/vehicle/route details)

**`findOneForCustomer(loadId, customerId)`:**
1. Queries load by `loadId` AND `customerId` (ownership validation)
2. Throws `NotFoundException` if not found (implicitly denies access to other customers' loads)
3. Returns formatted load response

**`createFromCustomerRequest(data)`:**
1. Generates load number: `REQ-{timestamp}`
2. Delegates to `this.create()` with:
   - `status: 'draft'`
   - `intake_source: 'portal'`
   - `intake_metadata: { requested_by: 'customer_portal' }`
   - Two inline stops from pickup/delivery data

**`getPublicTracking(token)`:**
1. Queries load by `trackingToken`
2. Includes: stops with stop details, tenant (for carrier name), routePlanLoads
3. Throws `NotFoundException` if token invalid
4. Builds tracking timeline via `buildTrackingTimeline()`
5. Returns shipper-safe data:
   - `load_number`, `status`, `customer_name`, `carrier_name`
   - `equipment_type`, `weight_lbs`, `estimated_delivery`
   - `timeline[]`, `stops[]` (city/state only, no addresses)

### Customers Service

**File:** `apps/backend/src/domains/fleet/customers/services/customers.service.ts`

**`inviteContact(customerId)`:**
1. Finds customer by ID
2. Creates `UserInvitation` with:
   - `email: customer.contactEmail`
   - `role: UserRole.CUSTOMER`
   - `customerId: customer.id`
   - `token: randomBytes(32).toString('hex')`
   - `expiresAt: 7 days from now`
   - `tenantId: customer.tenantId`
3. Returns invitation details

**`findAll(tenantId)`:**
- Returns customers with derived `portal_access_status` (Active/Invited/No Access)
- Joins on User and UserInvitation tables to compute status

---

## 3. Frontend Implementation

### Customer Dashboard

**File:** `apps/web/src/app/customer/dashboard/page.tsx`

**Data flow:**
```
useEffect -> customerApi.getMyLoads() -> setLoads(data)
                                           |
                     +---------------------+
                     |                     |
              activeLoads              historicalLoads
         (non-completed/cancelled)    (status=completed)
```

**CustomerLoadCard component:**
- Displays: load_number, origin -> destination, status label, ETA
- Clickable: navigates to `/track/{tracking_token}` if token exists
- Keyboard accessible: Enter/Space triggers navigation

**Status label mapping:**
```typescript
const statusLabels = {
  draft: 'Draft',
  pending: 'Pending',
  planned: 'Planned',
  active: 'In Transit',
  in_transit: 'In Transit',
  completed: 'Delivered',
  cancelled: 'Cancelled',
};
```

### Load Request Form

**File:** `apps/web/src/app/customer/request-load/page.tsx`

**Form structure (3 Card sections):**
1. **Pickup:** Address, City, State, Preferred Date
2. **Delivery:** Address, City, State, Preferred Date
3. **Shipment Details:** Weight, Equipment (Select), Commodity (Select), Notes (Textarea)

**Equipment options:** Dry Van, Reefer, Flatbed, Step Deck
**Commodity options:** General, Hazmat, Refrigerated, Fragile

**On submit:**
```typescript
await customerApi.requestLoad({
  pickup_address, pickup_city, pickup_state, pickup_date,
  delivery_address, delivery_city, delivery_state, delivery_date,
  weight_lbs, equipment_type, commodity_type, notes
});
router.push('/customer/dashboard');
```

### Public Tracking Page

**File:** `apps/web/src/app/track/[token]/page.tsx`

**No auth dependency.** Uses direct `fetch()` to API, not the auth-aware API client.

**Components:**
- `StatusDisplay` - Large status text (maps status codes to labels)
- `TimelineEvent` - Individual timeline dot + event name + timestamp + detail
- `TrackingLoadingSkeleton` - Loading state
- `TrackingNotFound` - Error/invalid token state

**Auto-refresh:** `setInterval(fetchTracking, 60000)` with cleanup on unmount.

**TrackingData interface:**
```typescript
interface TrackingData {
  load_number: string;
  status: string;
  customer_name: string;
  carrier_name: string;
  equipment_type?: string;
  weight_lbs: number;
  estimated_delivery?: string;
  timeline: Array<{
    event: string;
    status: 'completed' | 'current' | 'upcoming';
    timestamp?: string;
    detail?: string;
  }>;
  stops: Array<{
    sequence_order: number;
    action_type: string;
    city?: string;
    state?: string;
  }>;
}
```

---

## 4. Customer Management (Dispatcher Side)

### Embedded in Loads Page

The customer management UI is a tab on the dispatcher's Loads page (`/dispatcher/loads`):

**Customer tab features:**
- `CustomerList` component showing all customers with portal access status
- "Add Customer" button -> Dialog with fields: Company Name, Contact Name, Email, Phone
- Validation: company name required, email format check, phone format check
- "Invite" button per customer -> `InviteCustomerDialog`

### InviteCustomerDialog

**File:** `apps/web/src/features/fleet/customers/components/invite-customer-dialog.tsx`

Takes a `Customer` prop and sends invitation via `POST /customers/:id/invite`.

---

## 5. File Reference

| File | Purpose |
|---|---|
| `apps/backend/src/domains/fleet/loads/controllers/customer-loads.controller.ts` | Customer-scoped load endpoints |
| `apps/backend/src/domains/fleet/loads/controllers/tracking.controller.ts` | Public tracking endpoint |
| `apps/backend/src/domains/fleet/loads/services/loads.service.ts` | Customer methods + tracking logic |
| `apps/backend/src/domains/fleet/customers/controllers/customers.controller.ts` | Customer CRUD + invite |
| `apps/backend/src/domains/fleet/customers/services/customers.service.ts` | Customer business logic |
| `apps/web/src/app/customer/dashboard/page.tsx` | Customer dashboard page |
| `apps/web/src/app/customer/request-load/page.tsx` | Load request form page |
| `apps/web/src/app/track/[token]/page.tsx` | Public tracking page |
| `apps/web/src/features/customer/api.ts` | Customer portal API client |
| `apps/web/src/features/customer/types.ts` | Customer portal TypeScript types |
| `apps/web/src/features/fleet/customers/components/customer-list.tsx` | Customer list (dispatcher view) |
| `apps/web/src/features/fleet/customers/components/invite-customer-dialog.tsx` | Customer invite dialog |
| `apps/web/src/features/fleet/customers/api.ts` | Customer management API client |
| `apps/web/src/features/fleet/customers/types.ts` | Customer management types |

---

## 6. What Is Not Built

1. **ProofOfDelivery table and upload flow** - The tracking page shows a POD section placeholder ("Available after delivery" / "Documents available for download") but no actual POD model or file upload exists.
2. **Email notifications** - No email is sent when:
   - Load status changes (customer should be notified)
   - Customer invitation is created (token link should be emailed)
   - Load request is submitted (dispatcher should be notified)
3. **Notification preferences** - The `Customer.notificationPrefs` JSON field exists in schema but is not used anywhere in the application.
4. **Document download on tracking page** - The POD section mentions downloads but no download functionality exists.
5. **Customer portal layout/nav** - Customer pages exist but there is no dedicated customer navigation shell (sidebar, header). The pages render standalone.

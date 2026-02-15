# Customer / Shipper Portal - Design Specification

**Status:** Implemented
**Domain:** Fleet Management > Customer Portal
**Last Validated Against Code:** 2026-02-12
**Source Plans:** `_archive/2026-02-11-customer-shipper-portal-.md`

---

## Current State

| Capability | Status |
|---|---|
| CUSTOMER role in UserRole enum | Implemented |
| Customer entity with CRUD endpoints | Implemented |
| Customer invitation flow (inviteContact) | Implemented |
| Customer portal: dashboard with active/history tabs | Implemented |
| Customer portal: load request form | Implemented |
| Public tracking page (no auth, token-based) | Implemented |
| Public tracking API endpoint | Implemented |
| Tracking timeline with status events | Implemented |
| Customer-scoped load listing (backend) | Implemented |
| Customer-scoped load detail (backend, validates ownership) | Implemented |
| Customer load request creates draft for dispatcher | Implemented |
| Auto-generate tracking token on status=active | Implemented |
| Manual tracking token generation endpoint | Implemented |
| Customer management tab on Loads page | Implemented |
| Customer create dialog with validation | Implemented |
| InviteCustomerDialog | Implemented |
| Proof of Delivery (POD) table | Not Built (placeholder in UI) |
| Email notifications on status changes | Not Built |
| Estimated delivery from route plan | Implemented (computed from RoutePlanLoad) |

---

## 1. Purpose

The Customer/Shipper Portal gives freight customers (shippers) limited visibility into their shipments without exposing internal dispatch operations. Customers can:

1. View their active and historical shipments
2. Submit load requests (creates drafts for dispatcher review)
3. Track shipments via public tracking links

The design enforces strict visibility boundaries - customers see only shipper-relevant data, never internal driver details, pricing, or route optimization information.

---

## 2. User Roles & Access

### CUSTOMER Role (Validated in Prisma Schema)

```prisma
enum UserRole {
  SUPER_ADMIN
  OWNER
  ADMIN
  DISPATCHER
  DRIVER
  CUSTOMER     // <-- Shipper portal access
}
```

### Visibility Rules

**What customers CAN see:**
- Load number and status
- Origin/destination city and state
- Equipment type
- Estimated delivery date (from active route plan)
- Tracking timeline events
- Carrier company name
- Load weight

**What customers CANNOT see:**
- Driver name, phone, or personal details
- Vehicle details
- Route plan details (waypoints, rest stops, fuel stops)
- Internal notes or dispatch comments
- Pricing or rate information
- Other customers' loads

---

## 3. Data Model

### Customer Model (Validated Against Schema)

```prisma
model Customer {
  id                  Int      @id @default(autoincrement())
  customerId          String   @unique
  companyName         String
  contactName         String   @default("")
  contactEmail        String   @default("")
  contactPhone        String?
  billingEmail        String?
  address             String?
  city                String?
  state               String?
  notificationPrefs   Json?
  isActive            Boolean  @default(true)
  tenantId            Int

  // Relationships
  loads       Load[]
  users       User[]
  invitations UserInvitation[]
}
```

### Load-Customer Relationship

- `Load.customerId` is an optional FK to `Customer.id`
- `Load.customerName` is a denormalized string field (for display without joins)
- Customer-scoped queries filter by `customerId` on the Load table

### User-Customer Relationship

- `User.customerId` is an optional FK to `Customer.id`
- When a customer invitation is accepted, the created User gets `customerId` set
- `user.customerDbId` is used in controller to scope data access

---

## 4. Customer Portal Pages

### Dashboard: `/customer/dashboard`

**File:** `apps/web/src/app/customer/dashboard/page.tsx`

Shows:
- "My Shipments" header with "+ Request a Load" button
- Tabs: Active (non-completed, non-cancelled) | History (completed)
- Each shipment is a clickable card showing:
  - Load number
  - Origin city/state -> Destination city/state
  - Status (human-readable label)
  - Estimated delivery date (from route plan)
- Clicking a card with a tracking token navigates to `/track/{token}`

**Data source:** Calls `customerApi.getMyLoads()` which hits `GET /customer/loads`

### Request Load: `/customer/request-load`

**File:** `apps/web/src/app/customer/request-load/page.tsx`

Form sections:
1. **Pickup:** Address, City, State, Preferred Date
2. **Delivery:** Address, City, State, Preferred Date
3. **Shipment Details:** Weight (lbs), Equipment type (Select), Commodity type (Select), Notes (Textarea)

On submit:
- Calls `customerApi.requestLoad(data)` which hits `POST /customer/loads/request`
- Backend creates a load with `status: 'draft'`, `intake_source: 'portal'`
- Redirects to `/customer/dashboard` on success

### Public Tracking: `/track/[token]`

**File:** `apps/web/src/app/track/[token]/page.tsx`

No authentication required. Shows:
- SALLY branding header with carrier company name
- Load number and origin -> destination route
- Large status display (Order Pending, Route Planned, In Transit, Delivered, Cancelled)
- Estimated delivery date
- Timeline of events (Order Confirmed, Driver Assigned, Picked Up, In Transit, Delivered)
- Proof of Delivery section (placeholder: "Available after delivery")

**Data source:** Fetches `GET /tracking/{token}` (public endpoint, no auth)
**Auto-refresh:** Polls every 60 seconds via `setInterval`

---

## 5. Backend Endpoints

### Customer Loads Controller

**File:** `apps/backend/src/domains/fleet/loads/controllers/customer-loads.controller.ts`
**Route prefix:** `/customer/loads`
**Auth:** All endpoints require `CUSTOMER` role.

| Method | Route | Purpose | Validated |
|---|---|---|---|
| GET | `/customer/loads` | List customer's loads with route plan ETA | Yes |
| GET | `/customer/loads/:load_id` | Get single load (validates customer ownership) | Yes |
| POST | `/customer/loads/request` | Submit load request (creates draft) | Yes |

**Security checks:**
- All endpoints verify `user.customerId` exists, throw `ForbiddenException` if not
- `findByCustomerId` uses `user.customerDbId` for data scoping
- `findOneForCustomer` validates that the load's `customerId` matches the requesting user's customer

### Tracking Controller

**File:** `apps/backend/src/domains/fleet/loads/controllers/tracking.controller.ts`
**Route prefix:** `/tracking`
**Auth:** `@Public()` decorator - no authentication required.

| Method | Route | Purpose | Validated |
|---|---|---|---|
| GET | `/tracking/:token` | Get public tracking info by token | Yes |

### Customers Controller

**File:** `apps/backend/src/domains/fleet/customers/controllers/customers.controller.ts`
**Route prefix:** `/customers`
**Auth:** Requires `DISPATCHER`, `ADMIN`, or `OWNER` role.

| Method | Route | Purpose | Validated |
|---|---|---|---|
| POST | `/customers` | Create customer | Yes |
| GET | `/customers` | List customers with portal access status | Yes |
| GET | `/customers/:customer_id` | Get customer detail | Yes |
| PUT | `/customers/:customer_id` | Update customer | Yes |
| POST | `/customers/:customer_id/invite` | Send portal invitation | Yes |

---

## 6. Customer Invitation Flow

```
1. Dispatcher creates Customer via POST /customers
        |
        v
2. Dispatcher clicks "Invite" on customer row
   Triggers POST /customers/:id/invite
        |
        v
3. Backend: customersService.inviteContact(customerId)
   Creates UserInvitation with:
     role: CUSTOMER
     customerId: customer.id
     token: crypto random
     expiresAt: now + 7 days
     email: customer.contactEmail
        |
        v
4. (Email sending not yet implemented)
   Customer receives invitation link
        |
        v
5. Customer accepts invitation
   POST /auth/accept-invitation
   Creates User with customerId linkage
   User.role = CUSTOMER
        |
        v
6. Customer can now log in and access /customer/dashboard
```

### Portal Access Status (Derived)

Similar to drivers, the customer list endpoint derives portal access status:
- If a User with matching `customerId` exists -> "Active"
- If a pending UserInvitation with matching `customerId` exists -> "Invited"
- Otherwise -> "No Access"

---

## 7. Tracking Timeline Logic (Validated: `buildTrackingTimeline`)

The tracking timeline is built server-side from load state:

| Event | Condition | Status |
|---|---|---|
| "Order Confirmed" | Always (load exists) | completed |
| "Driver Assigned" | status in [planned, active, in_transit, completed] | completed |
| "Picked Up" | status in [active, in_transit, completed] and pickup has data | completed |
| "In Transit" | status in [active, in_transit] | current |
| "Delivered" / "Delivery" | status = completed (completed) or else (upcoming) | varies |

The timeline uses the origin stop's city/state for pickup detail and the last delivery stop's city/state for delivery detail.

---

## 8. Design Decisions

1. **Separate route group for customer pages:** Customer pages live under `/customer/*` with distinct layouts, not mixed into dispatcher routes.
2. **Public tracking is completely separate from auth:** The `/track/[token]` page uses a direct API fetch without the auth store, making it truly shareable.
3. **Customer requests create drafts:** Load requests from the portal enter as `draft` status with `intake_source: 'portal'`, requiring dispatcher review before planning.
4. **Denormalized customer name on loads:** `Load.customerName` allows displaying the customer name in load lists without joining the Customer table, optimizing the common read path.
5. **Estimated delivery from route plan:** The customer dashboard and tracking page derive estimated delivery from the active RoutePlan's `estimatedArrival`, connecting loads to the route planning engine's output.
6. **POD as placeholder:** The tracking page shows a "Proof of Delivery" section but the actual POD table and upload functionality are not yet built. This sets the UX expectation for future implementation.

---

## 9. Future Features (Designed, Not Built)

### Proof of Delivery (POD)
- `ProofOfDelivery` table (not in current schema)
- Photo upload capability for drivers
- Customer download from tracking page
- Document storage integration

### Email Notifications
- Status change notifications to customer email
- Configurable via `notificationPrefs` JSON field on Customer
- Would require email service infrastructure (SendGrid, SES, etc.)

### Multi-Contact Support
- Currently one contact per customer
- Future: multiple contacts with different notification preferences
- Would require a `CustomerContact` junction table

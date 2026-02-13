# Customers — Design & Implementation Reference

> **Last updated:** 2026-02-13 | **Status:** Implemented (core CRUD + portal invitations)

## Overview

Customer management handles shipper/customer records and their portal access. Customers can be created by dispatchers, then optionally invited to the customer portal where they can submit load requests and track shipments. Each customer belongs to a tenant and can have multiple portal users.

---

## Data Model

**Table:** `customers` (multi-tenant, scoped by `tenantId`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `customerId` | string | auto-gen | Format: `CUST-####` |
| `tenantId` | FK | yes | Multi-tenant |
| `companyName` | string | yes | |
| `contactName` | string | no | Primary contact |
| `contactEmail` | string | no | Primary contact email |
| `contactPhone` | string | no | |
| `billingEmail` | string | no | For invoices (not in UI yet) |
| `address` | string | no | Company HQ (not in UI yet) |
| `city` | string | no | (not in UI yet) |
| `state` | string | no | (not in UI yet) |
| `notificationPrefs` | JSON | no | Future: SMS/email/push preferences |
| `isActive` | boolean | yes | Soft delete flag |

### Relations
| Relation | Type | Notes |
|----------|------|-------|
| `users[]` | User[] | CUSTOMER role accounts (portal users) |
| `invitations[]` | UserInvitation[] | Pending portal invites |
| `loads[]` | Load[] | Loads linked to this customer |

### Portal Access Status (Computed)
Derived from `users` and `invitations` relations:
| Status | Meaning |
|--------|---------|
| `ACTIVE` | Has at least one linked user account |
| `INVITED` | Has pending invitation (no active user yet) |
| `NO_ACCESS` | No user or invitation |
| `DEACTIVATED` | Previously active, now deactivated |

---

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/customers` | DISPATCHER+ | Create customer |
| GET | `/customers` | DISPATCHER+ | List all customers for tenant |
| GET | `/customers/:customer_id` | DISPATCHER+ | Get customer details |
| PUT | `/customers/:customer_id` | DISPATCHER+ | Update customer info |
| POST | `/customers/:customer_id/invite` | DISPATCHER+ | Invite contact to customer portal |

### Invite Contact
- Creates `UserInvitation` with `role=CUSTOMER`
- 7-day token expiry
- Links invitation to customer record
- Returns: `invitation_id`, `email`, `status`, `expires_at`

---

## Frontend Architecture

### File Structure
```
apps/web/src/features/fleet/customers/
├── api.ts                          # REST client (customersApi)
├── types.ts                        # Customer, CustomerCreate, CustomerInvite
└── index.ts                        # Barrel exports

apps/web/src/app/dispatcher/loads/
└── page.tsx                        # Loads page — Customers tab
    ├── CustomerList                 # Table view with portal status
    ├── CustomerCreateDialog         # Tier 1 create dialog
    └── CustomerInviteDialog         # Tier 1 invite dialog
```

### Pages

**Loads Page — Customers Tab** (`/dispatcher/loads`, Customers tab)
- Table columns: Company Name, Contact Name, Contact Email, Contact Phone, Portal Access Status, Actions
- Portal Access badges: NO_ACCESS, INVITED, ACTIVE, DEACTIVATED
- Actions dropdown: View, Edit, Invite Contact (if NO_ACCESS)
- "Add Customer" button opens create dialog

### Key Components

**CustomerCreateDialog** (Tier 1, `max-w-lg`)
- Fields:
  - Company Name* (text)
  - Contact Name (text)
  - Contact Email (email)
  - Contact Phone (tel)

**CustomerInviteDialog** (Tier 1)
- Fields:
  - Email* (email)
  - First Name* (text)
  - Last Name* (text)
- Success notification: "Invitation sent to {email}"

### API Client
| Method | Purpose |
|--------|---------|
| `customersApi.list()` | List all customers |
| `customersApi.getById(id)` | Get customer detail |
| `customersApi.create(data)` | Create customer |
| `customersApi.update(id, data)` | Update customer |
| `customersApi.invite(customerId, data)` | Send portal invitation |

---

## Key Features

### Portal Access Flow
```
Dispatcher creates customer
    ↓
Customer has NO_ACCESS
    ↓
Dispatcher clicks "Invite Contact"
    ↓
Invitation sent (7-day expiry)
    ↓
Customer status = INVITED
    ↓
Contact accepts invitation, creates account
    ↓
Customer status = ACTIVE
    ↓
Customer can submit load requests via portal
```

### Customer Portal (Partial)
Backend endpoints exist:
- `GET /customer-loads` — list loads for logged-in customer
- `POST /customer-loads` — create load request (creates as draft)
- `GET /customer-loads/:load_id` — view specific load (ownership validated)

Frontend portal UI is partially built (structure exists, full UI pending).

---

## Future Work (Not Yet Implemented)
- Customer detail/profile page
- Customer edit form (backend ready, frontend edit dialog not visible)
- Billing email field in UI
- Company address/location in create/edit forms
- Notification preferences UI
- Customer search/filter by company name, contact, city
- Bulk customer operations
- Full customer portal UI (load request submission, shipment tracking)
- Customer-specific rate sheets / contracts
- Customer load history view

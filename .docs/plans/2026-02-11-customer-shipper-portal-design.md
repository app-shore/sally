# Customer / Shipper Portal — Feature Design

**Created:** February 11, 2026
**Status:** Design Complete — Ready for Implementation Planning
**Epic:** Customer Visibility & Self-Service
**Personas:** Shipper/Customer (primary), Dispatcher (secondary)

---

## Problem Statement

Shippers constantly call dispatchers asking "where's my truck?" Every status update is a phone call or email. There's no self-service visibility for customers, and no way for shippers to submit load requests directly. This wastes dispatcher time and frustrates shippers.

---

## Design Decisions

1. **Both login portal AND public tracking links** — customers who want full access log in; one-off tracking works via shared links with no auth required.
2. **New "Customer" role** — added to existing role system (Admin, Dispatcher, Driver, Customer).
3. **Customer entity** — proper `customer` table replacing the `customer_name` text field on loads. Links to users and loads.
4. **Curated visibility** — shippers see status, ETA, city-level location, POD. They do NOT see rates, driver phone, HOS details, exact GPS, or internal notes.
5. **Load requests from portal** — shippers can submit load requests that land in the dispatcher's Intake Queue as drafts.
6. **Same tracking component** — both the login portal and public tracking link use the same underlying tracking detail component.

---

## Two Access Methods

```
                    ┌──────────────────────┐
                    │   Customer Portal    │
  Customer login ──→│   (all their loads)  │
                    │   + request loads    │
                    │   + history          │
                    │   + POD downloads    │
                    └──────────┬───────────┘
                               │
                     shares same tracking
                        detail component
                               │
                    ┌──────────┴───────────┐
  Tracking link ──→ │  Public Tracking     │
  (no login)        │  (single load view)  │
                    │  (read-only)         │
                    └──────────────────────┘
```

---

## Public Tracking Link (No Auth)

### How It Works

1. Every load gets a unique tracking token when activated (e.g., `LD-4821-abc7f`)
2. Public URL: `https://track.sally.app/{token}` (or `/{tenant-slug}/track/{token}`)
3. No login required — anyone with the link can view
4. Link is shareable by dispatcher via [Copy Tracking Link] button on load card
5. Page auto-refreshes every 60 seconds

### Tracking Page UI

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  SALLY                          Powered by ABC Carriers │
│                                                         │
│  Load: LD-4821                                          │
│  ABC Furniture → XYZ Distribution                       │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │              STATUS: In Transit                    │  │
│  │                                                   │  │
│  │    Estimated Delivery: Feb 14, 2:30 PM            │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ── Timeline ────────────────────────────────────────   │
│                                                         │
│  ✅ Order Confirmed           Feb 11, 3:15 PM          │
│  ✅ Driver Assigned           Feb 11, 4:00 PM          │
│  ✅ Picked Up                 Feb 12, 6:45 AM          │
│     Dallas, TX                                          │
│  🚛 In Transit                Updated 10 min ago       │
│     Near Little Rock, AR                                │
│     Estimated arrival: Feb 14, 2:30 PM                  │
│  ⬜ Delivered                                           │
│     Atlanta, GA                                         │
│                                                         │
│  ── Proof of Delivery ───────────────────────────────   │
│                                                         │
│     Available after delivery                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### After Delivery — POD Section Updates

```
  ✅ Delivered                    Feb 14, 2:18 PM
     Atlanta, GA
     Signed by: John Martinez

  ── Proof of Delivery ──────────────────────────

  📄 Signed BOL          [Download PDF]
  📷 Delivery Photos     [View 3 photos]

  Delivered to: XYZ Distribution Center
  Received by: John Martinez
  Condition: Good — no damage noted
```

---

## Visibility Rules — What Shippers See vs Don't See

| Shipper SEES | Shipper DOES NOT see |
|---|---|
| Current status (picked up, in transit, delivered) | Driver's phone number |
| Estimated delivery time | Driver's HOS hours |
| City-level location ("Near Little Rock, AR") | Exact GPS coordinates |
| Pickup/delivery timestamps | Rate / revenue / cost |
| Proof of delivery (signed BOL, photos) | Other loads on the truck |
| Delay notifications with new ETA | Internal dispatcher notes |
| Number of stops | Other customers' stop details |

The carrier controls what's visible. No sensitive operational data leaks.

---

## Customer Login Portal

### Route: `/customer/dashboard`

### After Login — Load List

```
┌─────────────────────────────────────────────────────────┐
│ SALLY          ABC Furniture Inc        Jane Smith  [⚙] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Active (4)]   [History]   [+ Request a Load]          │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ LD-4821  Dallas → Atlanta     🚛 In Transit      │  │
│  │ ETA: Feb 14, 2:30 PM         Updated 10m ago     │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ LD-4825  Dallas → Memphis     📦 Picked Up       │  │
│  │ ETA: Feb 13, 6:00 PM         Updated 1h ago      │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ LD-4830  Houston → Chicago    ⏳ Pending          │  │
│  │ Pickup: Feb 15, 8:00 AM      Awaiting driver     │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ LD-4832  Dallas → Atlanta     ⏳ Pending          │  │
│  │ Pickup: Feb 16, 6:00 AM      Awaiting driver     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Click any load → same tracking detail page (timeline, ETA, POD).

### History Tab

Simple searchable table of past loads:

```
Load #     Lane                  Delivered     Status
LD-4798    Dallas → Atlanta      Feb 10        ✅ Completed
LD-4785    Houston → Memphis     Feb 8         ✅ Completed
LD-4770    Dallas → Chicago      Feb 5         ✅ Completed
```

Each row expandable or clickable for tracking detail + POD download.

---

## Load Request — Shipper Submits Directly

### Route: `/customer/request-load`

```
┌─────────────────────────────────────────────────────────┐
│  Request a Shipment                                     │
│                                                         │
│  Pickup                                                 │
│  📍 [Google Places autocomplete          ]              │
│  📅 [Feb 15, 2026    ] ⏰ [8:00 AM - 12:00 PM]        │
│                                                         │
│  Delivery                                               │
│  📍 [Google Places autocomplete          ]              │
│  📅 [Feb 17, 2026    ] ⏰ [6:00 AM - 6:00 PM ]        │
│                                                         │
│  + Add another stop                                     │
│                                                         │
│  Weight: [20,000 lbs]   Equipment: [Dry Van ▾]         │
│  Commodity: [General ▾]                                 │
│  Notes: [                                    ]          │
│                                                         │
│                              [Submit Request]           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### What Happens After Submit

1. Load request creates a **draft** in SALLY with `intake_source: portal`
2. Lands in dispatcher's **Intake Queue** on the Loads Dispatch Board:

```
INTAKE / Drafts Column:
┌────────────────────────┐
│ 👤 ABC Furniture        │
│ Dallas → Atlanta        │
│ from portal • 5m ago    │
│                         │
│ [Review & Confirm]      │
└────────────────────────┘
```

3. Dispatcher reviews, confirms → normal flow continues
4. Shipper sees status update on their portal: "Pending → Driver Assigned → ..."

---

## Email Notifications to Shippers

Simple milestone-based emails. Three emails per load:

### Email 1: Pickup Confirmation
```
Subject: Your shipment LD-4821 has been picked up

Hi Jane,

Your shipment from Dallas, TX has been picked up.

Estimated delivery: February 14 by 4:00 PM

Track your shipment:
https://track.sally.app/LD-4821-abc7f

— ABC Carriers via SALLY
```

### Email 2: In-Transit Update (optional, configurable)
```
Subject: Shipment LD-4821 update — arriving tomorrow

Hi Jane,

Your shipment is on track.
Arriving: February 14 by 2:30 PM

Track your shipment:
https://track.sally.app/LD-4821-abc7f

— ABC Carriers via SALLY
```

### Email 3: Delivery Confirmation
```
Subject: Your shipment LD-4821 has been delivered

Hi Jane,

Your shipment has been delivered in Atlanta, GA.
Received by: John Martinez

View proof of delivery:
https://track.sally.app/LD-4821-abc7f

— ABC Carriers via SALLY
```

### Delay Notification (triggered by monitoring)
```
Subject: Shipment LD-4821 — updated delivery estimate

Hi Jane,

Due to weather conditions, the estimated delivery for your
shipment has been updated.

New ETA: February 15 by 10:00 AM (was Feb 14 by 2:30 PM)

Track your shipment:
https://track.sally.app/LD-4821-abc7f

— ABC Carriers via SALLY
```

---

## Dispatcher Side — Tracking Link Management

On the Loads Dispatch Board, active load cards include:

```
│ [View on Live Routes →]          │
│ [🔗 Copy Tracking Link]         │
```

In Settings → Customer Notifications:

```
Auto-send tracking link when load goes active:  [On/Off]
Send pickup confirmation:                       [On/Off]
Send in-transit updates:                        [On/Off]
Send delivery confirmation:                     [On/Off]
Send delay notifications:                       [On/Off]
```

Carrier-level defaults. Can be overridden per customer.

---

## Role & Auth Structure

### New Role: Customer

```
Roles:
├── Admin
│   └── Everything + user management, billing, settings
├── Dispatcher
│   └── Loads, fleet, route planning, live routes, command center
├── Driver
│   └── Their routes only, stop completion, POD upload
└── Customer (NEW)
    └── Their loads only, tracking, load requests, POD downloads
```

### Customer Scoping

Customer users can ONLY see loads where `load.customer_id = their customer_id`. Enforced at API level — no client-side filtering.

### Customer Navigation (Simple)

```
Sidebar (Customer role):
  My Shipments    /customer/dashboard
  Request Load    /customer/request-load
  Settings        /customer/settings
```

Minimal. No fleet, no routing, no operations. Just their shipments.

---

## Schema Changes

### Customer Entity (New Table)

```
Customer:
  customer_id       UUID, primary key
  tenant_id         UUID, FK to tenant
  company_name      string (e.g., "ABC Furniture")
  contact_name      string
  contact_email     string
  contact_phone     string (optional)
  billing_email     string (optional)
  address           string (optional)
  city              string (optional)
  state             string (optional)
  notification_prefs jsonb (which emails to send)
  created_at        timestamp
  updated_at        timestamp
```

### Customer User Link

```
User model additions:
  customer_id       UUID, FK to Customer (nullable)
                    (only set when role = customer)
```

### Load Model Changes

```
Load model changes:
  customer_name     string → KEEP for backward compat / display
  customer_id       UUID, FK to Customer (NEW, nullable)
  tracking_token    string, unique (NEW — e.g., "LD-4821-abc7f")
  tracking_enabled  boolean, default true (NEW)
```

### POD (Proof of Delivery) Table (New)

```
ProofOfDelivery:
  pod_id            UUID, primary key
  load_id           UUID, FK to Load
  signed_by         string (receiver name)
  signed_at         timestamp
  condition_notes   string (optional)
  bol_document_url  string (S3 URL to signed BOL PDF)
  photos            jsonb (array of S3 URLs)
  uploaded_by       UUID, FK to User (driver)
  created_at        timestamp
```

### Tracking Token Generation

When load status changes to `active`:
- Generate token: `{load_number}-{random_6_chars}`
- Store in `tracking_token` field
- This becomes the public URL identifier

---

## API Endpoints

### Public (No Auth)

```
GET /api/v1/tracking/{token}
  → Returns shipper-safe load data (status, timeline, ETA, city-level location, POD)
  → No sensitive fields (rate, HOS, GPS, driver phone)
```

### Customer Portal (Customer Auth)

```
GET  /api/v1/customer/loads              → List customer's loads
GET  /api/v1/customer/loads/{load_id}    → Load detail (same as tracking but with history)
POST /api/v1/customer/loads/request      → Submit load request (creates draft)
GET  /api/v1/customer/loads/{load_id}/pod → Download POD documents
```

### Dispatcher (Existing Auth)

```
POST /api/v1/loads/{load_id}/tracking-link  → Generate/regenerate tracking token
GET  /api/v1/customers                      → List customers for this tenant
POST /api/v1/customers                      → Create customer
PUT  /api/v1/customers/{customer_id}        → Update customer
```

---

## Implementation Phases

### Phase 1: Foundation
- Customer entity + schema migration
- Customer role + auth scoping
- `customer_id` on loads (migrate from `customer_name`)
- Tracking token generation on load activation
- Customer management CRUD (under Settings or Admin)

### Phase 2: Public Tracking
- Public tracking page (`/track/{token}`)
- Tracking timeline component (reusable)
- City-level location from monitoring data
- ETA display from route planning data
- [Copy Tracking Link] button on load cards

### Phase 3: Customer Login Portal
- Customer login/auth flow
- Customer dashboard (load list)
- Load detail view (reuses tracking component)
- History tab with search
- POD download

### Phase 4: Load Requests & Notifications
- Load request form with Google Places
- Integration with dispatcher's Intake Queue (drafts)
- Email notification service (pickup, in-transit, delivery, delay)
- Notification preferences (carrier-level defaults + per-customer overrides)

### Phase 5: Polish
- Carrier branding on tracking page (logo, colors)
- SMS notifications (in addition to email)
- Customer invitation flow (dispatcher invites shipper contact)
- Request history for customers

---

## Technical Notes

### Public Tracking — No New Infrastructure

The tracking page reads from the **same data** the monitoring system already collects:
- Load status → from loads table
- ETA → from route plan
- Location → from monitoring/ELD data (city-level only for shipper)
- POD → from proof_of_delivery table

Just a public read-only API endpoint with field filtering.

### Email Service

Options (pick one):
- **SendGrid** — transactional emails, easy templates, good deliverability
- **AWS SES** — cheaper at scale, already on AWS
- **Resend** — modern API, great DX, good for startups

Emails triggered by load status changes (event-driven, not polled).

### Tracking Page Performance

- Server-side rendered for SEO and fast first load
- Polls every 60 seconds for updates (or WebSocket for real-time)
- Cached aggressively — tracking data changes infrequently
- No heavy JS needed — mostly static content with periodic refresh

---

## Success Metrics

- Reduce "where's my truck?" calls by 80%+
- Shipper load request → dispatcher confirmation in < 15 minutes
- 100% of active loads have tracking links available
- POD available to shipper within 1 hour of delivery
- Customer portal adoption: 50%+ of repeat shippers using login within 3 months

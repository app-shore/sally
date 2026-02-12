# Fleet Management Document Lifecycle

> Domain knowledge reference: Documents processed and stored from driver onboarding through load finalization.

---

## Phase 1: Driver Onboarding & Qualification

Before a driver can touch a single load, the carrier must collect and verify:

### Driver Application & Identity
- **Employment Application** (DOT-required, 10-year history)
- **Driver's License (CDL)** — Class A/B, endorsements (Hazmat, Tanker, Doubles)
- **Social Security Card / W-4 / I-9** (tax & work authorization)
- **Medical Certificate (DOT Physical Card)** — valid 2 years, 1 year if conditions exist
- **MVR (Motor Vehicle Record)** — pulled from state DMV, reviewed annually
- **PSP Report (Pre-Employment Screening)** — crash & inspection history from FMCSA
- **Drug & Alcohol Test Results** — pre-employment, random, post-accident
- **Previous Employer Verification** (DOT requires going back 3 years)
- **Road Test Certificate** or equivalent (proof driver can operate the equipment)

### Compliance Files (the "Driver Qualification File" or DQF)
The FMCSA requires every carrier to maintain a **DQF** per driver containing all the above. This file must be audit-ready at all times. Missing a single document = violation during an audit.

### Equipment Assignment
- **Vehicle Assignment Sheet** — which truck (unit #), VIN, license plate
- **Trailer Pool Assignment** (if dedicated)
- **ELD Device Registration** — driver paired to device in Samsara/KeepTruckin/etc.
- **Fuel Card Issuance** — linked to driver + truck unit
- **Company Credit Card / Comdata / EFS card** (for lumper fees, scales, etc.)

### Insurance & Authority
- **Certificate of Insurance (COI)** — auto liability, cargo, general liability
- **Operating Authority (MC Number)** — carrier's FMCSA authority
- **BOC-3 (Blanket of Coverage)** — process agent designation

---

## Phase 2: Customer Onboarding & Rate Agreement

Before you haul for a customer (shipper or broker):

### Customer Setup
- **Credit Application** or **Carrier Packet** (if you're the carrier being vetted by a broker)
- **W-9** — for tax reporting (1099 at year end)
- **Certificate of Insurance** — customer wants proof of your coverage
- **Operating Authority verification** — they check your MC# on SAFER/FMCSA
- **Broker-Carrier Agreement** or **Shipper-Carrier Contract**
  - Rates (per mile, flat, percentage)
  - Payment terms (30 days, quick pay options)
  - Accessorial charges (detention, layover, TONU)
  - Liability limits, claims procedures
- **Credit Check** on the broker/customer — will they actually pay? (services like DAT, Carrier411)
- **Factoring Notice** (if carrier uses factoring — tells customer to pay the factor, not the carrier)

---

## Phase 3: Load Booking & Dispatch

When a load is booked, these documents are created/exchanged:

### Rate Confirmation / Load Tender
- **Rate Confirmation Sheet (Rate Con)** — THE critical document
  - Shipper name, address, pickup date/time
  - Consignee (receiver) name, address, delivery date/time
  - Commodity description, weight, piece count
  - Rate (flat, per mile, etc.)
  - Accessorial terms (detention pay, layover)
  - Special instructions (temperature for reefer, hazmat placards, etc.)
  - Reference numbers (PO#, BOL#, PRO#, load#)
- **Load Confirmation / Dispatch Sheet** (internal to carrier)
  - Assigned driver, truck#, trailer#
  - Planned route, fuel stops
  - Expected HOS situation (this is where SALLY comes in)
  - Customer contact info
  - Lumper fee authorization

### Pre-Trip
- **Pre-Trip Inspection Report (DVIR)** — driver inspects truck & trailer before departure
  - Tires, brakes, lights, coupling, fluids
  - Must be documented (paper or electronic via ELD)
  - If defects found → must be repaired before moving

---

## Phase 4: Pickup (At Shipper's Facility)

### Documents Generated at Pickup
- **Bill of Lading (BOL)** — THE most important document in freight
  - Legal contract between shipper and carrier
  - Describes freight: commodity, weight, class, piece count, hazmat info
  - Origin and destination
  - Shipper and consignee details
  - Special handling instructions
  - **Driver signs it** — accepting the freight in described condition
  - Usually 3+ copies: shipper keeps one, driver carries originals
- **Shipper's Letter of Instruction** (international loads)
- **Seal Number Record** — trailer sealed at pickup, number recorded on BOL
- **Lumper Receipt** (if third-party unloading at pickup — rare but happens)
- **Pickup Appointment Confirmation**
- **Photos of Freight** (increasingly common — proof of condition at pickup)
- **Hazmat Shipping Papers** (if applicable — must be in cab within driver's reach)
- **Temperature Log Start** (reefer loads — continuous temp recording begins)

### Detention at Pickup
- **Detention Time Log** — if driver waits beyond free time (usually 2 hours)
  - Arrival time, load-ready time, departure time
  - This triggers accessorial charges back to customer

---

## Phase 5: In-Transit (Where SALLY Lives)

### Ongoing Documents / Data Streams
- **ELD Logs (HOS Records)** — continuous, electronic
  - Driving, On-Duty Not Driving, Sleeper Berth, Off Duty
  - 14-hour window, 11-hour drive limit, 30-min break, 70-hour/8-day
  - **This is what SALLY monitors and plans around**
- **Fuel Receipts** — every fuel stop, linked to IFTA reporting
- **Toll Receipts** — for cost tracking and IFTA
- **Scale Tickets** (weigh stations — CAT scale receipts if pre-weighed)
- **Roadside Inspection Reports** (if pulled in by DOT)
  - Level I (full), Level II (walk-around), Level III (driver-only)
  - Violations go on PSP report
- **Route Deviation Reports** — if driver goes off planned route
- **Check Calls / Status Updates** — driver or ELD pings location to TMS
  - Brokers/shippers expect regular updates
  - SALLY could automate these based on GPS
- **Incident Reports** — accidents, breakdowns, cargo damage
- **Breakdown/Repair Work Orders** (if truck breaks down en route)

---

## Phase 6: Delivery (At Consignee/Receiver)

### Documents at Delivery
- **Signed BOL (Proof of Delivery / POD)** — CRITICAL
  - Consignee signs the BOL confirming receipt
  - Notes any damage, shortage, or overage on the BOL
  - **Without a clean signed POD, you don't get paid**
- **Delivery Receipt** — sometimes separate from BOL
- **Packing Slip Verification** — receiver checks against PO
- **Seal Intact Verification** — receiver confirms seal # matches BOL
- **Temperature Log Printout** (reefer loads — proof chain was maintained)
- **Lumper Receipt** (if third-party unloading — common at grocery warehouses, $150-$400)
- **Unloading Photos** (proof of condition at delivery)
- **DVIR (Post-Trip Inspection)** — driver inspects equipment after trip

### Detention at Delivery
- **Detention Time Log** — same as pickup, tracked for billing
- **Appointment vs Actual Time** — evidence for detention claims

---

## Phase 7: Post-Delivery / Load Finalization

This is the back-office process to close out a load and get paid:

### Document Collection & Submission
- **POD (signed BOL)** — driver submits (scan, photo, or physical)
  - Must be legible, signed, with no exceptions noted (or exceptions documented)
- **Rate Confirmation** (already on file)
- **Invoice** — carrier invoices broker/shipper
  - Load #, reference numbers
  - Base rate
  - Accessorial charges (detention, lumper, TONU, layover)
  - Supporting docs attached (detention logs, lumper receipts)
- **Fuel Receipts** — for IFTA reconciliation and cost tracking
- **Trip Expense Report** — tolls, scales, parking, meals
- **Factoring Submission** (if using factoring company)
  - Invoice + POD + Rate Con sent to factor
  - Factor pays carrier within 24 hours (minus fee)
  - Factor collects from broker on payment terms

### Compliance Closeout
- **ELD Logs Certified** — driver certifies daily logs within 13 days
- **DVIR Filed** — pre-trip and post-trip on record
- **Hours Recapped** — ensure no violations occurred during the load
- **Any Incidents Documented** — accidents, violations, cargo claims

### Financial Reconciliation
- **Revenue vs Cost Analysis** per load
  - Revenue: line haul + accessorials
  - Costs: fuel, tolls, driver pay, maintenance allocation
  - Profit margin per load
- **Driver Pay Settlement**
  - Per mile, percentage, or flat rate per load
  - Deductions: fuel advances, cash advances, insurance
  - Settlement statement issued to driver (weekly or per-load)
- **IFTA Fuel Tax Reporting** (quarterly)
  - Miles driven per state vs fuel purchased per state
  - Generated from fuel receipts + ELD mileage data
- **1099 Generation** (for owner-operators, annually)

---

## Phase 8: Claims & Disputes (When Things Go Wrong)

- **Cargo Claim** — shipper/receiver claims freight was damaged
  - Photos, inspection reports, BOL notations
  - Carrier's insurance handles (or carrier pays if under deductible)
  - 9-month filing deadline, 2-year lawsuit deadline (Carmack Amendment)
- **Detention Dispute** — carrier claims detention, broker disputes
  - Need timestamped evidence (ELD, geofence, driver log)
- **Short Pay / Non-Payment** — broker doesn't pay full amount
  - Rate con is the legal document that matters
- **Double Brokering Investigation** — if load was illegally re-brokered
- **TONU (Truck Order Not Used)** — driver showed up, load cancelled
  - Rate con should specify TONU fee

---

## Document Flow Summary

| Phase | Key Documents | Who Creates | Who Stores |
|-------|--------------|-------------|------------|
| Driver Onboarding | CDL, Medical, MVR, DQF | Driver/DMV/FMCSA | Carrier (compliance) |
| Customer Setup | Rate Agreement, COI, W-9 | Carrier + Customer | Both parties |
| Load Booking | Rate Confirmation | Broker/Shipper | Carrier TMS |
| Pickup | BOL, Seal Record, Photos | Shipper + Driver | Carrier TMS |
| In-Transit | ELD Logs, Fuel Receipts | ELD/Driver | ELD System + TMS |
| Delivery | Signed POD, Temp Logs | Consignee + Driver | Carrier TMS |
| Finalization | Invoice, Settlement | Carrier back-office | TMS + Accounting |
| Claims | Claim docs, Photos | Multiple parties | Carrier + Insurance |

---

## Where SALLY Fits

SALLY primarily operates in **Phases 3-6** (dispatch through delivery):

- **Phase 3**: Route planning, HOS projection, fuel stop planning
- **Phase 5**: Continuous monitoring, HOS compliance, alert generation
- **Phase 6**: Delivery ETA management, detention tracking

But the document context from **all phases** matters because:
- Driver's HOS history (Phase 1 data) affects route feasibility
- Rate con terms (Phase 3) determine what accessorials SALLY should track
- POD completion (Phase 6) triggers load finalization workflows
- Detention evidence (Phase 5-6) needs SALLY's timestamp data

---

## Rate Con & Accessorials: Why It Matters for SALLY

The **Rate Confirmation** contains specific contractual terms about what extra charges (accessorials) the carrier can bill for, and under what conditions.

### Typical Rate Con Terms

```
Base Rate:             $2,500 flat (or $2.85/mile)
Detention at Pickup:   $75/hr after 2 hours free time
Detention at Delivery: $75/hr after 2 hours free time
Layover:               $350/day if held overnight
TONU:                  $400 if load cancels after dispatch
Lumper:                Reimbursed with receipt
Driver Assist:         $75 if driver helps load/unload
```

### How This Changes SALLY's Behavior

**Scenario: Driver arrives at pickup, waits 4 hours to get loaded**

- **If rate con says "2 hours free, $75/hr after"** → SALLY should:
  - Start a detention clock when driver arrives (geofence + ELD shows On-Duty Not Driving)
  - At 2 hours: alert dispatcher "Detention started on Load #4521, $75/hr now accruing"
  - Track the total — dispatcher knows to bill $150 (2 billable hours x $75)
  - Store timestamps as evidence if broker disputes later

- **If rate con says nothing about detention** → SALLY should:
  - Still alert dispatcher that driver is waiting (operational awareness)
  - But there's no financial trigger — carrier eats the cost
  - Dispatcher might call broker to negotiate, but there's no contractual basis

- **If rate con says "$50/hr after 3 hours free"** → Different thresholds, different alert timing

### Layover Example

Driver runs out of HOS hours and can't deliver until tomorrow:

- **If rate con includes layover at $350/day** → SALLY knows this is a billable event, can flag it for invoicing
- **If no layover term** → Carrier absorbs the cost, but SALLY should still alert dispatcher for scheduling

### The Key Insight

The rate con defines the **financial rules of engagement** for each load. Without knowing those terms, SALLY can track *operational* events (driver is waiting, driver is delayed) but can't attach **financial significance** to them — which changes the priority and urgency of dispatcher alerts.

---

*Created: February 12, 2026*
*Purpose: Domain knowledge reference for SALLY product development*

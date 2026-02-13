# Load Creation UX Review - Critical Analysis

**Date:** February 12, 2026
**Type:** Brainstorming / UX Review
**Status:** Exploration (no implementation yet)

---

## Current State Summary

The "New Load" form is a **Tier 2 dialog** (`max-w-2xl`) with two sections:

### Section 1: Load Details (6 fields)
| Field | Required | Input Type |
|-------|----------|------------|
| Load Number | Yes | Text input (manual entry) |
| Customer | Yes | Select dropdown or text |
| Weight (lbs) | Yes | Number input |
| Commodity | No | Select (General, Hazmat, Refrigerated, Fragile) |
| Equipment Type | No | Select (Dry Van, Reefer, Flatbed, Step Deck) |
| Special Requirements | No | Text input |

### Section 2: Stops (dynamic, min 2)
| Field | Required | Input Type |
|-------|----------|------------|
| Type | Yes | Select (Pickup, Delivery, Both) |
| Location Name | Yes | Text input |
| Dock Hours | Yes | Number (step 0.5) |
| Address | No | Text input |
| City | No | Text input |
| State | No | Text input |

---

## Critical UX Issues

### 1. Load Number - Manual Entry is a Problem

**Current:** Dispatcher manually types "LD-001"

**Problem:** This is error-prone and creates cognitive load. Dispatchers shouldn't be thinking about numbering schemes - they should be creating loads fast. What happens when two dispatchers create "LD-042" at the same time? What if someone types "LOAD-001" vs "LD-001"?

**Recommendation:** Auto-generate the load number on the backend (e.g., `LD-20260212-001` or a sequential number). Show it as a read-only field or remove it entirely from the form and show it after creation. If the customer wants a reference number, that's a different field (see "Missing Fields" below).

**Priority:** HIGH - this is friction on the most common action.

### 2. Time Windows Not Exposed in the Form

**Current:** The DTO supports `earliest_arrival` and `latest_arrival` per stop, but the form doesn't render them.

**Problem:** Appointment windows are **critical** in trucking. Most shippers and receivers have strict appointment times. A dispatcher who can't enter the pickup window of 0600-0800 is missing the most important constraint for route planning. Without this, SALLY's route optimizer can't respect real-world timing constraints.

**Recommendation:** Add time window fields to stops. Use two time/date pickers (Earliest / Latest) per stop. These could be in an expandable "Appointment Details" section to keep the default view clean.

**Priority:** HIGH - without appointment windows, loads lack the data needed for meaningful route planning.

### 3. Address Fields Are Too Fragmented

**Current:** Three separate fields: Address, City, State

**Problem:**
- No ZIP code field (needed for distance calculations, fuel cost estimates, IFTA)
- No state validation (dispatcher can type anything)
- Separate fields create friction for fast entry

**Recommendation (near-term):** Add ZIP code. Change State to a select dropdown (US states).

**Recommendation (future):** Single address autocomplete field using Google Places / Mapbox. Parses into structured fields automatically. This is what every modern TMS does.

**Priority:** MEDIUM - functional but incomplete without ZIP.

### 4. Commodity Types Are Too Limited

**Current:** 4 options: General, Hazmat, Refrigerated, Fragile

**What's missing from real-world dispatching:**
- **Dry Goods** (most common in LTL/FTL)
- **Automotive / Auto Parts**
- **Building Materials / Lumber**
- **Chemicals (non-hazmat)**
- **Food & Beverage** (different from Refrigerated - some is ambient)
- **Electronics**
- **Furniture / Household Goods**
- **Paper / Packaging**
- **Metal / Steel**
- **Pharmaceuticals** (often temperature-controlled but not "refrigerated")
- **Livestock** (specialty)

**Recommendation:** For MVP, keep it simple but add a couple key ones: `general`, `dry_goods`, `refrigerated`, `frozen`, `hazmat`, `fragile`, `oversized`, `other`. OR just make it a free-text field with common suggestions. The current 4 options feel like a tech prototype, not a dispatcher tool.

**Priority:** LOW - cosmetic, doesn't block functionality.

---

## Missing Fields Analysis

### Fields That Dispatchers Typically Need

| Field | Importance | Why | Recommendation |
|-------|-----------|-----|----------------|
| **Reference/PO Number** | HIGH | Customer's reference number for matching invoices, BOLs. Every load has one. | Add as optional text field in Load Details |
| **Pickup Date / Delivery Date** | HIGH | The single most important scheduling constraint. When does this need to move? | Add date fields (or derive from stop appointment windows) |
| **Rate / Revenue** | HIGH | Dispatchers need to know what a load pays to decide if it's worth running. Critical for profitability decisions. | Add as optional currency field. Can be Phase 2 if invoicing isn't built yet. |
| **Miles (estimated)** | MEDIUM | Often known at intake from rate confirmation. Feeds into cost-per-mile decisions. | Auto-calculate from stops (future), or allow manual entry |
| **Temperature Range** | MEDIUM | Required for reefer loads. Min/max temp setting. | Show conditionally when equipment=reefer |
| **BOL Number** | MEDIUM | Bill of Lading - legal shipping document. Often known at creation. | Optional text field |
| **Pieces / Pallets / Units** | MEDIUM | Capacity planning. A 40,000 lb load that's 26 pallets is different from 2 pallets. | Add optional number field(s) |
| **Load Length (ft)** | LOW-MEDIUM | Relevant for flatbed/step deck. Also for multi-stop loads to verify trailer fit. | Show conditionally for flatbed/step_deck |
| **Hazmat Details** | LOW-MEDIUM | UN number, hazmat class, placard type. Required if commodity=hazmat. | Show conditionally |
| **Notes / Instructions** | LOW | Internal dispatcher notes (different from "special requirements" which is customer-facing) | Optional textarea |
| **Priority / Urgency** | LOW | Hot load / expedited / standard. Affects dispatch priority. | Could be a select or just inferred from dates |
| **Broker/Shipper Contact** | LOW | Phone number / email for the shipper contact on this specific load | Future enhancement |

### What's Already Covered (Good)
- Customer name/selection
- Weight
- Equipment type
- Multi-stop with action types
- Dock hours per stop
- Special requirements

---

## Recommended Approach: Progressive Disclosure

Rather than showing everything, use a **"smart defaults + expand for more"** pattern:

### Always Visible (Core Fields - The Minimum Viable Load)
1. Customer (select or quick-add)
2. Pickup Date
3. Delivery Date
4. Stops (with appointment windows)
5. Equipment Type
6. Weight

Load number auto-generated. Status defaults to "draft."

### Expandable Section: "More Details" (collapsed by default)
7. Reference/PO Number
8. Commodity Type
9. Rate/Revenue
10. Pieces/Pallets
11. Special Requirements
12. Notes

### Conditional Fields (show based on selections)
- Temperature Range → when Equipment = Reefer
- Hazmat Details → when Commodity = Hazmat
- Load Length → when Equipment = Flatbed or Step Deck

### Why This Works
- **Fast path:** Dispatcher can create a load in 30 seconds with just customer, dates, stops, equipment, weight
- **Complete path:** All details available one click away
- **Smart path:** Conditional fields only appear when relevant
- **Dispatcher's time is the product** - every unnecessary field is lost revenue

---

## Comparison with Industry TMS Tools

| Feature | SALLY (Current) | DAT / Truckstop | Samsara | McLeod |
|---------|----------------|------------------|---------|--------|
| Auto load number | No | Yes | Yes | Yes |
| Appointment windows | No (DTO ready) | Yes | Yes | Yes |
| Reference/PO number | No | Yes | Yes | Yes |
| Rate entry | No | Yes | Yes | Yes |
| Address autocomplete | No | Yes | Yes | Limited |
| Pieces/pallets | No | Yes | No | Yes |
| Progressive disclosure | No | Varies | Yes | No (everything) |
| Conditional fields | No | Some | Yes | Yes |

---

## Summary: What to Do

### Phase 1 (Should do now - high impact, low effort)
1. **Auto-generate load number** - Remove from form, generate on backend
2. **Add pickup/delivery dates** - Even simple date fields per stop
3. **Expose appointment windows** - Already in the DTO, just wire to UI
4. **Add Reference/PO number** - Simple text field
5. **Add ZIP code to stops** - Needed for any distance/routing calculation

### Phase 2 (Should do soon - medium effort)
6. **Add Rate/Revenue field** - Currency input
7. **Progressive disclosure** - Collapse "More Details" section
8. **Conditional fields** - Temperature for reefer, hazmat details
9. **Pieces/pallets count** - Capacity planning

### Phase 3 (Can wait - higher effort)
10. **Address autocomplete** - Google Places / Mapbox integration
11. **Template loads** - Save common loads for quick re-creation
12. **Smart defaults** - Remember last used equipment type, customer, etc.

---

## Key Takeaway

The current form is a **solid technical foundation** - the data model supports most of what's needed (stops, appointment windows, equipment types). The main gaps are:

1. **Operational fields missing** (dates, reference numbers, rates)
2. **UX friction** (manual load number, no appointment windows exposed, no progressive disclosure)
3. **Dispatcher workflow** not optimized (every field is equally weighted, no smart defaults)

The form works for a demo. To work for a real dispatcher doing 20-50 loads/day, it needs the Phase 1 items above.

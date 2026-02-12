# Dialog UX Strategy for SALLY

**Date:** February 12, 2026
**Type:** UX Brainstorming & Recommendation
**Status:** Draft for Discussion

---

## 1. Current State: All Dialogs in SALLY

### Entity Creation Dialogs (User-Initiated)

| Dialog | Current Size | Fields | Complexity |
|--------|-------------|--------|------------|
| **Create Driver** | `max-w-lg` | 4 fields (name, license, phone, email) | Simple |
| **Create Vehicle (Truck)** | `max-w-lg` | 8 fields (unit, VIN, make, model, year, fuel cap, current fuel, MPG) | Medium |
| **Create Load** | `max-w-2xl` | 8+ fields + dynamic stops (each with 5 fields) | **Complex** |
| **Create Customer** | `max-w-lg` | 4 fields (company, contact, email, phone) | Simple |
| **Invite User (Team)** | `max-w-lg` | 4 fields (first, last, email, role) | Simple |
| **Invite Driver** | `max-w-lg` | 1-2 fields (email, shows driver info read-only) | Simple |
| **Invite Customer** | `max-w-lg` | 3 fields (first, last, email) | Simple |
| **Create Integration** | TBD | Multiple fields + connection config | Medium-Complex |
| **Create API Key** | TBD | Key name, permissions, rate limits | Medium |

### Admin/Management Dialogs

| Dialog | Current Size | Purpose | Complexity |
|--------|-------------|---------|------------|
| **Tenant Details** | `max-w-3xl` | View/edit tenant with tabs | Complex |
| **Reject Tenant** | `max-w-lg` | Confirmation + reason textarea | Simple |
| **Suspend Tenant** | `max-w-lg` | Confirmation + reason textarea | Simple |
| **Reactivate Tenant** | `max-w-lg` | Simple confirmation | Simple |

### Detail/View Panels

| Panel | Type | Purpose |
|-------|------|---------|
| **Load Detail** | Sheet (right) | View load details, actions |

---

## 2. The Question: Full-Screen Dialog vs Standard Dialog

You're asking about the **Firebase Console** pattern — where clicking "Create Project" takes over the entire screen with a focused, step-by-step experience.

### What Firebase Does

Firebase uses a **full-screen takeover** for project creation because:
- It's the single most important action in the entire product
- It involves multiple steps (name, analytics, billing)
- Users need to make critical decisions that affect everything after
- It happens rarely (once per project)
- There's no context from the page behind that matters

### What Other Products Do

| Product | Pattern | When They Use Full-Screen |
|---------|---------|--------------------------|
| **Firebase** | Full-screen modal | Project creation (rare, high-impact) |
| **Stripe** | Standard dialog | Most CRUD (products, prices, customers) |
| **Linear** | Inline + dialog | Issue creation (quick inline), project creation (dialog) |
| **Notion** | Inline expansion | Everything stays in-context |
| **Vercel** | Full-screen modal | Project creation, domain setup |
| **GitHub** | Dedicated page | Repository creation, settings |
| **Figma** | Standard dialog | File creation, sharing |
| **Shopify** | Dedicated page | Product creation (many fields) |

**The pattern:**
- **Full-screen** = Rare, high-stakes, multi-step, irreversible
- **Standard dialog** = Frequent, moderate complexity, reversible
- **Dedicated page** = Very complex forms, lots of fields, needs URL/navigation

---

## 3. My UX Recommendation for SALLY

### Tiered Dialog System (3 Levels)

I recommend **NOT using full-screen dialogs** for most SALLY creation flows. Instead, use a **3-tier system** based on complexity:

---

### Tier 1: Standard Dialog (`max-w-lg`)
**For: Simple, quick-entry forms (3-5 fields)**

**Use for:**
- Create Driver (4 fields)
- Create Customer (4 fields)
- Invite User (4 fields)
- Invite Driver (1-2 fields)
- Invite Customer (3 fields)
- Delete confirmations
- Reject/Suspend/Reactivate tenant

**Why:** These are fast, frequent actions. The dispatcher is in the middle of work — they see a driver isn't in the system, they click "Add Driver", fill 4 fields, done. Full-screen would feel heavy and disruptive for something that takes 10 seconds.

**Current state:** Already correct. No changes needed.

---

### Tier 2: Expanded Dialog (`max-w-2xl`, scrollable)
**For: Medium-complexity forms (6-12 fields, possibly sectioned)**

**Use for:**
- Create Vehicle (8 fields — could use 2-column grid)
- Edit Tenant (8+ fields across sections)
- Create Integration (connection config)
- Create API Key (with permissions)

**Why:** Enough fields that `max-w-lg` feels cramped, but not so many that you need dedicated navigation. A wider dialog with sections/columns works well.

**Current state:** Vehicle is currently `max-w-lg` — could benefit from upgrading to `max-w-2xl` with a 2-column layout for the make/model/year + fuel fields.

---

### Tier 3: Full-Screen Dialog (Focused Overlay)
**For: Complex, multi-section forms that need the user's full attention**

**Use for:**
- **Create Load** (the strongest candidate)
- **Route Planning** (already its own page, which is correct)
- **Tenant Details view/edit** (complex tabbed interface)

**Why Create Load is the best candidate for full-screen:**
1. It has **dynamic stops** (variable number of sub-forms)
2. Each stop has 5+ fields
3. Users need to think about sequence, geography, timing
4. It's a significant business action (committing to freight)
5. The Kanban board behind it provides zero useful context during creation
6. On mobile, the current `max-w-2xl` dialog is already nearly full-screen

---

## 4. Why NOT Full-Screen for Everything

### The Problem with Universal Full-Screen Dialogs

**1. Cognitive overhead for simple tasks**
Adding a driver is a 10-second task. Full-screen signals "this is a big deal" — it creates anxiety and friction for what should be effortless.

**2. Loss of spatial context**
When a dispatcher clicks "Add Truck" on the fleet page, the partial overlay reminds them where they are. Full-screen creates a jarring context switch that makes the app feel heavier.

**3. Firebase's context is different**
Firebase creates projects that cost money, affect billing, and configure infrastructure. SALLY creates operational records. The weight of the action is different.

**4. Frequency matters**
Dispatchers might add loads multiple times per day. Each full-screen transition adds ~2 seconds of animation and mental reset. Over a day, that's real friction.

**5. Mobile already gets full-screen**
On phones, even `max-w-lg` dialogs take up most of the screen. The full-screen pattern is really solving a desktop problem that may not exist for simple forms.

---

## 5. Recommended Implementation: Full-Screen for Create Load

If we adopt the full-screen pattern for Create Load, here's the UX approach:

### Design Characteristics

```
┌─────────────────────────────────────────────────────────────────┐
│  ✕  Create New Load                               [Save Draft] │
│─────────────────────────────────────────────────────────────────│
│                                                                 │
│  ┌─ STEP INDICATOR ──────────────────────────────────────────┐  │
│  │  ● Load Details    ○ Stops    ○ Review                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ FORM CONTENT (centered, max-w-2xl) ─────────────────────┐  │
│  │                                                           │  │
│  │  Load Number *         │  Customer *                      │  │
│  │  ┌──────────────────┐  │  ┌──────────────────────────┐    │  │
│  │  │ LD-2026-0042     │  │  │ Select customer...    ▼  │    │  │
│  │  └──────────────────┘  │  └──────────────────────────┘    │  │
│  │                                                           │  │
│  │  Weight (lbs)          │  Commodity Type                  │  │
│  │  ┌──────────────────┐  │  ┌──────────────────────────┐    │  │
│  │  │ 42,000           │  │  │ General Freight       ▼  │    │  │
│  │  └──────────────────┘  │  └──────────────────────────┘    │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│─────────────────────────────────────────────────────────────────│
│                                    [Back]  [Continue →]         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Close button (✕) top-left** — Always available, confirms if form has unsaved data
2. **Step indicator** — Shows progress: Load Details → Stops → Review
3. **Centered content** — Form stays `max-w-2xl` even though background is full-screen (breathing room)
4. **Sticky footer** — Navigation buttons always visible
5. **Save Draft** — Since it's a bigger commitment, allow saving progress
6. **Animation** — Slide up from bottom (not zoom), feels like entering a focused mode

### Multi-Step Breakdown for Load Creation

**Step 1: Load Details**
- Load Number, Customer, Weight, Commodity Type
- Equipment Type, Special Requirements

**Step 2: Stops**
- Dynamic stop list with add/remove
- Each stop: Name, City, State, Action Type, Dock Hours
- Drag to reorder
- Map preview (future enhancement)

**Step 3: Review**
- Summary of all entered data
- Validation warnings
- "Create Load" final action

---

## 6. Summary: What to Use Where

| Entity | Recommended Pattern | Reasoning |
|--------|-------------------|-----------|
| Driver | **Tier 1** — Standard dialog | 4 fields, quick, frequent |
| Vehicle | **Tier 2** — Expanded dialog | 8 fields, benefits from 2-col layout |
| Load | **Tier 3** — Full-screen | Dynamic stops, multi-section, significant action |
| Customer | **Tier 1** — Standard dialog | 4 fields, quick, frequent |
| Invite User | **Tier 1** — Standard dialog | 4 fields, straightforward |
| Invite Driver | **Tier 1** — Standard dialog | 1-2 fields, very simple |
| Invite Customer | **Tier 1** — Standard dialog | 3 fields, quick |
| Integration | **Tier 2** — Expanded dialog | Config-heavy but single-screen |
| API Key | **Tier 2** — Expanded dialog | Permissions grid needs space |
| Tenant Details | **Tier 2** — Expanded dialog with tabs | Already uses `max-w-3xl` (correct) |
| Route Planning | **Dedicated page** | Already correct — it IS the primary workflow |

### The Rule of Thumb

> **"Would the user benefit from forgetting the page behind them?"**
> - **Yes** → Full-screen dialog (Load creation: the Kanban behind is irrelevant)
> - **No** → Standard or expanded dialog (Adding a driver: the fleet list provides context)

---

## 7. Future Considerations

As SALLY grows, watch for these signals that a dialog should upgrade:

1. **Form gets > 12 fields** → Consider full-screen or multi-step
2. **Sub-entities appear** (like stops on loads) → Full-screen with sections
3. **Map/visual component needed** → Full-screen (more real estate)
4. **Users frequently abandon the form** → Maybe it's too cramped, needs more space
5. **Mobile complaints about scrolling** → Already full-screen on mobile, may need step-by-step on desktop too

---

*This document is a UX brainstorming output. Discuss with the team before implementing changes.*

# AI Context for SALLY Project

## Documentation Organization (Updated: January 23, 2026)

### Root Directory (/)
**Purpose:** Essential getting started guides only
- **README.md** - Project overview and quick start
- **QUICKSTART.md** - 5-minute setup guide with route planning examples
- **DOCUMENTATION.md** - Complete documentation navigation guide

### Product Specifications (.specs/)
**Purpose:** Product specs, vision, planning, and implementation documents

**Core Documents:**
- **README.md** - Specifications index and guide
- **blueprint.md** - Product vision, strategy, roadmap
- **ROUTE_PLANNING_SPEC.md** - Complete technical specification
- **INTELLIGENT_OPTIMIZATION_FORMULA.md** - REST optimization component algorithm
- **archive/** - Historical documents from earlier iterations

**Key Rule:** All product planning documents, feature specs, and vision documents go here.

### Technical Documentation (.docs/)
**Purpose:** Architecture diagrams, technical references, setup/deployment guides

**Structure:**
- **INDEX.md** - Architecture documentation index
- **SETUP.md** - Detailed setup instructions
- **DEPLOY.md** - Deployment guide (Docker, Vercel, CapRover)
- **C4_MODEL_SUMMARY.md** - C4 model overview
- **QUICK_REFERENCE.md** - Quick reference guide
- **DARK_THEME_IMPLEMENTATION.md** - Dark theme guidelines and checklist
- **architecture/** - C4 diagrams, sequence diagrams, deployment diagrams

**Key Rule:** All technical docs, architecture diagrams, and operational guides go here.

---

## CRITICAL: UI Development Standards (MUST FOLLOW)

### Dark Theme Support (NON-NEGOTIABLE)
**ALL UI components, pages, and future development MUST support dark theme.**

#### Required Color Usage
1. **Backgrounds**
   - ❌ NEVER: `bg-white`, `bg-gray-50` (standalone)
   - ✅ ALWAYS: `bg-background`, `bg-card`, `bg-gray-50 dark:bg-gray-900`

2. **Text Colors**
   - ❌ NEVER: `text-gray-900`, `text-gray-600`, `text-gray-500` (standalone)
   - ✅ ALWAYS: `text-foreground`, `text-muted-foreground`

3. **Borders**
   - ❌ NEVER: `border-gray-200`, `border-gray-300` (standalone)
   - ✅ ALWAYS: `border-border`

4. **Interactive States**
   - ❌ NEVER: `hover:bg-gray-100` (standalone)
   - ✅ ALWAYS: `hover:bg-gray-100 dark:hover:bg-gray-800`

5. **Inverted Elements**
   - For black backgrounds that should invert: `bg-black dark:bg-white text-white dark:text-black`

6. **Progress Bars**
   - Track: `bg-gray-200 dark:bg-gray-800`
   - Fill: `bg-foreground` or `bg-black dark:bg-white`

#### Color Palette Restriction
- ✅ **ONLY** use: Black, White, and Gray shades
- ✅ Status indicators (red, yellow, green, blue) allowed with dark variants
- ❌ **NO** other colors in UI

### Responsive Design (NON-NEGOTIABLE)
**ALL UI components MUST be fully responsive across all breakpoints.**

#### Required Breakpoints
- `sm`: 640px - Small devices
- `md`: 768px - Medium devices (sidebar visibility toggle)
- `lg`: 1024px - Large devices
- `xl`: 1280px - Extra large devices

#### Responsive Patterns
1. **Mobile-First**: Always start with mobile layout, then add larger breakpoint variants
2. **Sidebar**: `hidden md:block` for desktop sidebar, overlay for mobile
3. **Spacing**: `px-4 md:px-6 lg:px-8` (progressive spacing)
4. **Typography**: `text-sm md:text-base lg:text-lg` (progressive sizing)
5. **Grid Layouts**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

#### Testing Requirement
- ✅ Test ALL new UI at: 375px (mobile), 768px (tablet), 1440px (desktop)
- ✅ Test in BOTH light and dark themes
- ✅ Verify touch targets (min 44x44px on mobile)

### Shadcn UI Component Usage (NON-NEGOTIABLE)
**ALWAYS use Shadcn UI components instead of plain HTML elements.**

#### Required Component Mapping

1. **Buttons**
   - ❌ NEVER: `<button>` (plain HTML)
   - ✅ ALWAYS: `<Button>` from `@/components/ui/button`
   - Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
   - Sizes: `default`, `sm`, `lg`, `icon`

2. **Input Fields**
   - ❌ NEVER: `<input>`, `<textarea>` (plain HTML)
   - ✅ ALWAYS: `<Input>`, `<Textarea>` from `@/components/ui/input`, `@/components/ui/textarea`

3. **Cards**
   - ❌ NEVER: `<div className="border rounded-lg p-4">` (manual card styling)
   - ✅ ALWAYS: `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>` from `@/components/ui/card`

4. **Dialogs/Modals**
   - ❌ NEVER: Custom modal implementations
   - ✅ ALWAYS: `<Dialog>`, `<DialogTrigger>`, `<DialogContent>` from `@/components/ui/dialog`

5. **Dropdowns/Select**
   - ❌ NEVER: `<select>` (plain HTML)
   - ✅ ALWAYS: `<Select>`, `<SelectTrigger>`, `<SelectContent>` from `@/components/ui/select`

6. **Labels**
   - ❌ NEVER: `<label>` (plain HTML)
   - ✅ ALWAYS: `<Label>` from `@/components/ui/label`

7. **Tabs**
   - ❌ NEVER: Custom tab implementations
   - ✅ ALWAYS: `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` from `@/components/ui/tabs`

8. **Badges**
   - ❌ NEVER: `<span className="px-2 py-1 rounded-full bg-gray-200">`
   - ✅ ALWAYS: `<Badge>` from `@/components/ui/badge`

9. **Alerts**
   - ❌ NEVER: Custom alert divs
   - ✅ ALWAYS: `<Alert>`, `<AlertTitle>`, `<AlertDescription>` from `@/components/ui/alert`

10. **Tables**
    - ❌ NEVER: `<table>`, `<tr>`, `<td>` (plain HTML)
    - ✅ ALWAYS: `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableCell>` from `@/components/ui/table`

11. **Tooltips**
    - ❌ NEVER: Custom tooltip implementations
    - ✅ ALWAYS: `<Tooltip>`, `<TooltipTrigger>`, `<TooltipContent>` from `@/components/ui/tooltip`

12. **Popover**
    - ❌ NEVER: Custom popover implementations
    - ✅ ALWAYS: `<Popover>`, `<PopoverTrigger>`, `<PopoverContent>` from `@/components/ui/popover`

#### Component Installation
When a needed component doesn't exist, install it using:
```bash
npx shadcn@latest add [component-name]
```

Available components: button, input, card, dialog, select, label, tabs, badge, alert, table, tooltip, popover, dropdown-menu, sheet, separator, scroll-area, skeleton, toast, avatar, checkbox, radio-group, slider, switch, progress, accordion, command, calendar, form, and more.

#### Example: Correct vs Incorrect

**❌ INCORRECT:**
```tsx
<button className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md">
  Plan Route
</button>
```

**✅ CORRECT:**
```tsx
import { Button } from "@/components/ui/button"

<Button>Plan Route</Button>
```

**❌ INCORRECT:**
```tsx
<div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
  <h3 className="font-semibold mb-2">Route Details</h3>
  <p>Content here</p>
</div>
```

**✅ CORRECT:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Route Details</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content here</p>
  </CardContent>
</Card>
```

### Code Review Checklist
Before committing any UI code, verify:
- [ ] **ALL interactive elements use Shadcn components** (Button, Input, Select, etc.)
- [ ] **NO plain HTML elements** (`<button>`, `<input>`, `<select>`, etc.) for UI components
- [ ] No hardcoded `bg-white`, `text-gray-900`, `border-gray-200` without dark variants
- [ ] All semantic color tokens used (`bg-background`, `text-foreground`, etc.)
- [ ] Dark mode variants added where needed (`dark:bg-gray-900`, `dark:text-gray-300`)
- [ ] Responsive classes present for all breakpoints
- [ ] Tested in both light and dark themes
- [ ] Tested on mobile, tablet, and desktop screen sizes
- [ ] Only black, white, and gray colors used (except status indicators)
- [ ] Hover/focus states work in both themes

### Quick Reference: Semantic Color Tokens

```tsx
// Backgrounds
bg-background        // Main page background
bg-card             // Card/panel backgrounds
bg-accent           // Subtle accent background
bg-muted            // Muted background

// Text
text-foreground          // Primary text
text-muted-foreground    // Secondary/helper text
text-accent-foreground   // Accent text

// Borders
border-border       // Standard borders
border-input        // Input borders

// Interactive
bg-primary text-primary-foreground  // Primary buttons
bg-secondary text-secondary-foreground  // Secondary buttons
```

### Reference Documentation
See `.docs/DARK_THEME_IMPLEMENTATION.md` for complete implementation details.

---

## Product Framing (CRITICAL)

### Primary Product
**SALLY is a Dispatch & Driver Coordination Platform**

Core capabilities:
1. Route planning with stop sequence optimization (TSP/VRP)
2. Automatic rest stop insertion (where HOS requires)
3. Automatic fuel stop insertion (based on range and price)
4. HOS compliance validation (zero violations)
5. Dynamic route updates (14 trigger types monitored 24/7)
6. Continuous monitoring (proactive + reactive)
7. **Automated dispatcher alerts** (driver not moving, HOS approaching, dock delays)
8. **Dual user interfaces** (dispatcher dashboard + driver view)
9. **Mock external API integrations** (Samsara HOS, fuel prices, weather, TMS)

### REST Optimization is a COMPONENT
**Not the primary product, but a critical component**

- Called by the route planner when HOS simulation detects shortfall
- Analyzes whether to insert rest stop or leverage dock time
- Recommends rest type: FULL_REST (10h), PARTIAL_REST (7h), NO_REST
- Provides audit-ready reasoning for compliance

### Correct Language

**CORRECT:**
- "SALLY is a dispatch & driver coordination platform"
- "The platform generates optimized routes and alerts dispatchers when intervention is needed"
- "REST optimization is called by the route planner"
- "The system automatically inserts rest stops where needed"
- "Dispatchers receive proactive alerts for HOS violations, delays, and other events"
- "Primary endpoints: /api/v1/routes/plan, /api/v1/routes/update, /api/v1/alerts"

**INCORRECT:**
- "SALLY is a rest optimization system" (too narrow)
- "SALLY is only for route planning" (missing dispatcher coordination aspect)
- "REST optimization is the main product" (it's a component)
- "The system optimizes rest at dock" (too narrow - it's end-to-end planning)
- "Primary endpoint: /api/v1/optimization/recommend" (this is a component endpoint)

---

## Key Principles

1. **Product specs and plans** → `.specs/` directory
2. **Technical docs and architecture** → `.docs/` directory
3. **Essential getting started guides** → Root directory (README, QUICKSTART, DOCUMENTATION only)
4. **Always maintain index files** (README.md, INDEX.md) when adding new docs
5. **Cross-reference related documents** for easy navigation
6. **Frame SALLY as route planning platform** with REST optimization as component
7. **ALL UI MUST support dark theme and responsive design** (see UI Development Standards above)

---

## Architecture Overview

### Three-Layer System

**Layer 1: Route Planning Engine** (Primary)
- TSP optimization (stop sequence)
- HOS simulation (segment-by-segment)
- Rest stop insertion (calls REST Engine)
- Fuel stop insertion
- Feasibility validation

**Layer 2: Continuous Monitoring Service**
- 14 trigger types across 5 categories
- Runs every 60 seconds per active route
- Proactive HOS monitoring
- Reactive violation handling
- **Alert Engine** (generates dispatcher notifications)

**Layer 3: Dynamic Update Handler**
- Receives triggers from Layer 2
- Decides: Re-plan vs ETA update
- Invokes Layer 1 for new route
- Notifies driver of changes

### REST Optimization Integration

```
Route Planner (simulating segment)
    ↓
Detects: hours_remaining < hours_needed
    ↓
Calls: REST Optimization Engine
    ↓
Returns: Recommendation (rest type, duration, reasoning)
    ↓
Route Planner: Inserts rest segment
```

---

## Technology Stack

**Backend:**
- Python 3.11+, FastAPI (async)
- PostgreSQL 16, Redis 7
- SQLAlchemy 2.0 (async), Pydantic v2
- UV package manager

**Frontend:**
- Next.js 15 (App Router), TypeScript
- Zustand + React Query
- Tailwind CSS + Shadcn/ui
- next-themes (dark mode support)
- Turborepo (monorepo)

**Infrastructure:**
- Docker + Docker Compose
- AWS (Phase 2 deployment)

---

## API Endpoints (Priority Order)

### Primary Endpoints (Route Planning)
1. `POST /api/v1/routes/plan` - Plan complete route
2. `POST /api/v1/routes/update` - Update route with triggers
3. `GET /api/v1/routes/{plan_id}` - Get route status
4. `GET /api/v1/routes/{plan_id}/monitoring` - Get monitoring status

### Alert Endpoints (Dispatcher Notifications)
5. `GET /api/v1/alerts` - List active alerts
6. `POST /api/v1/alerts/{alert_id}/acknowledge` - Acknowledge alert
7. `POST /api/v1/alerts/{alert_id}/resolve` - Resolve alert

### Mock External API Endpoints (POC)
8. `GET /api/v1/external/hos/{driver_id}` - Mock Samsara HOS data
9. `GET /api/v1/external/fuel-prices` - Mock fuel prices
10. `GET /api/v1/external/weather` - Mock weather data

### Component Endpoints (Called by Route Planner)
11. `POST /api/v1/hos/validate` - HOS compliance check
12. `POST /api/v1/rest/recommend` - REST optimization
13. `POST /api/v1/fuel/find-stops` - Fuel stop finding

---

## Documentation Best Practices

### When Writing New Docs

1. **Identify audience** (PM, Developer, DevOps, Executive)
2. **Choose location** (.specs/ for product, .docs/ for technical, root for essential)
3. **Estimate reading time** (helps users prioritize)
4. **Frame correctly** (route planning platform, not REST system)
5. **Update index files** (README.md, .specs/README.md, .docs/INDEX.md, DOCUMENTATION.md)
6. **Cross-reference** related documents
7. **Use examples** for complex concepts

### When Reviewing Docs

Check for:
- [ ] Correct framing (route planning primary, REST component)
- [ ] Accurate audience identification
- [ ] Proper location (.specs/ vs .docs/ vs root)
- [ ] Updated index files
- [ ] Working links
- [ ] Code examples tested
- [ ] Diagrams up-to-date

---

## Last Updated
January 29, 2026 - Added mandatory Shadcn UI component usage requirement to UI development standards

## Maintained By
SALLY Product & Engineering Team

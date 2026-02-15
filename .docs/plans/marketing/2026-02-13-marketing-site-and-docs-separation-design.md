# Marketing Site Evolution & Docs Separation Design

**Date:** 2026-02-13
**Status:** Approved
**Scope:** Two workstreams — marketing site navigation/pages + docs site public/internal separation

---

## Context

The SALLY marketing site is currently a single experiential landing page ("Sally Nerve") with no navigation beyond Login/Register. The developer docs site (Nextra, port 3001) mixes internal engineering docs with external partner-facing API documentation. We need to evolve both to serve prospective clients properly.

## Goals

1. Add structured navigation to the marketing site: Home, Product, Developers, Pricing
2. Create Product and Pricing pages for prospective clients
3. Separate internal engineering docs from partner-facing API docs using build-time env var
4. Connect the marketing site and docs site with cross-links
5. Deploy-ready for Vercel (both apps as separate Vercel projects)

---

## Workstream 1: Marketing Site Navigation & Pages

### 1.1 Navigation Update (PublicLayout.tsx)

**Current state:** SALLY logo, tagline, ThemeToggle, Login/Register buttons. No page navigation.

**New state:** Add navigation links between logo and auth buttons.

**Desktop (md+):**
```
[SALLY | tagline]  [Home] [Product] [Developers↗] [Pricing]  [ThemeToggle] [Register] [Login]
```

**Mobile:** Nav links added to mobile dropdown menu above auth buttons.

**Implementation:**
- Define nav items array in `PublicLayout.tsx`:
  ```ts
  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Product', href: '/product' },
    { label: 'Developers', href: process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3001', external: true },
    { label: 'Pricing', href: '/pricing' },
  ]
  ```
- Internal links use Next.js `<Link>`, "Developers" uses `<a>` for same-tab navigation to docs site
- Active state: `text-foreground font-medium` for current page, `text-muted-foreground` for others
- Add `NEXT_PUBLIC_DOCS_URL` env var (defaults to `http://localhost:3001` in dev)

### 1.2 Product Page (`/product`)

**File:** `apps/web/src/app/product/page.tsx`

**Layout:** Clean sections with subtle Framer Motion `whileInView` fade-in animations. Conventional (not narrative like Sally Nerve).

**Sections:**

1. **Hero**
   - Headline: "Your Fleet's Operating System"
   - Subtitle: One line about SALLY managing routes, compliance, and alerts
   - Primary CTA: "Request Demo" (mailto or future form)
   - Secondary CTA: "View API Docs" (links to docs site)

2. **Capabilities Grid** — 6 cards (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
   - Route Planning — TSP/VRP optimization for optimal stop sequence
   - HOS Compliance — Zero-violation guarantee with segment-by-segment validation
   - Fuel Optimization — Price-aware fueling with range-based stop insertion
   - Real-time Monitoring — 24/7 monitoring with 14 trigger types
   - Dispatcher Alerts — Proactive notifications when intervention is needed
   - Driver Experience — Mobile-first app for drivers on the road

3. **How It Works** — 3-step horizontal flow
   - Plan → Monitor → Alert
   - Simple icons with brief descriptions
   - Responsive: horizontal on desktop, vertical on mobile

4. **Integration Section**
   - "Connects to your stack"
   - Integration types: ELD (Samsara), TMS, Fuel APIs, Weather
   - CTA linking to docs site API guides

5. **Bottom CTA**
   - "Ready to give your fleet a nervous system?"
   - Request Demo button

**Components:** All Shadcn (`Card`, `Button`, `Badge`). Dark theme compliant. Black/white/gray only.

### 1.3 Pricing Page (`/pricing`)

**File:** `apps/web/src/app/pricing/page.tsx`

**Layout:** Centered, minimal. No animations needed.

**Content:**
1. Headline: "Pricing"
2. Subtitle: "We're building something special for fleets of every size."
3. Centered `Card`:
   - "Pricing plans coming soon"
   - "SALLY is currently in early access. We'd love to understand your fleet and build the right plan for you."
   - Primary CTA: "Request a Demo" (Button)
   - Secondary CTA: "Talk to Sales" (Button variant="outline")
4. Footer note: "Already have access? Login" (subtle link)

---

## Workstream 2: Docs Site Public/Internal Separation

### 2.1 Build-Time Separation via `DOCS_MODE` Environment Variable

**Mechanism:** Environment variable controls what gets built.

| `DOCS_MODE` | Context | What's visible |
|---|---|---|
| `internal` (default) | Local development | All pages — API docs + Developer Guide + Architecture + Contributing |
| `public` | Production/Vercel | API docs only — Getting Started, API Guides, API Reference, API Playground, Product, Resources, Blog |

**Sections hidden in `public` mode:**
- `developer-guide/` (all pages including Architecture, ADRs, Backend, Frontend)
- `contributing/` (all pages)

**Sections always visible:**
- `getting-started/`
- `api-guides/`
- `api-reference/`
- `api-playground`
- `product/`
- `resources/`
- `blog/`

### 2.2 Implementation Details

**`pages/_meta.ts`:**
```ts
const isPublic = process.env.DOCS_MODE === 'public'

const meta: Record<string, any> = {
  "index": { "title": "Home", "type": "page", "display": "hidden" },
  "product": { "title": "Product", "type": "page" },
  "getting-started": { "title": "Getting Started", "type": "page" },
  "api-guides": { "title": "API Guides", "type": "page" },
  "api-reference": { "title": "API Reference", "type": "page" },
  "api-playground": { "title": "API Playground", "type": "page" },
  ...(!isPublic && {
    "developer-guide": { "title": "Developer Guide", "type": "page" },
    "contributing": { "title": "Contributing", "type": "page" },
  }),
  "resources": { "title": "Resources", "type": "page" },
  "blog": { "title": "Blog", "type": "page" },
}

export default meta
```

**`next.config.mjs`:**
- In `public` mode, use `pageExtensions` or Webpack `IgnorePlugin` to exclude `developer-guide/` and `contributing/` directories from the build entirely
- Alternatively, use `redirects` to 404 any request to those paths in public mode

**`pages/index.mdx` → `pages/index.tsx`:**
- Convert to TSX component for conditional rendering
- In `public` mode: hide "For Developers" card, "Developer Setup" hero button, "Built with" tech stack bar
- In `internal` mode: show everything as-is

**`.env.local` (dev default):**
```
DOCS_MODE=internal
```

**Vercel environment (production):**
```
DOCS_MODE=public
```

### 2.3 Docs Site Header Updates

**"Back to SALLY" link:**
- Add to `theme.config.tsx` via `navbar.extraContent`
- Links to `NEXT_PUBLIC_APP_URL` (e.g., `https://sally.app` in prod, `http://localhost:3000` in dev)
- Styled as a subtle link or small Button

**Env vars for docs app:**
```
NEXT_PUBLIC_APP_URL=http://localhost:3000  # dev default
DOCS_MODE=internal                          # dev default
```

### 2.4 Homepage Conditional Content

| Element | `internal` mode | `public` mode |
|---|---|---|
| Hero "Get API Access" button | ✅ | ✅ |
| Hero "Developer Setup" button | ✅ | ❌ |
| "For API Consumers" card | ✅ | ✅ |
| "For Developers" card | ✅ | ❌ |
| "What is SALLY?" section | ✅ | ✅ |
| Core Features grid | ✅ | ✅ |
| "Built with" tech stack bar | ✅ | ❌ |

---

## Vercel Deployment Architecture

```
Marketing Site (sally.app)           Docs Site (developers.sally.app)
├── Vercel Project: sally-web        ├── Vercel Project: sally-docs
├── NEXT_PUBLIC_DOCS_URL=            ├── NEXT_PUBLIC_APP_URL=
│   https://developers.sally.app     │   https://sally.app
├── Port: 3000                       ├── DOCS_MODE=public
└── Routes:                          └── Pages:
    /          → Landing (Sally Nerve)    /getting-started/*
    /product   → Product page             /api-guides/*
    /pricing   → Pricing page             /api-reference/*
    /login     → Auth                     /api-playground
    /register  → Auth                     /product/*
    /dispatcher/* → App                   /resources/*
    /driver/*     → App                   /blog/*
    ...
```

**Cross-links:**
- Marketing "Developers" nav → `NEXT_PUBLIC_DOCS_URL`
- Docs "Back to SALLY" → `NEXT_PUBLIC_APP_URL`
- Product page "View API Docs" → `NEXT_PUBLIC_DOCS_URL`
- Pricing page CTAs → mailto (for now)

---

## Files Changed Summary

### Marketing Site (apps/web)
| File | Change |
|---|---|
| `src/shared/components/layout/PublicLayout.tsx` | Add nav links (Home, Product, Developers, Pricing) |
| `src/app/product/page.tsx` | **New** — Product feature showcase page |
| `src/app/pricing/page.tsx` | **New** — Pricing coming soon page |
| `.env.local` | Add `NEXT_PUBLIC_DOCS_URL` |

### Docs Site (apps/docs)
| File | Change |
|---|---|
| `pages/_meta.ts` | Conditional sections based on `DOCS_MODE` |
| `pages/index.mdx` → `pages/index.tsx` | Conditional homepage content |
| `next.config.mjs` | Exclude internal pages in public build |
| `theme.config.tsx` | Add "Back to SALLY" link in navbar |
| `.env.local` | Add `DOCS_MODE=internal`, `NEXT_PUBLIC_APP_URL` |

---

## Design Decisions

1. **Build-time separation over runtime auth** — Internal docs are for SALLY engineering team, not tenant users. Firebase auth is for tenants. Build-time env var is cleaner, more secure (pages don't exist in public build), and zero runtime overhead.
2. **Same-tab navigation for Developers link** — Partners click "Developers" and land on the docs site. "Back to SALLY" link returns them. Simple, no new tabs.
3. **Conventional layout for Product/Pricing** — The Sally Nerve landing page is experiential/narrative. Product and Pricing pages are informational — conventional layouts with subtle animations are more appropriate for scannable content.
4. **Pricing as "Coming Soon"** — Gets the page in the nav without committing to pricing tiers. Easy to update later.
5. **Two Vercel projects** — Marketing site and docs site are separate Next.js apps in the monorepo. Separate Vercel projects with separate env vars is the standard monorepo deployment pattern.

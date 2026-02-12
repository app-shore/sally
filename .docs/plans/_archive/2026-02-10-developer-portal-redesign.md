# SALLY Developer Portal — Complete Redesign Plan

**Date:** February 10, 2026
**Type:** Production-quality developer documentation redesign
**Target:** Single Nextra site (`apps/docs/`) with two audience tracks (External API + Internal Developer)
**Quality bar:** Stripe / Vercel / Twilio-level developer documentation

---

## 1. The Vision

Transform the existing Nextra docs site from a partial API reference into a **comprehensive developer portal** that serves two audiences from one unified site:

1. **External / Partner developers** — Integrating SALLY's API into their systems (TMS, ELD, fleet tools)
2. **Internal / New hire developers** — Onboarding to contribute to the SALLY codebase

The site should answer the question: *"I just joined / just got API access — what do I need to know to be productive in one day?"*

### Dual-Platform Strategy

| Platform | Role | Content |
|----------|------|---------|
| **Nextra (`apps/docs/`)** | Source of truth | All documentation — both external API docs and internal developer docs |
| **ReadMe.io (`sally-pagz.readme.io`)** | External-facing mirror | External API docs mirrored from Nextra content. Being evaluated as potential future primary platform. |

**Workflow:** Build and maintain all content in Nextra (versioned with code). Mirror external-facing content to ReadMe.io for evaluation. If ReadMe.io becomes primary, use `rdme` CLI to sync content from the repo automatically.

**Why this approach:**
- Content stays in sync with code (one PR updates code + docs)
- No vendor lock-in — ReadMe.io is being evaluated, not committed to
- Internal developer docs (architecture, contributing) stay close to the codebase
- External docs get the polished ReadMe.io experience for partner evaluation

---

## 2. Information Architecture

### Current State (What Exists)
```
📘 Getting Started (5 pages — 3 have content, 2 placeholder)
📖 Guides (14 pages — 1 has content, 13 placeholder)
📡 API Reference (2 pages — both have content)
🎮 API Playground (1 page — working Scalar integration)
📝 Blog (2 pages — 1 has content)
🔧 Resources (4 pages — all placeholder)
```

### Proposed Architecture
```
HOME                          ← Redesigned landing with dual-track entry points

── PLATFORM ──────────────────────────────────────────────────
📘 Getting Started            ← External API consumers (enhanced)
   ├── Introduction           ✏️ UPDATE (fix outdated refs, add product context)
   ├── Quickstart             ✏️ UPDATE (verify endpoints match current backend)
   ├── Authentication         ✅ KEEP (already good)
   ├── API Keys               📝 NEW (currently placeholder)
   └── Your First Route       📝 NEW (currently placeholder — end-to-end tutorial)

📖 API Guides                 ← Renamed, restructured for external devs
   ├── Overview               📝 NEW (guide map + audience routing)
   ├── Route Planning
   │   ├── HOS Compliance     ✅ KEEP (excellent 1017-line guide)
   │   ├── Creating Routes    📝 NEW (request/response walkthrough)
   │   ├── Stop Optimization  📝 NEW
   │   ├── Rest Stops         📝 NEW
   │   ├── Fuel Stops         📝 NEW
   │   └── Route Updates      📝 NEW (dynamic updates + triggers)
   ├── Fleet Management       📝 NEW SECTION
   │   ├── Drivers            📝 NEW (CRUD + lifecycle + HOS)
   │   ├── Vehicles           📝 NEW (CRUD + assignment)
   │   └── Loads              📝 NEW (CRUD + status flow)
   ├── Alerts & Monitoring    📝 NEW SECTION (replaces "Monitoring")
   │   ├── Overview           📝 NEW (alert lifecycle diagram)
   │   ├── Alert Types        📝 NEW (all categories with examples)
   │   ├── Real-time Events   📝 NEW (SSE + WebSocket)
   │   └── Alert Management   📝 NEW (acknowledge, resolve, snooze, notes)
   ├── Integrations           📝 NEW SECTION (replaces "Integration")
   │   ├── Overview           📝 NEW (vendor registry, adapter pattern)
   │   ├── ELD / Samsara      📝 NEW (HOS data sync)
   │   ├── TMS Integration    📝 NEW (McLeod, Project44)
   │   ├── Webhooks           📝 NEW (event notifications)
   │   └── Error Handling     📝 NEW (retry, rate limits, error codes)
   └── Multi-tenancy          📝 NEW SECTION
       ├── Tenant Setup       📝 NEW
       └── User Roles         📝 NEW (RBAC: SUPER_ADMIN, ADMIN, OWNER, DISPATCHER, DRIVER)

📡 API Reference              ← Enhanced
   ├── Overview               ✏️ UPDATE (add response format conventions, pagination, errors)
   ├── Authentication         ✅ KEEP
   └── Error Codes            📝 NEW (standard error response format)

🎮 API Playground             ✅ KEEP (Scalar — already working)

── DEVELOPERS ────────────────────────────────────────────────
🏗️ Architecture               📝 NEW TOP-LEVEL SECTION
   ├── System Overview        📝 NEW (C4 Level 1 — context diagram rendered as image)
   ├── Container Diagram      📝 NEW (C4 Level 2 — tech stack overview)
   ├── Backend Architecture   📝 NEW (C4 Level 3 — domain modules, services)
   ├── Frontend Architecture  📝 NEW (C4 Level 3 — feature modules, pages)
   ├── Database Schema        📝 NEW (ER diagram, table descriptions, key relationships)
   ├── Data Flow              📝 NEW (request lifecycle, event flow)
   └── ADRs                   📝 NEW (Architecture Decision Records)
       ├── ADR-001: Monorepo with Turborepo
       ├── ADR-002: NestJS over Express
       ├── ADR-003: Firebase Auth + JWT
       ├── ADR-004: Multi-tenant with Row-Level Isolation
       ├── ADR-005: Domain-Driven Module Structure
       └── ADR-006: Shadcn UI + Dark Theme First

🛠️ Developer Guide            📝 NEW TOP-LEVEL SECTION
   ├── Environment Setup      📝 NEW (prerequisites, clone, Docker, manual setup)
   ├── Project Structure      📝 NEW (monorepo map, where things live)
   ├── Backend Development
   │   ├── Module Structure   📝 NEW (NestJS modules, controllers, services pattern)
   │   ├── Database & Prisma  📝 NEW (schema changes, migrations, seeding)
   │   ├── Adding an Endpoint 📝 NEW (step-by-step tutorial)
   │   └── Testing            📝 NEW (unit, integration, e2e patterns)
   ├── Frontend Development
   │   ├── App Router Guide   📝 NEW (pages, layouts, route groups)
   │   ├── Feature Modules    📝 NEW (feature structure, hooks, stores)
   │   ├── UI Standards       📝 NEW (Shadcn components, dark theme, responsive)
   │   └── State Management   📝 NEW (Zustand stores, React Query patterns)
   ├── Shared Packages        📝 NEW (shared-types, how to add shared code)
   └── Common Tasks           📝 NEW (add a page, add an API, add a DB table, etc.)

📋 Contributing               📝 NEW TOP-LEVEL SECTION
   ├── Code Standards         📝 NEW (naming, file structure, imports)
   ├── Git Workflow           📝 NEW (branching, commits, PR process)
   ├── Pull Request Guide     📝 NEW (template, review checklist)
   └── Code Review Standards  📝 NEW (what reviewers look for)

── RESOURCES ─────────────────────────────────────────────────
📝 Blog                       ✅ KEEP
   ├── Index                  ✅ KEEP
   └── Introducing SALLY      ✅ KEEP

🔧 Resources                  ← Enhanced
   ├── Support                ✏️ UPDATE
   ├── FAQ                    📝 NEW (real FAQs from common issues)
   ├── Glossary               📝 NEW (HOS, ELD, TMS, FMCSA, etc. — essential for trucking domain)
   └── Changelog              📝 NEW (version history)
```

### Summary
| Status | Count | Description |
|--------|-------|-------------|
| ✅ KEEP | 7 | Already good, no changes needed |
| ✏️ UPDATE | 4 | Existing content needs fixes/enhancements |
| 📝 NEW | ~45 | New pages to create |
| 🗑️ REMOVE | 0 | Nothing removed, only restructured |

---

## 3. Homepage Redesign

The homepage needs dual-track entry points. Current homepage is API-consumer-only.

### New Homepage Structure

```
┌─────────────────────────────────────────────────────┐
│  SALLY Developer Portal                              │
│  Build on the intelligent fleet operations platform  │
│                                                      │
│  [Get API Access]    [Developer Setup]               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─── For API Consumers ───┐  ┌── For Developers ──┐│
│  │ Integrate SALLY into    │  │ Contribute to the   ││
│  │ your fleet tools.       │  │ SALLY platform.     ││
│  │                         │  │                     ││
│  │ → Quickstart (5 min)    │  │ → Environment Setup ││
│  │ → API Reference         │  │ → Architecture      ││
│  │ → API Playground        │  │ → Contributing      ││
│  └─────────────────────────┘  └─────────────────────┘│
│                                                      │
│  ┌── Product Overview ──────────────────────────────┐│
│  │ What is SALLY? The coordination gap in trucking. ││
│  │ → Read the vision                                ││
│  └──────────────────────────────────────────────────┘│
│                                                      │
│  Core Capabilities (6 feature cards — existing)      │
│                                                      │
│  Tech Stack:  NestJS · Next.js · PostgreSQL · Redis  │
└─────────────────────────────────────────────────────┘
```

---

## 4. Key Content Pieces (Priority Order)

### P0 — Must Have (Developer Onboarding Critical Path)

These are the pages a new developer reads on Day 1:

1. **Homepage redesign** — Dual-track entry
2. **Architecture > System Overview** — C4 Level 1+2, "what are we building"
3. **Developer Guide > Environment Setup** — Clone to running in 15 minutes
4. **Developer Guide > Project Structure** — Monorepo map with purpose of each directory
5. **Architecture > Database Schema** — Entity relationships, what tables exist and why
6. **Developer Guide > Backend Development > Module Structure** — How NestJS code is organized
7. **Developer Guide > Frontend Development > App Router Guide** — Where pages live, route groups
8. **Contributing > Git Workflow** — How to make a PR

### P1 — Important (Week 1 Reading)

9. **Architecture > Backend Architecture** — C4 Level 3, domain modules
10. **Architecture > Frontend Architecture** — C4 Level 3, feature modules
11. **Developer Guide > Backend > Database & Prisma** — Migrations, seeding
12. **Developer Guide > Backend > Adding an Endpoint** — Step-by-step tutorial
13. **Developer Guide > Frontend > UI Standards** — Shadcn, dark theme, responsive (from CLAUDE.md)
14. **Developer Guide > Frontend > Feature Modules** — Feature folder conventions
15. **Contributing > Code Standards** — Naming, imports, patterns
16. **Contributing > PR Guide** — Template, checklist
17. **Resources > Glossary** — Trucking domain terminology

### P2 — Important (External API Guides)

18. **Getting Started > API Keys** — Complete the placeholder
19. **Getting Started > Your First Route** — End-to-end tutorial
20. **API Guides > Fleet Management** — Drivers, vehicles, loads
21. **API Guides > Alerts & Monitoring** — Full section
22. **API Guides > Integrations** — ELD, TMS, webhooks
23. **API Reference > Error Codes** — Standard error format
24. **API Guides > Multi-tenancy** — Tenant setup, roles

### P3 — Nice to Have

25. **Architecture > ADRs** — Decision records
26. **Architecture > Data Flow** — Request lifecycle
27. **Developer Guide > Common Tasks** — Quick recipes
28. **Developer Guide > Shared Packages** — shared-types usage
29. **Resources > FAQ** — Common questions
30. **Resources > Changelog** — Version history

---

## 5. Content Standards (Technical Writing Guidelines)

Every page in this portal must follow these standards:

### Page Structure Template
```markdown
---
title: Clear, Descriptive Title
description: One sentence explaining what this page covers
---

# Title

Brief introduction (2-3 sentences max). What will the reader learn? Why does it matter?

## Prerequisites (if applicable)
- What they need before starting

## Main Content
- Progressive disclosure: simple → complex
- Code examples for every concept
- Diagrams where relationships matter

## Next Steps
- Link to the logical next page
- Link to related deeper dives
```

### Writing Rules
1. **Use second person** ("you") — not "we" or "the developer"
2. **Lead with the outcome** — "To create a route, POST to /api/v1/routes/plan" not "The route creation process involves..."
3. **Show, don't tell** — Every concept gets a code example
4. **Progressive disclosure** — Start simple, add complexity only when needed
5. **Use callouts sparingly** — Warnings for gotchas, info for tips. Not on every page.
6. **No marketing language** — This is a reference, not a sales page
7. **Keep pages focused** — One topic per page. If it's over 500 lines, split it.
8. **Use real data** — Example payloads should look like real trucking data (driver names, stop addresses, realistic HOS hours)
9. **Test every code example** — If you show a curl command, it should work against staging

### Diagram Standards
- Use **Mermaid** for inline diagrams (Nextra supports it natively)
- Render C4 PlantUML diagrams as **PNG/SVG images** and embed them
- Every architecture page should have at least one diagram
- Diagrams should be grayscale/monochrome (matching the design system)

### Component Usage in MDX
- `<Callout type="info|warning|error|success">` for callouts
- Shadcn `Button`, `Card`, `Tabs`, `Badge` for interactive elements
- Code blocks with language tags and filenames: ` ```typescript filename="src/example.ts" `
- Tables for comparison data
- Mermaid blocks for inline diagrams

---

## 6. Outdated Content Audit & Cleanup

### Items to Fix

| Location | Issue | Fix |
|----------|-------|-----|
| CLAUDE.md | References `apps/backend-py` (Python backend) | Remove — backend is NestJS only |
| CLAUDE.md | Lists "Python 3.11+, FastAPI, SQLAlchemy 2.0, UV" as backend tech | Update to NestJS, Prisma, TypeScript |
| CLAUDE.md | API endpoints listed don't match actual routes (missing `/api/v1/` prefix in some, missing many endpoints) | Update to match actual NestJS controllers |
| .docs/specs/blueprint.md | May reference Python implementation | Audit and update |
| .docs/technical/ | Multiple docs may reference Python backend | Audit all, update or archive |
| .docs/plans/ | 71 files, some duplicates with " copy" suffix | Remove duplicates, archive old plans |
| Homepage (index.mdx) | Links to non-existent anchors (`#tag/Routes`) | Fix links to match actual Scalar tags |
| theme.config.tsx | `docsRepositoryBase` points to `apps/.docs` | Fix to point to `apps/docs` |
| Getting Started/Introduction | May reference outdated endpoints or tech | Verify against actual backend |

### Cleanup Tasks
1. Audit CLAUDE.md — remove Python references, update tech stack and endpoints
2. Audit .docs/technical/ — update or archive stale docs
3. Remove duplicate plan files in .docs/plans/
4. Verify all existing Nextra pages against actual API endpoints
5. Update OpenAPI spec (run sync script against current backend)

---

## 7. C4 Architecture Diagrams — Rendering Strategy

The existing PlantUML diagrams in `.docs/technical/architecture/` are comprehensive but need to be rendered and embedded into the Nextra site.

### Approach
1. Render all 9 PlantUML diagrams to SVG using the existing `render-diagrams.sh` script (or PlantUML CLI)
2. Place rendered SVGs in `apps/docs/public/diagrams/`
3. Embed in architecture pages using `<img>` or Next.js `Image`
4. Additionally, create simplified Mermaid versions inline for quick reference (Nextra renders Mermaid natively)

### Diagrams to Embed
| Diagram | Target Page | Notes |
|---------|-------------|-------|
| c4-level1-context.puml | Architecture > System Overview | Big picture: SALLY + external systems |
| c4-level2-container.puml | Architecture > System Overview | Tech stack containers |
| c4-level3-component-backend.puml | Architecture > Backend Architecture | Domain modules |
| c4-level3-component-frontend.puml | Architecture > Frontend Architecture | Feature modules |
| c4-level4-code-hos-engine.puml | API Guides > HOS Compliance | Class-level detail |
| c4-level4-code-optimization-engine.puml | API Guides > Route Planning | Class-level detail |
| sequence-rest-optimization.puml | API Guides > Rest Stops | Flow diagram |
| deployment-diagram.puml | Architecture > System Overview | Infrastructure |
| data-flow-diagram.puml | Architecture > Data Flow | Pipeline |

---

## 8. Navigation & _meta.ts Structure

### Top-level _meta.ts
```typescript
export default {
  "index": {
    "title": "Home",
    "type": "page",
    "display": "hidden"
  },
  // ── Platform (External) ──
  "getting-started": {
    "title": "Getting Started",
    "type": "page"
  },
  "api-guides": {
    "title": "API Guides",
    "type": "page"
  },
  "api-reference": {
    "title": "API Reference",
    "type": "page"
  },
  "api-playground": {
    "title": "API Playground",
    "type": "page"
  },
  // ── Separator ──
  "---": {
    "type": "separator",
    "title": "Developers"
  },
  // ── Developers (Internal) ──
  "architecture": {
    "title": "Architecture",
    "type": "page"
  },
  "developer-guide": {
    "title": "Developer Guide",
    "type": "page"
  },
  "contributing": {
    "title": "Contributing",
    "type": "page"
  },
  // ── Resources ──
  "----": {
    "type": "separator",
    "title": "Resources"
  },
  "blog": {
    "title": "Blog",
    "type": "page"
  },
  "resources": {
    "title": "Resources",
    "type": "page"
  }
}
```

This creates a clear visual separation in the sidebar:
```
Getting Started
API Guides
API Reference
API Playground
─── Developers ───
Architecture
Developer Guide
Contributing
─── Resources ───
Blog
Resources
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Infrastructure + Critical Path)
**Goal:** New developer can go from zero to running in 15 minutes

1. Restructure navigation (`_meta.ts` files at all levels)
2. Redesign homepage with dual-track entry
3. Create Architecture section (System Overview, Container Diagram, Database Schema)
4. Create Developer Guide > Environment Setup
5. Create Developer Guide > Project Structure
6. Fix outdated content in CLAUDE.md (Python refs)
7. Update theme.config.tsx (fix docsRepositoryBase)

### Phase 2: Developer Onboarding (Internal Track)
**Goal:** New developer understands codebase architecture and can make their first PR

8. Architecture > Backend Architecture (C4 Level 3 + domain module map)
9. Architecture > Frontend Architecture (C4 Level 3 + feature module map)
10. Developer Guide > Backend > Module Structure
11. Developer Guide > Backend > Database & Prisma
12. Developer Guide > Backend > Adding an Endpoint (tutorial)
13. Developer Guide > Frontend > App Router Guide
14. Developer Guide > Frontend > UI Standards
15. Developer Guide > Frontend > Feature Modules
16. Contributing > Git Workflow
17. Contributing > Code Standards
18. Contributing > PR Guide

### Phase 3: API Guides (External Track)
**Goal:** External developer can integrate SALLY's API completely

19. Complete Getting Started placeholders (API Keys, First Route)
20. API Guides > Fleet Management (Drivers, Vehicles, Loads)
21. API Guides > Alerts & Monitoring (full section)
22. API Guides > Integrations (ELD, TMS, Webhooks)
23. API Guides > Multi-tenancy
24. API Reference > Error Codes
25. Complete remaining Route Planning guide placeholders

### Phase 4: Polish & Extras
**Goal:** Production-ready documentation portal

26. Resources > Glossary (trucking terminology)
27. Resources > FAQ
28. Resources > Changelog
29. Architecture > ADRs
30. Architecture > Data Flow
31. Developer Guide > Common Tasks
32. Render and embed all C4 diagrams as images
33. Final review pass — verify all code examples, fix broken links

### Phase 5: ReadMe.io Mirror
**Goal:** External-facing docs available on ReadMe.io for evaluation

34. Install `rdme` CLI (`npm install rdme`)
35. Mirror external-facing content to ReadMe.io:
    - Getting Started (all 5 pages)
    - API Guides (all pages)
    - API Reference (all pages)
    - Resources (glossary, FAQ, changelog)
36. Sync OpenAPI spec to ReadMe.io for API Reference auto-generation
37. Configure ReadMe.io categories to match Nextra navigation
38. Verify all content renders correctly on ReadMe.io
39. Document the sync workflow so it can be repeated or automated via CI

---

## 10. Estimated Page Count

| Section | Pages | Status |
|---------|-------|--------|
| Getting Started | 5 | 3 existing, 2 new |
| API Guides | 18 | 1 existing, 17 new |
| API Reference | 3 | 2 existing, 1 new |
| API Playground | 1 | Existing |
| Architecture | 7 + 6 ADRs | All new |
| Developer Guide | 12 | All new |
| Contributing | 4 | All new |
| Blog | 2 | Existing |
| Resources | 4 | All new/rewritten |
| **Total** | **~62** | **~45 new, 7 existing good, 4 updated, ~6 ADRs** |

---

## 11. Files to Create/Modify

### New _meta.ts files needed:
- `pages/_meta.ts` (update)
- `pages/api-guides/_meta.ts` (new — replaces guides/)
- `pages/api-guides/route-planning/_meta.ts` (new)
- `pages/api-guides/fleet-management/_meta.ts` (new)
- `pages/api-guides/alerts-monitoring/_meta.ts` (new)
- `pages/api-guides/integrations/_meta.ts` (new)
- `pages/api-guides/multi-tenancy/_meta.ts` (new)
- `pages/architecture/_meta.ts` (new)
- `pages/architecture/adrs/_meta.ts` (new)
- `pages/developer-guide/_meta.ts` (new)
- `pages/developer-guide/backend/_meta.ts` (new)
- `pages/developer-guide/frontend/_meta.ts` (new)
- `pages/contributing/_meta.ts` (new)

### Existing files to rename/move:
- `pages/guides/` → `pages/api-guides/` (rename for clarity)
- `pages/guides/route-planning/understanding-hos.mdx` → `pages/api-guides/route-planning/hos-compliance.mdx`
- All other content from guides/ moves to api-guides/ with same structure

### Key files to update:
- `pages/_meta.ts` — New navigation structure
- `pages/index.mdx` — Homepage redesign
- `pages/getting-started/introduction.mdx` — Fix outdated refs
- `pages/getting-started/quickstart.mdx` — Verify endpoints
- `theme.config.tsx` — Fix docsRepositoryBase, update navigation config
- `/CLAUDE.md` (root) — Remove Python backend references, update tech stack

---

## 12. Success Criteria

The documentation is "done" when:

- [ ] A new developer can go from `git clone` to running app in 15 minutes following the setup guide
- [ ] A new developer understands the full system architecture after reading Architecture section (~30 min)
- [ ] A new developer can create their first PR by following the Contributing guide
- [ ] An external developer can make their first API call in 5 minutes following Quickstart
- [ ] An external developer can plan a route end-to-end following the First Route tutorial
- [ ] All code examples in the docs actually work against the staging environment
- [ ] No references to Python/FastAPI/SQLAlchemy remain in any documentation
- [ ] C4 diagrams are rendered and embedded (not just PlantUML source)
- [ ] Domain glossary covers all trucking-specific terms
- [ ] Every placeholder page has real content
- [ ] Navigation is clear — no user gets lost

---

## 13. Open Questions for Discussion

1. **Deployment:** Where will the docs site be deployed? Currently `docs.sally.com` is implied — is that set up?
2. **OpenAPI sync:** Is the backend's `/api/openapi.json` endpoint up to date? Should we run sync before starting?
3. **C4 diagram rendering:** Do you have PlantUML installed locally, or should we use the online renderer?
4. **ADR format:** Any preference for ADR format (Michael Nygard's template? MADR?)
5. **Code examples:** Should external API examples show curl + JavaScript + Python? Or just curl + JavaScript?
6. **Auth for external devs:** Is the staging API key flow (`sk_staging_*`) documented correctly? Can external devs actually get keys?

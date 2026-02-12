# Developer Portal -- Consolidated Design

> **Status:** ⚠️ Partial | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-10-developer-portal-redesign.md` (primary/latest), `2026-02-05-developer-portal-design.md` (original), `2026-02-05-developer-portal-rebuild-design.md`

---

## 1. Design Evolution

The developer portal design went through three iterations:

| Date | Plan | Focus |
|------|------|-------|
| Feb 5, 2026 | `developer-portal-design.md` | Original: Nextra + Scalar API playground, API key management, monorepo integration |
| Feb 5, 2026 | `developer-portal-rebuild-design.md` | Rebuild: Apple-style clean design, dark/light mode fixes, three-column layout |
| Feb 10, 2026 | `developer-portal-redesign.md` | **Latest/Primary:** Dual-audience portal (External API + Internal Developer), comprehensive IA |

### Key Evolution Points

1. **Nextra stays as core** -- all three plans use Nextra as the documentation framework
2. **Scalar for API playground** -- interactive API testing via OpenAPI spec
3. **Dual-audience approach** (Feb 10) -- split navigation for API consumers vs. internal developers
4. **ReadMe.io evaluation** (Feb 10) -- external-facing mirror being evaluated alongside Nextra
5. **Content standards** (Feb 10) -- formal technical writing guidelines established

---

## 2. Architecture

### Technology Stack

| Technology | Role |
|------------|------|
| Nextra (Next.js) | Documentation framework (MDX + React components) |
| Scalar | Interactive API playground (OpenAPI 3.0) |
| TypeScript | Type safety |
| Tailwind CSS | Styling (shared design system with apps/web) |
| Shadcn/ui | UI component library |
| Flexsearch | Built-in search (Nextra default) |
| MDX | Markdown with embedded React components |
| next-themes | Dark/light mode switching |

### Monorepo Location

```
sally/
├── apps/
│   ├── docs/              # Developer portal (Nextra)
│   │   ├── pages/         # MDX documentation files
│   │   ├── components/    # Custom React components
│   │   ├── lib/           # Utilities (OpenAPI parser, etc.)
│   │   ├── public/        # Static assets, OpenAPI spec
│   │   ├── scripts/       # Build scripts (sync-openapi)
│   │   ├── styles/        # Global styles
│   │   ├── theme.config.tsx
│   │   └── package.json
│   ├── web/               # Main web application
│   └── backend/           # NestJS API
```

### Deployment

- **Portal URL:** `https://docs.sally.appshore.in` (GitHub Pages or Vercel)
- **API URL:** `https://sally-api.apps.appshore.in/api/v1`
- **OpenAPI Spec:** `https://sally-api.apps.appshore.in/api/openapi.json`

---

## 3. Information Architecture (Latest -- Feb 10 Redesign)

### Dual-Track Navigation

```
HOME                          -- Redesigned landing with dual-track entry points

-- PLATFORM (External API Consumers) --
Getting Started               -- Quickstart, Authentication, API Keys, First Route
API Guides                    -- Route Planning, Fleet Management, Alerts, Integrations, Multi-tenancy
API Reference                 -- Overview, Authentication, Error Codes
API Playground                -- Scalar interactive playground

-- DEVELOPERS (Internal) --
Architecture                  -- System Overview, Backend/Frontend Architecture, Database, ADRs
Developer Guide               -- Environment Setup, Project Structure, Backend/Frontend Development
Contributing                  -- Code Standards, Git Workflow, Pull Requests

-- RESOURCES --
Blog                          -- Product updates, engineering posts
Resources                     -- Support, FAQ, Glossary, Changelog
```

### Content Priority

**P0 (Day 1 onboarding):**
1. Homepage redesign with dual-track entry
2. Architecture > System Overview
3. Developer Guide > Environment Setup
4. Developer Guide > Project Structure
5. Architecture > Database Schema
6. Developer Guide > Backend > Module Structure
7. Developer Guide > Frontend > App Router Guide
8. Contributing > Git Workflow

**P1 (Week 1 reading):**
9-17. Detailed backend/frontend architecture, database/Prisma, adding endpoints, UI standards, code standards, PR guide, glossary

**P2 (External API guides):**
18-24. API keys, first route tutorial, fleet management, alerts, integrations, error codes, multi-tenancy

**P3 (Nice to have):**
25-30. ADRs, data flow, common tasks, shared packages, FAQ, changelog

---

## 4. Homepage Design

Dual-track entry points:

```
┌──────────────────────────────────────────────────────┐
│  SALLY Developer Portal                               │
│  Build on the intelligent fleet operations platform   │
│                                                       │
│  [Get API Access]    [Developer Setup]                │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌─── For API Consumers ───┐  ┌── For Developers ──┐ │
│  │ Integrate SALLY into    │  │ Contribute to the   │ │
│  │ your fleet tools.       │  │ SALLY platform.     │ │
│  │                         │  │                     │ │
│  │ -> Quickstart (5 min)   │  │ -> Environment Setup│ │
│  │ -> API Reference        │  │ -> Architecture     │ │
│  │ -> API Playground       │  │ -> Contributing     │ │
│  └─────────────────────────┘  └─────────────────────┘ │
│                                                       │
│  Core Capabilities (6 feature cards)                  │
│  Tech Stack: NestJS . Next.js . PostgreSQL . Redis    │
└───────────────────────────────────────────────────────┘
```

---

## 5. Content Standards

### Page Template

```markdown
---
title: Clear, Descriptive Title
description: One sentence explaining what this page covers
---

# Title

Brief introduction (2-3 sentences max).

## Prerequisites (if applicable)

## Main Content

## Next Steps
```

### Writing Rules

1. Use second person ("you")
2. Lead with the outcome
3. Show, don't tell -- every concept gets a code example
4. Progressive disclosure -- start simple, add complexity
5. Use callouts sparingly
6. No marketing language
7. Keep pages focused (under 500 lines, split if longer)
8. Use real trucking data in examples
9. Test every code example

### Diagram Standards

- Mermaid for inline diagrams (Nextra renders natively)
- PlantUML diagrams rendered to SVG and embedded as images
- Grayscale/monochrome to match design system

---

## 6. Theme System

### Color Tokens

**Light Mode:**
```css
--background: white
--foreground: near-black
--muted: light gray
--border: border gray
--primary: black
```

**Dark Mode:**
```css
--background: near-black
--foreground: near-white
--muted: dark gray
--border: dark border
--primary: white
```

Implementation: CSS variables, next-themes for switching, localStorage persistence, system preference detection.

---

## 7. C4 Architecture Diagrams

Existing PlantUML diagrams to be rendered and embedded:

| Diagram | Target Page |
|---------|-------------|
| c4-level1-context.puml | Architecture > System Overview |
| c4-level2-container.puml | Architecture > System Overview |
| c4-level3-component-backend.puml | Architecture > Backend Architecture |
| c4-level3-component-frontend.puml | Architecture > Frontend Architecture |
| c4-level4-code-hos-engine.puml | API Guides > HOS Compliance |
| c4-level4-code-optimization-engine.puml | API Guides > Route Planning |
| sequence-rest-optimization.puml | API Guides > Rest Stops |
| deployment-diagram.puml | Architecture > System Overview |
| data-flow-diagram.puml | Architecture > Data Flow |

---

## 8. API Key Management System (from original plan)

### Prisma Model

```prisma
model ApiKey {
  id            String   @id @default(uuid())
  key           String   @unique    // sk_staging_...
  name          String
  userId        String
  user          User     @relation(...)
  lastUsedAt    DateTime?
  requestCount  Int      @default(0)
  rateLimit     Int      @default(1000)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  expiresAt     DateTime?
  revokedAt     DateTime?
}
```

### Backend Implementation

Located at `apps/backend/src/domains/platform/api-keys/`:
- `api-keys.module.ts` -- ✅ Present
- `guards/` -- ✅ Present (ApiKeyGuard)
- `decorators/` -- ✅ Present
- `dto/` -- ✅ Present

**Status:** Backend API key system is built. The `api-keys/` module exists in the platform domain with guards, decorators, and DTOs.

---

## 9. ReadMe.io Dual-Platform Strategy (Feb 10)

| Platform | Role | Content |
|----------|------|---------|
| Nextra (`apps/docs/`) | Source of truth | All documentation |
| ReadMe.io (`sally-pagz.readme.io`) | External mirror | External API docs mirrored |

**Workflow:** Build and maintain all content in Nextra (versioned with code). Mirror external-facing content to ReadMe.io for evaluation. If ReadMe.io becomes primary, use `rdme` CLI to sync.

**Current status:** ReadMe.io integration status needs validation.

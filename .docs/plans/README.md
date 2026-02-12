# SALLY Plans & Feature Specifications

> **Last Updated:** 2026-02-12
> **Purpose:** Organized, code-validated design and implementation documentation for all SALLY features

This directory contains all feature design and implementation plans, organized by product domain. Each domain folder has design + implementation file pairs that are validated against the actual codebase (Prisma schema, controllers, services, frontend components).

---

## Domain Index

### Core Product

| Domain | Files | Description |
|--------|-------|-------------|
| [route-planning/](route-planning/) | 8 files | Route engine, HOS compliance, rest/fuel stops, continuous monitoring, post-route lifecycle, scheduled jobs |
| [fleet-management/](fleet-management/) | 8 files | Loads, drivers, vehicles, customers, dispatch board, shipper portal |
| [alerts-and-notifications/](alerts-and-notifications/) | 3 files | Alert system, notification channels, escalation, competitive research |

### Platform & Infrastructure

| Domain | Files | Description |
|--------|-------|-------------|
| [platform/](platform/) | 9 files | Authentication, user management, multi-tenancy, onboarding, API keys, vendor registry |
| [integrations/](integrations/) | 3 files | TMS/ELD integration architecture, vendor adapters, TMS market strategy |
| [settings-and-preferences/](settings-and-preferences/) | 3 files | Unified settings, user/driver/ops preferences, feature flags |

### User Experience

| Domain | Files | Description |
|--------|-------|-------------|
| [sally-ai/](sally-ai/) | 3 files | AI assistant (voice + text), intent classification, chat history |
| [dispatcher-experience/](dispatcher-experience/) | 2 files | Command center, KPI dashboard, shift notes |
| [customer-portal/](customer-portal/) | 1 file | Shipper portal (see fleet-management for full docs) |

### Architecture & DevOps

| Domain | Files | Description |
|--------|-------|-------------|
| [frontend-architecture/](frontend-architecture/) | 5 files | Domain migration, performance, design system, landing page, coding guidelines |
| [backend-architecture/](backend-architecture/) | 5 files | Domain-driven architecture, pnpm migration, seed data, feature flags |
| [developer-portal/](developer-portal/) | 4 files | Docs portal design, API docs layout, architecture docs |

---

## Status Legend

Each file includes a status indicator:

| Status | Meaning |
|--------|---------|
| ✅ Implemented | Feature is built and validated against code |
| ⚠️ Partial | Some parts built, some designed but not yet implemented |
| 🔲 Designed | Design complete, implementation not started |
| 📋 Planned | High-level plan only, needs detailed design |

---

## How to Use These Docs

### For Product/PM
Start with the **design** files (`*-design.md`) in each domain. They describe what the feature does, why it exists, and how it's architected.

### For Engineers
Use the **implementation** files (`*-implementation.md`) for task breakdowns, code patterns, file references, and what's built vs remaining.

### For New Features
1. Create a new design file in the appropriate domain folder
2. Use the superpower brainstorming/writing-plans skills (they auto-generate dated files in `_archive/`)
3. Consolidate into the domain folder when the design is finalized

---

## File Conventions

- **Design files** (`*-design.md`): Architecture, data models, API endpoints, UI components, design decisions
- **Implementation files** (`*-implementation.md`): Task breakdowns, code file references, testing, remaining work
- **Research files** (`*-research.md`): Market research, competitive analysis, strategy docs
- **Single files** (no suffix): Self-contained specs that combine design + implementation

---

## Archive

The `_archive/` directory contains all 80 original dated plan files generated during development sessions. These are the raw source material from which the domain specs were consolidated. They are preserved for reference but should not be used as the primary documentation.

---

## Related Documentation

- **Product Vision & Roadmap:** [../specs/blueprint.md](../specs/blueprint.md)
- **Product Overview:** [../specs/PRODUCT_OVERVIEW.md](../specs/PRODUCT_OVERVIEW.md)
- **Technical Docs:** [../../apps/docs/pages/developer-guide/](../../apps/docs/pages/developer-guide/)
- **Project Instructions:** [../../CLAUDE.md](../../CLAUDE.md)

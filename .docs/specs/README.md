# SALLY Product Specifications

> **Last Updated:** 2026-02-12
> **Purpose:** High-level product vision, strategy, and roadmap

This directory contains **product-level** documentation: vision, strategy, roadmap, and product overview. For detailed feature design and implementation specs, see the **[plans/](../plans/)** directory.

---

## Contents

| Document | Description |
|----------|-------------|
| [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) | 1-page product summary (3 min read) |
| [blueprint.md](./blueprint.md) | Complete product vision, strategy, roadmap (20 min read) |

### Subdirectories

| Directory | Description |
|-----------|-------------|
| [features/](./features/) | Legacy feature specs (superseded by [plans/](../plans/)) |
| [planning/](./planning/) | Strategic planning docs (POC plan, roadmap, phase summaries) |
| [archive/](./archive/) | Historical documents from earlier iterations |

---

## Feature Documentation

**All feature design and implementation documentation has moved to [.docs/plans/](../plans/)**, organized by product domain with design + implementation file pairs validated against the actual codebase.

### Domain Index (Quick Links)

| Domain | Description |
|--------|-------------|
| [Route Planning](../plans/route-planning/) | Route engine, HOS, rest/fuel stops, continuous monitoring |
| [Fleet Management](../plans/fleet-management/) | Loads, drivers, vehicles, dispatch board, shipper portal |
| [Alerts & Notifications](../plans/alerts-and-notifications/) | Alert system, notification channels, escalation |
| [Platform](../plans/platform/) | Auth, users, multi-tenancy, onboarding, vendor registry |
| [Integrations](../plans/integrations/) | TMS/ELD integration, vendor adapters |
| [Settings & Preferences](../plans/settings-and-preferences/) | Unified settings, user/driver/ops preferences |
| [Sally AI](../plans/sally-ai/) | Voice + text AI assistant, chat history |
| [Dispatcher Experience](../plans/dispatcher-experience/) | Command center, KPI dashboard |
| [Frontend Architecture](../plans/frontend-architecture/) | Domain migration, design system, performance |
| [Backend Architecture](../plans/backend-architecture/) | DDD architecture, seed data, feature flags |
| [Developer Portal](../plans/developer-portal/) | Docs portal, API docs layout |

---

## For Different Audiences

### Product Managers
1. [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) - High-level summary
2. [blueprint.md](./blueprint.md) - Complete vision and strategy
3. [plans/](../plans/) - Domain-level design files (`*-design.md`)

### Engineers
1. [plans/](../plans/) - Domain-level implementation files (`*-implementation.md`)
2. [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) - Context
3. Technical docs in `apps/docs/pages/developer-guide/`

### Stakeholders
1. [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) - Overview
2. [blueprint.md](./blueprint.md) - Vision and roadmap
3. [planning/](./planning/) - Phase summaries

---

## Related Documentation

- **Feature Specs (Primary):** [.docs/plans/](../plans/)
- **Technical Docs:** [apps/docs/pages/developer-guide/](../../apps/docs/pages/developer-guide/)
- **Project Instructions:** [CLAUDE.md](../../CLAUDE.md)
- **Documentation Index:** [DOCUMENTATION.md](../../DOCUMENTATION.md)

---

**Maintained By:** SALLY Product & Engineering Team

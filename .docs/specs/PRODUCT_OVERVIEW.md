# SALLY Product Overview

**Category:** Dispatch & Driver Coordination Platform
**Last Updated:** 2026-01-30
**Reading Time:** 3 minutes

---

## One-Line Summary

**The intelligent dispatch & driver coordination platform** that generates optimized end-to-end plans, continuously monitors real-world conditions, and simplifies communication between dispatchers and drivers through automated alerts and dynamic route updates.

---

## The Problem

Dispatchers and drivers work in silos:

**Dispatchers:**
- Manually calculate HOS (error-prone)
- React to problems after they happen
- Constant phone calls for status updates
- Can't prevent violations proactively

**Drivers:**
- Get stop lists, not actual routes
- Manually plan routes in their heads
- Run out of hours mid-route
- Miss appointments due to poor planning

**Current tools don't bridge this gap:**
- TMS: Assigns loads, doesn't plan routes
- ELD: Logs hours, doesn't suggest when/where to rest
- Maps: Assumes infinite drive time

---

## The Solution

A compliance-first route planning platform that:

1. **Generates optimized routes** with HOS compliance built-in
2. **Automatically inserts rest stops** where regulations require
3. **Automatically inserts fuel stops** based on range and price
4. **Monitors routes 24/7** and alerts dispatchers when intervention needed
5. **Updates plans dynamically** when conditions change
6. **Provides dual interfaces** - dispatcher dashboard + driver view

---

## Core Features (Implemented)

### ✅ 1. Route Planning Engine
- TSP optimization (stop sequence)
- HOS simulation (segment-by-segment)
- Automatic rest insertion (full 10h or partial 7h/8h)
- Automatic fuel insertion
- Zero HOS violations guaranteed

### ✅ 2. Authentication & Multi-Tenancy
- JWT-based auth with refresh tokens
- Role-based access (DISPATCHER, DRIVER, ADMIN)
- Tenant isolation at database level

### ✅ 3. Dispatcher Dashboard
- Wizard-style Create Plan workflow (Load → Driver → Vehicle → Results)
- Active routes monitoring
- Settings & configuration

### ⚠️ 4. External Integrations (Partial)
- Mock Samsara ELD API (HOS data)
- Mock fuel price API
- Mock weather API
- Real adapters: In progress

### ⚠️ 5. Alerts System (Partial)
- Database models + API endpoints complete
- Alert generation logic: Not yet connected

### ❌ 6. Continuous Monitoring (Planned)
- 14 trigger types (traffic, dock delays, HOS approaching, etc.)
- Background monitoring service
- Not yet implemented

---

## Key Features (Detailed)

### HOS Compliance
- **Rules Enforced:** 11h drive, 14h duty, 8h break, 70h cycle
- **Accuracy:** 100% (zero violations on generated routes)
- **Audit Trail:** Every decision logged with reasoning

### REST Optimization
- **Types:** Full rest (10h), Partial (7h/8h), Break (30min)
- **Logic:** Feasibility + Opportunity + Cost analysis
- **Integration:** Called by route planner when HOS shortfall detected

### TSP Optimization
- **Algorithm:** Greedy nearest-neighbor + 2-opt
- **Performance:** <5s for 10 stops, <15s for 20 stops
- **Constraints:** Time windows, HOS-aware

---

## Implementation Status

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Route Planning | ✅ 100% | ✅ 100% | Production ready |
| HOS Compliance | ✅ 100% | ✅ 95% | Production ready |
| Authentication | ✅ 100% | ✅ 100% | Production ready |
| Multi-Tenancy | ✅ 100% | ✅ 100% | Production ready |
| Integrations | ⚠️ 20% | ⚠️ 50% | Mock only |
| Alerts | ⚠️ 40% | ⚠️ 20% | API only, no generation |
| Monitoring | ❌ 0% | N/A | Planned Phase 2 |
| Fleet Management | ⚠️ 50% | ⚠️ 30% | Basic CRUD only |
| Driver Portal | ⚠️ 50% | ⚠️ 40% | Dashboard exists |

**Legend:**
- ✅ Complete (production ready)
- ⚠️ Partial (usable but incomplete)
- ❌ Planned (not started)

---

## Technology Stack

**Backend:**
- Python 3.11+, FastAPI (async)
- PostgreSQL 16, Redis 7
- SQLAlchemy 2.0 (async), Pydantic v2

**Frontend:**
- Next.js 15 (App Router), TypeScript
- Zustand + React Query
- Tailwind CSS + Shadcn/ui
- next-themes (dark mode)

**Infrastructure:**
- Docker + Docker Compose
- AWS (Phase 2 deployment)

---

## Key Differentiators

### vs TMS (McLeod, TMW)
- **SALLY:** Plans routes with HOS compliance
- **TMS:** Assigns loads, tracks status (no routing)

### vs ELD (Samsara, KeepTruckin)
- **SALLY:** Suggests when/where to rest proactively
- **ELD:** Logs hours, enforces compliance (reactive)

### vs Maps (Google, PC*Miler)
- **SALLY:** HOS-aware, inserts rest/fuel stops
- **Maps:** Shortest route (assumes infinite drive time)

**SALLY sits at the intersection, solving what none of them solve.**

---

## Quick Links

### For Product Managers
- [Product Vision (blueprint.md)](./blueprint.md)
- [Roadmap](./planning/ROADMAP.md)
- [Feature Summaries](./features/)

### For Engineers
- [Route Planning Implementation](./features/01-route-planning/)
- [Authentication Implementation](./features/02-authentication/)
- [Integrations Implementation](./features/03-integrations/)
- [API Docs](./features/01-route-planning/API_ENDPOINTS.md)

### For Stakeholders
- [Phase Summaries](./planning/PHASE_SUMMARIES.md)
- [POC Enhancement Plan](./planning/POC_ENHANCEMENT_PLAN.md)

---

## What's Next?

**Phase 1 (Current):**
- ✅ Route planning with HOS compliance
- ✅ Authentication & multi-tenancy
- ⚠️ External integrations (in progress)
- ❌ Continuous monitoring (not started)

**Phase 2 (3 months):**
- Real ELD/TMS/Fuel/Weather integrations
- Continuous monitoring service (14 triggers)
- Alert generation engine
- Live tracking with maps

**Phase 3 (6 months):**
- Multi-driver fleet optimization (VRP)
- Predictive ML (ETA prediction, driver preferences)
- Advanced analytics dashboard

---

## Contact

**Repository:** [SALLY Monorepo](/)
**Documentation:** [.specs/README.md](./README.md)
**Technical Docs:** [.docs/INDEX.md](../.docs/INDEX.md)

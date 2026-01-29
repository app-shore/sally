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
- **architecture/** - C4 diagrams, sequence diagrams, deployment diagrams

**Key Rule:** All technical docs, architecture diagrams, and operational guides go here.

---

## Product Framing (CRITICAL)

### Primary Product
**SALLY is a Route Planning Platform for truck drivers**

Core capabilities:
1. Route planning with stop sequence optimization (TSP/VRP)
2. Automatic rest stop insertion (where HOS requires)
3. Automatic fuel stop insertion (based on range and price)
4. HOS compliance validation (zero violations)
5. Dynamic route updates (14 trigger types monitored 24/7)
6. Continuous monitoring (proactive + reactive)

### REST Optimization is a COMPONENT
**Not the primary product, but a critical component**

- Called by the route planner when HOS simulation detects shortfall
- Analyzes whether to insert rest stop or leverage dock time
- Recommends rest type: FULL_REST (10h), PARTIAL_REST (7h), NO_REST
- Provides audit-ready reasoning for compliance

### Correct Language

**CORRECT:**
- "SALLY is a route planning platform"
- "REST optimization is called by the route planner"
- "The system automatically inserts rest stops where needed"
- "Primary endpoints: /api/v1/routes/plan, /api/v1/routes/update"

**INCORRECT:**
- "SALLY is a rest optimization system"
- "REST optimization is the main product"
- "The system optimizes rest at dock" (too narrow)
- "Primary endpoint: /api/v1/optimization/recommend" (this is a component)

---

## Key Principles

1. **Product specs and plans** → `.specs/` directory
2. **Technical docs and architecture** → `.docs/` directory
3. **Essential getting started guides** → Root directory (README, QUICKSTART, DOCUMENTATION only)
4. **Always maintain index files** (README.md, INDEX.md) when adding new docs
5. **Cross-reference related documents** for easy navigation
6. **Frame SALLY as route planning platform** with REST optimization as component

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

### Component Endpoints (Called by Route Planner)
5. `POST /api/v1/hos/validate` - HOS compliance check
6. `POST /api/v1/rest/recommend` - REST optimization
7. `POST /api/v1/fuel/find-stops` - Fuel stop finding

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
January 23, 2026 - Major documentation cleanup and reorganization

## Maintained By
SALLY Product & Engineering Team

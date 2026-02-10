# SALLY: Intelligent Route Planning Platform

**The first route planning platform built for truck drivers, not dispatchers.**

SALLY optimizes stop sequence, rest timing, fuel stops, and dynamically updates routes when reality doesn't match the plan.

---

## 🚀 Quick Start

**New to SALLY?** Get started in 5 minutes:

```bash
# Clone repository
git clone <repository-url>
cd sally

# Quick start with Docker
pnpm run docker:up

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

For detailed setup, see [.docs/SETUP.md](./.docs/SETUP.md).

---

## 📚 Documentation

### Essential Reading

1. **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide (Start here!)
2. **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Complete documentation guide
3. **[.specs/README.md](./.specs/README.md)** - Product specifications
4. **[.docs/INDEX.md](./.docs/INDEX.md)** - Architecture & technical docs

### Documentation Structure

```
sally/
├── README.md                    # This file - project overview
├── QUICKSTART.md               # 5-minute quick start guide
├── DOCUMENTATION.md            # Complete documentation guide
│
├── .specs/                     # Product Specifications
│   ├── README.md              # Specifications index (start here!)
│   ├── blueprint.md           # Product vision, strategy, roadmap
│   ├── ROUTE_PLANNING_SPEC.md # Complete technical specification
│   └── INTELLIGENT_OPTIMIZATION_FORMULA.md  # REST algorithm
│
└── .docs/                      # Technical Documentation
    ├── INDEX.md               # Architecture documentation index
    ├── SETUP.md               # Detailed setup instructions
    ├── DEPLOY.md              # Deployment guide
    └── architecture/          # C4 model diagrams, sequences, deployment
```

---

## 🎯 What is SALLY?

### The Problem

Truck drivers get a list of stops from dispatch but **no actual route plan**:
- Suboptimal stop sequences (unnecessary miles)
- Poor rest timing (forced breaks at inconvenient locations)
- HOS violations (run out of hours mid-route)
- Missed appointments (didn't account for dock delays)
- Wasted fuel (no fuel stop optimization)

**This is a massive gap in the trucking tech stack.**

### The Solution

SALLY is a compliance-first route planning engine that:

1. **Optimizes stop sequence** (TSP/VRP algorithms)
2. **Inserts rest stops** where HOS requires (truck stops, service areas)
3. **Inserts fuel stops** based on range and price
4. **Validates HOS compliance** for entire route before driver starts
5. **Monitors and updates dynamically** when conditions change:
   - Dock time different than estimated
   - Traffic delays
   - New load added or cancelled
   - Driver wants to rest at current location
6. **Provides clear reasoning** for every decision (audit-ready)

**Core Insight:**
> Route planning isn't just about shortest distance—it's about HOS compliance, rest timing, fuel costs, and adapting to reality.

---

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Python 3.11+, FastAPI (async)
- PostgreSQL 16, Redis 7
- SQLAlchemy 2.0 (async), Pydantic v2

**Frontend:**
- Next.js 15 (App Router), TypeScript
- Zustand + React Query
- Tailwind CSS + Shadcn/ui

**Infrastructure:**
- Docker + Docker Compose
- Turborepo (monorepo management)

### System Architecture

```
Route Planning (Initial) → Continuous Monitoring → Dynamic Updates → Re-Planning
         ↓                         ↓                      ↓              ↓
    Optimized route          14 trigger types      Threshold checks    New route v2
    with rest/fuel           monitored 24/7        decide re-plan      preserves history
```

For detailed architecture, see [.docs/architecture/](./.docs/architecture/).

---

## 🚦 Project Structure

```
sally/
├── apps/
│   ├── backend/              # Python FastAPI backend
│   │   ├── app/
│   │   │   ├── api/         # API endpoints
│   │   │   ├── core/        # Configuration, constants
│   │   │   ├── models/      # Database models
│   │   │   ├── schemas/     # Pydantic schemas
│   │   │   └── services/    # Business logic
│   │   ├── tests/           # Backend tests
│   │   └── pyproject.toml   # UV package management
│   │
│   └── web/                 # Next.js React dashboard
│       ├── src/
│       │   ├── app/         # App router pages
│       │   ├── components/  # React components
│       │   ├── lib/         # Utilities, API client
│       │   └── stores/      # Zustand stores
│       └── package.json
│
├── .specs/                  # Product specifications
│   ├── blueprint.md         # Product vision
│   ├── ROUTE_PLANNING_SPEC.md  # Technical spec
│   └── INTELLIGENT_OPTIMIZATION_FORMULA.md
│
├── .docs/                   # Technical documentation
│   ├── INDEX.md            # Documentation index
│   └── architecture/       # C4 model diagrams
│
├── docker-compose.yml      # Docker orchestration
├── turbo.json             # Turborepo configuration
└── package.json           # Root package.json
```

---

## 🛠️ Development

### Prerequisites

- Python 3.11+
- Node.js 20+
- pnpm: `corepack enable` or `npm install -g pnpm`
- PostgreSQL 16+
- Redis 7+
- UV package manager: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Docker (optional, recommended)

### Local Development

**With Docker (Recommended):**
```bash
pnpm run docker:up          # Start all services
pnpm run docker:logs        # View logs
pnpm run docker:down        # Stop services
```

**With Turborepo:**
```bash
pnpm install               # Install all dependencies (including workspaces)
pnpm run dev               # Run both backend and frontend
```

**Individual Services:**
```bash
pnpm run backend:dev        # Backend only (port 8000)
pnpm run frontend:dev       # Frontend only (port 3000)
```

### Testing

**Backend:**
```bash
cd apps/backend
uv run pytest tests/       # Run tests
uv run pytest --cov=app    # With coverage
```

**Frontend:**
```bash
cd apps/web
pnpm run test               # Run tests
pnpm run test:e2e           # E2E tests
```

---

## 📋 API Documentation

Once the backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

Key endpoints:
- `POST /api/v1/routes/plan` - Plan a complete route
- `POST /api/v1/routes/update` - Update route with new conditions
- `GET /api/v1/routes/{plan_id}` - Get route plan status
- `POST /api/v1/hos/validate` - Validate HOS compliance

---

## 🎯 Core Features

### 1. Route Planning Engine
Optimizes stop sequence and inserts rest/fuel stops:

```
Input: Driver (HOS state), Truck (fuel), Stops (N locations)
Output:
  1. Origin → Stop A (2h drive)
  2. Stop A dock (2h)
  3. Stop A → Truck Stop X (1h drive)
  4. [REST: 10h at Truck Stop X] ← INSERTED
  5. Truck Stop X → Stop B (3h drive)
  6. Stop B dock (1h)
  Total: 300 miles, 22h, HOS compliant ✅
```

### 2. Dynamic Update System
Monitors 14 trigger types and re-plans when needed:
- Dock time changes
- Traffic delays
- Load changes
- Driver rest requests
- HOS limit approaches
- Fuel level low

### 3. Intelligent REST Management
Three types of recommendations:
- **Mandatory Rest:** Route not feasible without rest (100% confidence)
- **Opportunistic Rest:** Route feasible but marginal (60-75% confidence)
- **Dedicated Rest Stop:** Insert truck stop/service area

---

## 🗺️ Roadmap

**Phase 1: Single-Driver Route Planning (MVP - Current)**
- Route planning engine (TSP + HOS simulation)
- Rest & fuel stop insertion
- Dynamic updates (4 trigger types)
- Web dashboard

**Phase 2: Fleet-Wide Optimization (3 months)**
- Multi-driver assignment (VRP solver)
- Load matching
- Driver preferences

**Phase 3: Live Data Integration (3 months)**
- ELD API integration
- TMS API integration
- Telematics integration
- Traffic APIs

**Phase 4: Predictive Intelligence (6 months)**
- ML-based ETA prediction
- Driver preference learning
- Lane-specific patterns

---

## 💼 For Different Audiences

### Developers
1. Read [QUICKSTART.md](./QUICKSTART.md)
2. Review [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md)
3. Check [.docs/architecture/](./.docs/architecture/)

### Product Managers
1. Read [.specs/blueprint.md](./.specs/blueprint.md)
2. Check [.specs/README.md](./.specs/README.md)

### DevOps
1. Read [.docs/DEPLOY.md](./.docs/DEPLOY.md)
2. Review [.docs/SETUP.md](./.docs/SETUP.md)
3. Check [docker-compose.yml](./docker-compose.yml)

### Executives/Investors
1. Read [.specs/blueprint.md](./.specs/blueprint.md) (Sections: Problem, Solution, Go-to-Market)
2. Check roadmap and success metrics

---

## 🤝 Contributing

See individual README files in `apps/backend/` and `apps/web/` for detailed contribution guidelines.

**Code Quality:**
- Backend: `black`, `isort`, `mypy`, `ruff`
- Frontend: ESLint, Prettier, TypeScript strict mode
- Tests: 80%+ coverage target

---

## 📄 License

Proprietary - All rights reserved

---

## 📞 Support

For issues and questions:
- Check documentation in `.specs/` and `.docs/`
- Review API documentation at http://localhost:8000/docs
- Contact the development team

---

## 🎯 Core Philosophy

> **"We don't just route trucks. We route drivers with hours, fuel, and rest built into every mile."**

> **"Route planning isn't just about shortest distance—it's about HOS compliance, rest timing, fuel costs, and adapting to reality."**

**SALLY: Where routing meets reality.**

---

**Last Updated:** February 10, 2026

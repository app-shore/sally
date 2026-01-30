# SALLY Documentation Guide

**Complete navigation guide for all SALLY documentation.**

---

## 🎯 Start Here

### I want to...

**...get started quickly**
→ Read [QUICKSTART.md](./QUICKSTART.md) (5 minutes)

**...understand what SALLY is**
→ Read [README.md](./README.md) (10 minutes)

**...learn the product vision**
→ Read [.specs/blueprint.md](./.specs/blueprint.md) (20 minutes)

**...understand the technical architecture**
→ Read [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) (45 minutes)

**...deploy SALLY**
→ Read [DEPLOY.md](./DEPLOY.md) (15 minutes)

**...set up Google Maps for accurate distances**
→ Read [GOOGLE_MAPS_QUICKSTART.md](./GOOGLE_MAPS_QUICKSTART.md) (5 minutes)

**...view architecture diagrams**
→ See [.docs/architecture/](./.docs/architecture/) + [.docs/INDEX.md](./.docs/INDEX.md)

---

## 📂 Documentation Structure

```
sally/
│
├── 📖 Root Documentation (Setup & Deployment)
│   ├── README.md                    # Project overview
│   ├── QUICKSTART.md               # 5-minute setup guide
│   ├── SETUP.md                    # Detailed setup instructions
│   ├── DEPLOY.md                   # Deployment guide
│   └── DOCUMENTATION.md            # This file
│
├── 📋 .specs/ (Product Specifications)
│   ├── README.md                   # Specifications index
│   ├── blueprint.md                # Product vision & strategy
│   ├── ROUTE_PLANNING_SPEC.md     # Complete technical specification
│   ├── INTELLIGENT_OPTIMIZATION_FORMULA.md  # REST algorithm
│   └── archive/                    # Historical documents
│
└── 🏗️ .docs/ (Technical Documentation)
    ├── INDEX.md                    # Architecture documentation index
    ├── C4_MODEL_SUMMARY.md        # C4 model overview
    ├── QUICK_REFERENCE.md         # Quick reference guide
    └── architecture/              # C4 diagrams, sequences, deployment
        ├── README.md
        ├── VISUALIZATION_GUIDE.md
        ├── c4-level1-context.puml
        ├── c4-level2-container.puml
        ├── c4-level3-component-*.puml
        ├── c4-level4-code-*.puml
        ├── sequence-*.puml
        ├── deployment-diagram.puml
        └── data-flow-diagram.puml
```

---

## 📚 Documentation by Category

### 1. Getting Started

| Document | Purpose | Time | Audience |
|----------|---------|------|----------|
| [QUICKSTART.md](./QUICKSTART.md) | Get up and running in 5 minutes | 5 min | All |
| [SETUP.md](./SETUP.md) | Detailed setup for all environments | 15 min | Developers |
| [README.md](./README.md) | Project overview and quick start | 10 min | All |

---

### 2. Product Specifications (.specs/)

| Document | Purpose | Time | Audience |
|----------|---------|------|----------|
| [.specs/README.md](./.specs/README.md) | Specifications index and guide | 10 min | All |
| [.specs/blueprint.md](./.specs/blueprint.md) | Product vision, strategy, roadmap | 20 min | PM, Executives, Sales |
| [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) | Complete technical specification | 45 min | Engineers, Architects |
| [.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md](./.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md) | REST optimization algorithm | 30 min | Engineers, PM |

**Key Topics:**
- Problem statement and solution
- System architecture (3-layer)
- Route planning engine (TSP + HOS simulation)
- Continuous monitoring (14 trigger types)
- Dynamic updates and re-planning
- REST optimization integration
- Database schema and API design
- Roadmap (Phase 1-5)
- Success metrics

---

### 3. Technical Documentation (.docs/)

| Document | Purpose | Time | Audience |
|----------|---------|------|----------|
| [.docs/INDEX.md](./.docs/INDEX.md) | Architecture documentation index | 5 min | All |
| [.docs/architecture/README.md](./.docs/architecture/README.md) | C4 model overview | 10 min | Architects |
| [.docs/architecture/VISUALIZATION_GUIDE.md](./.docs/architecture/VISUALIZATION_GUIDE.md) | How to view diagrams | 5 min | Developers |
| [.docs/C4_MODEL_SUMMARY.md](./.docs/C4_MODEL_SUMMARY.md) | C4 model summary | 15 min | Architects |

**Architecture Diagrams:**
- **Level 1 - System Context:** SALLY in relation to users and external systems
- **Level 2 - Container:** Technology stack (Next.js, FastAPI, PostgreSQL, Redis)
- **Level 3 - Components:** Backend and frontend internal structure
- **Level 4 - Code:** Detailed class diagrams (HOS Engine, Optimization Engine)
- **Sequence Diagrams:** End-to-end flow
- **Deployment Diagrams:** Docker infrastructure
- **Data Flow Diagrams:** Data pipeline

---

### 4. Deployment & Operations

| Document | Purpose | Time | Audience |
|----------|---------|------|----------|
| [DEPLOY.md](./DEPLOY.md) | Deployment guide (Docker, Vercel, CapRover) | 15 min | DevOps |
| [docker-compose.yml](./docker-compose.yml) | Docker orchestration configuration | 5 min | DevOps |

---

## 🎓 Learning Paths

### For Product Managers

**Time: 1 hour**

1. [README.md](./README.md) - Project overview (10 min)
2. [.specs/blueprint.md](./.specs/blueprint.md) - Product vision (20 min)
3. [.specs/README.md](./.specs/README.md) - Specifications guide (10 min)
4. [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - System architecture section (20 min)

**Focus on:**
- Problem statement and solution
- Market positioning
- Core features and roadmap
- Go-to-market strategy
- Success metrics

---

### For Backend Engineers

**Time: 2 hours**

1. [QUICKSTART.md](./QUICKSTART.md) - Quick setup (5 min)
2. [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - Complete technical spec (45 min)
3. [.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md](./.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md) - REST algorithm (30 min)
4. [.docs/architecture/c4-level3-component-backend.puml](./.docs/architecture/c4-level3-component-backend.puml) - Backend components (10 min)
5. [.docs/architecture/c4-level4-code-*.puml](./.docs/architecture/) - Code-level diagrams (20 min)
6. Review backend codebase: `apps/backend/app/`

**Focus on:**
- Route planning engine implementation
- HOS simulation logic
- REST optimization algorithm
- Database schema and models
- API design and endpoints

---

### For Frontend Engineers

**Time: 1.5 hours**

1. [QUICKSTART.md](./QUICKSTART.md) - Quick setup (5 min)
2. [README.md](./README.md) - Project overview (10 min)
3. [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - Frontend changes section (20 min)
4. [.docs/architecture/c4-level3-component-frontend.puml](./.docs/architecture/c4-level3-component-frontend.puml) - Frontend components (10 min)
5. Review frontend codebase: `apps/web/src/`

**Focus on:**
- UI components structure
- State management (Zustand + React Query)
- API client integration
- Dashboard layout and visualizations

---

### For Solutions Architects

**Time: 2 hours**

1. [README.md](./README.md) - Project overview (10 min)
2. [.specs/blueprint.md](./.specs/blueprint.md) - Product vision (20 min)
3. [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - Complete technical spec (45 min)
4. [.docs/INDEX.md](./.docs/INDEX.md) - Architecture documentation (5 min)
5. [.docs/architecture/README.md](./.docs/architecture/README.md) - C4 model guide (10 min)
6. Review all C4 diagrams: [.docs/architecture/](./.docs/architecture/) (30 min)

**Focus on:**
- System architecture (3-layer design)
- Technology stack choices
- Database design and data flow
- Integration points
- Scalability considerations

---

### For DevOps Engineers

**Time: 1 hour**

1. [QUICKSTART.md](./QUICKSTART.md) - Quick setup (5 min)
2. [SETUP.md](./SETUP.md) - Detailed setup (15 min)
3. [DEPLOY.md](./DEPLOY.md) - Deployment guide (15 min)
4. [docker-compose.yml](./docker-compose.yml) - Docker configuration (5 min)
5. [.docs/architecture/deployment-diagram.puml](./.docs/architecture/deployment-diagram.puml) - Infrastructure diagram (10 min)
6. Review CI/CD setup (if exists)

**Focus on:**
- Docker setup and orchestration
- Environment configuration
- Deployment options (Docker, Vercel, CapRover)
- Database and Redis setup
- Monitoring and logging

---

### For QA/Testing Engineers

**Time: 2 hours**

1. [README.md](./README.md) - Project overview (10 min)
2. [.specs/blueprint.md](./.specs/blueprint.md) - Product vision and features (20 min)
3. [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - Technical spec (45 min)
4. [.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md](./.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md) - REST algorithm (30 min)
5. Review test suites: `apps/backend/tests/` and `apps/web/__tests__/`

**Focus on:**
- Core features and use cases
- Edge cases and error scenarios
- HOS compliance validation
- API endpoints and contracts
- Example scenarios in specs

---

### For Executives/Investors

**Time: 30 minutes**

1. [README.md](./README.md) - Project overview (10 min)
2. [.specs/blueprint.md](./.specs/blueprint.md) - Focus on:
   - Problem statement (2 min)
   - Solution overview (3 min)
   - Market positioning (3 min)
   - Go-to-market strategy (5 min)
   - Roadmap and success metrics (7 min)

**Focus on:**
- Problem and solution
- Market opportunity
- Competitive advantage
- Business model and pricing
- Growth roadmap

---

## 🗺️ Topic-Based Navigation

### HOS Compliance & Regulations

**Documents:**
- [.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md](./.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md) - Algorithm details
- [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - HOS simulation section
- [.docs/architecture/c4-level4-code-hos-engine.puml](./.docs/architecture/c4-level4-code-hos-engine.puml) - HOS engine diagram

**Code:**
- `apps/backend/app/core/constants.py` - FMCSA regulations
- `apps/backend/app/services/hos_rule_engine.py` - HOS validation logic

---

### Route Planning & Optimization

**Documents:**
- [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - Route planning engine
- [.specs/blueprint.md](./.specs/blueprint.md) - Optimization logic section
- [.docs/architecture/c4-level4-code-optimization-engine.puml](./.docs/architecture/c4-level4-code-optimization-engine.puml)

**Code:**
- `apps/backend/app/services/route_planning_engine.py` - TSP optimization
- `apps/backend/app/services/rest_optimization_engine.py` - REST recommendations

---

### Dynamic Updates & Monitoring

**Documents:**
- [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - Continuous monitoring section
- [.specs/blueprint.md](./.specs/blueprint.md) - Dynamic update system

**Focus:**
- 14 trigger types across 5 categories
- Re-plan decision logic
- Threshold-based updates

---

### Database & Data Models

**Documents:**
- [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - Database schema section
- [.docs/architecture/data-flow-diagram.puml](./.docs/architecture/data-flow-diagram.puml)

**Code:**
- `apps/backend/app/models/` - SQLAlchemy models
- `apps/backend/app/db/migrations/` - Alembic migrations

---

### API Design

**Documents:**
- [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - API endpoints section
- API documentation: http://localhost:8000/docs (when running)

**Code:**
- `apps/backend/app/api/v1/endpoints/` - API routes
- `apps/backend/app/api/v1/schemas/` - Request/response schemas

---

### Frontend Architecture

**Documents:**
- [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - Frontend changes section
- [.docs/architecture/c4-level3-component-frontend.puml](./.docs/architecture/c4-level3-component-frontend.puml)

**Code:**
- `apps/web/src/components/` - React components
- `apps/web/src/stores/` - Zustand state management
- `apps/web/src/lib/api-client.ts` - API integration

---

## 🔍 Finding Information Fast

### Quick Reference

| I need to... | Go to... |
|-------------|----------|
| Set up locally | [QUICKSTART.md](./QUICKSTART.md) |
| Understand HOS rules | [.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md](./.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md) |
| See system architecture | [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) |
| View architecture diagrams | [.docs/architecture/](./.docs/architecture/) |
| Learn about REST optimization | [.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md](./.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md) |
| Check API endpoints | http://localhost:8000/docs or [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) |
| Deploy to production | [DEPLOY.md](./DEPLOY.md) |
| Understand database schema | [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - Database section |
| Learn about dynamic updates | [.specs/ROUTE_PLANNING_SPEC.md](./.specs/ROUTE_PLANNING_SPEC.md) - Monitoring section |
| See product roadmap | [.specs/blueprint.md](./.specs/blueprint.md) - Roadmap section |

---

## 📝 Documentation Standards

### Where to Add New Documentation

**Product specs and plans:**
→ Add to `.specs/` directory

**Technical documentation, architecture diagrams, utilities:**
→ Add to `.docs/` directory

**Setup and deployment guides:**
→ Add to root directory

### Updating Documentation

When making changes:

1. **Product vision changes** → Update `.specs/blueprint.md`
2. **Architecture changes** → Update `.specs/ROUTE_PLANNING_SPEC.md` and `.docs/architecture/` diagrams
3. **Algorithm changes** → Update `.specs/INTELLIGENT_OPTIMIZATION_FORMULA.md`
4. **Setup changes** → Update `QUICKSTART.md` or `SETUP.md`
5. **Deployment changes** → Update `DEPLOY.md`

### Documentation Review Checklist

Before merging documentation changes:

- [ ] All links tested and working
- [ ] Code examples are accurate
- [ ] Diagrams are up-to-date
- [ ] Navigation is clear
- [ ] Audience is identified
- [ ] Reading time is estimated
- [ ] Related documents are cross-referenced

---

## 🎯 Core Concepts

### SALLY Architecture

**Three-Layer System:**
1. **Route Planning Engine** - Initial route generation
2. **Continuous Monitoring Service** - 14 trigger types, runs every 60 seconds
3. **Dynamic Update Handler** - Re-planning orchestration

### Key Features

1. **HOS-Aware Routing** - Plans around driver hours
2. **Automatic Rest Insertion** - Adds rest stops where needed
3. **Continuous Monitoring** - Watches for changes 24/7
4. **Dynamic Updates** - Re-plans when conditions change
5. **Fuel Optimization** - Inserts cheapest fuel stops
6. **Compliance-First** - Zero violations, full audit trail

### Technology Stack

- **Backend:** Python 3.11+, FastAPI, PostgreSQL 16, Redis 7
- **Frontend:** Next.js 15, TypeScript, Zustand, Tailwind CSS
- **Infrastructure:** Docker, Turborepo

---

## 🤝 Contributing to Documentation

### Style Guide

- Use clear, concise language
- Include code examples where helpful
- Add diagrams for complex concepts
- Estimate reading time
- Identify target audience
- Cross-reference related documents
- Keep navigation clear

### Documentation Workflow

1. Identify what needs documentation
2. Choose appropriate location (`.specs/`, `.docs/`, or root)
3. Write documentation following standards
4. Update relevant index files
5. Test all links and examples
6. Submit for review

---

## ❓ Getting Help

**For documentation questions:**
- Check this guide first
- Review relevant index files (`.specs/README.md`, `.docs/INDEX.md`)
- Contact the documentation team

**For technical questions:**
- Review API documentation: http://localhost:8000/docs
- Check code comments and docstrings
- Review test files for examples

**For product questions:**
- Read [.specs/blueprint.md](./.specs/blueprint.md)
- Check roadmap and success metrics
- Contact product team

---

## 📊 Documentation Statistics

**Total Documents:** 20+ files
**Total Reading Time:** ~5 hours (complete documentation)
**Last Major Update:** January 23, 2026
**Maintained By:** SALLY Product & Engineering Team

---

## 🎯 Core Philosophy

> **"We don't just route trucks. We route drivers with hours, fuel, and rest built into every mile."**

Documentation should be:
- **Clear and concise** - No fluff, get to the point
- **Well-organized** - Easy to navigate and find information
- **Audience-focused** - Tailored to who will read it
- **Up-to-date** - Reflects current state of the system
- **Actionable** - Helps readers accomplish their goals

---

**Last Updated:** January 23, 2026
**Maintained By:** SALLY Team

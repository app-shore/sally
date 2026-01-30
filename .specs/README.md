# SALLY Product Specifications

**Welcome to SALLY's product specifications directory.**

This directory contains feature-specific documentation, implementation status tracking, and strategic planning documents organized for easy navigation and maintenance.

**Last Updated:** 2026-01-30

---

## 🚀 Quick Start

### New to SALLY?

Read in this order:

1. **[PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md)** - 1-page summary (3 min)
2. **[blueprint.md](./blueprint.md)** - Complete product vision (20 min)
3. **Feature Specs** - Dive into specific features below

---

## 📁 Documentation Structure

```
.specs/
├── PRODUCT_OVERVIEW.md           # 1-page project summary
├── blueprint.md                  # Product vision & strategy
├── README.md                     # This file
│
├── features/                     # Feature-specific docs
│   ├── 01-route-planning/       # ✅ Complete
│   ├── 02-authentication/       # ✅ Complete
│   ├── 03-integrations/         # ⚠️ Partial (20% backend, 50% frontend)
│   ├── 04-alerts/               # ⚠️ Partial (40% backend, 20% frontend)
│   ├── 05-continuous-monitoring/ # ❌ Planned
│   ├── 06-route-wizard-ui/      # ✅ Complete
│   ├── 07-fleet-management/     # ⚠️ Partial
│   ├── 08-user-preferences/     # ❌ Planned (spec complete)
│   ├── 09-driver-portal/        # ⚠️ Partial
│   └── 10-rest-optimization/    # ✅ Complete (backend component)
│
├── planning/                     # Strategic plans
│   ├── POC_ENHANCEMENT_PLAN.md  # Phase 0 & 1 plan
│   ├── ROADMAP.md               # Long-term roadmap
│   └── PHASE_SUMMARIES.md       # Phase completion status
│
└── archive/                      # Historical documents
    └── (old implementation plans, status snapshots)
```

---

## 📊 Implementation Status at a Glance

| Feature | Backend | Frontend | Status | Priority |
|---------|---------|----------|--------|----------|
| **Route Planning** | ✅ 100% | ✅ 100% | Production ready | P0 (Core) |
| **Authentication** | ✅ 100% | ✅ 100% | Production ready | P0 (Core) |
| **Route Wizard UI** | N/A | ✅ 100% | Production ready | P0 (Core) |
| **REST Optimization** | ✅ 100% | ❌ 0% | Component only | P1 (Component) |
| **Integrations** | ⚠️ 20% | ⚠️ 50% | Mock APIs only | P1 (Phase 2) |
| **Alerts** | ⚠️ 40% | ⚠️ 20% | API only | P1 (Phase 2) |
| **Fleet Management** | ⚠️ 50% | ⚠️ 30% | Basic CRUD | P2 (Future) |
| **User Preferences** | ❌ 0% | ❌ 0% | Spec complete | P1 (Phase 2) |
| **Driver Portal** | ⚠️ 50% | ⚠️ 40% | Dashboard exists | P2 (Future) |
| **Continuous Monitoring** | ❌ 0% | N/A | Planning only | P1 (Phase 2) |

**Legend:**
- ✅ Complete (production ready)
- ⚠️ Partial (usable but incomplete)
- ❌ Planned (not started)

---

## 🎯 Core Features (Implemented)

### ✅ 1. Route Planning Engine
**Status:** Production ready

Generate optimized routes with HOS compliance built-in.

**What Works:**
- TSP optimization (stop sequence)
- HOS simulation (segment-by-segment)
- Automatic rest insertion (full 10h or partial 7h/8h)
- Automatic fuel insertion
- Zero HOS violations guaranteed

**Docs:** [features/01-route-planning/](./features/01-route-planning/)

---

### ✅ 2. Authentication & Multi-Tenancy
**Status:** Production ready

JWT-based auth with role-based access control.

**What Works:**
- Mock login (user lookup)
- JWT tokens (access + refresh)
- Role-based access (DISPATCHER, DRIVER, ADMIN)
- Tenant isolation at database level

**Docs:** [features/02-authentication/](./features/02-authentication/)

---

### ✅ 3. Route Wizard UI
**Status:** Production ready

Apple-level wizard for creating route plans.

**What Works:**
- Progressive workflow (Load → Driver → Vehicle → Results)
- Card-based UI with dark theme support
- HOS auto-fetch from Samsara mock
- Timeline view of route segments
- Responsive design (mobile, tablet, desktop)

**Docs:** [features/06-route-wizard-ui/](./features/06-route-wizard-ui/)

---

### ⚠️ 4. External Integrations
**Status:** Partial (Mock APIs only)

Integration framework for ELD, TMS, fuel, weather.

**What Works:**
- Database models complete
- CRUD API endpoints
- Mock Samsara HOS API
- Mock fuel price API
- Mock weather API

**What's Missing:**
- Real Samsara adapter (scaffold only)
- McLeod TMS adapter (not started)
- GasBuddy adapter (not started)
- OpenWeather adapter (not started)
- Background sync scheduler

**Docs:** [features/03-integrations/](./features/03-integrations/)

---

### ⚠️ 5. Alerts System
**Status:** Partial (API only, no auto-generation)

Automated dispatcher alerts for events.

**What Works:**
- Database model complete
- CRUD API endpoints
- Acknowledge/resolve endpoints

**What's Missing:**
- Alert generation engine
- Connection to monitoring service
- Alerts page UI
- In-app notifications

**Docs:** [features/04-alerts/](./features/04-alerts/)

---

### ❌ 6. Continuous Monitoring
**Status:** Planned (not implemented)

Background service monitoring 14 trigger types.

**Planned:**
- HOS compliance triggers (3 types)
- Driver behavior triggers (2 types)
- Route progress triggers (3 types)
- Vehicle state triggers (2 types)
- External condition triggers (4 types)

**Docs:** [features/05-continuous-monitoring/](./features/05-continuous-monitoring/)

---

### ❌ 7. User Preferences
**Status:** Planned (Specification complete)

Customizable user preferences for display, dashboard, alerts, and operational defaults.

**Planned:**
- **User Preferences (All Roles):** Display formats (units, time, currency), dashboard settings, alert preferences, accessibility
- **Dispatcher Preferences:** HOS defaults, compliance thresholds, optimization priorities, rest/fuel rules, alert thresholds
- **Driver Preferences:** Favorite locations, break preferences, route display settings, mobile preferences

**Key Benefits:**
- Different fleets can use different HOS rules and optimization priorities
- Users can customize units (miles/km), time format (12h/24h), and currency
- Alert fatigue reduced through customizable priority filters and quiet hours
- Accessibility support (font size, contrast, reduce motion)

**Estimated Effort:** 32-40 hours (~1 week sprint)

**Docs:** [features/08-user-preferences/](./features/08-user-preferences/)

---

## 📖 Feature Documentation Structure

Each feature folder contains:

```
features/XX-feature-name/
├── FEATURE_SPEC.md              # What it does, why it exists
├── IMPLEMENTATION_STATUS.md     # What's built, what's missing
├── API_ENDPOINTS.md             # API documentation (if applicable)
└── (other feature-specific docs)
```

---

## 🗺️ Product Roadmap

### Phase 0: Cleanup (✅ Complete)
- Removed obsolete pages (rest-optimizer, route-planner)
- Created unified Create Plan wizard
- Cleaned up 4 unused components
- Updated documentation

### Phase 1: POC Enhancement (⚠️ In Progress)
- ✅ Route planning with HOS compliance
- ✅ Authentication & multi-tenancy
- ✅ Route wizard UI
- ⚠️ External integrations (mock only)
- ❌ Continuous monitoring (not started)
- ❌ Alert generation (not started)

### Phase 2: Real Integrations (3 months)
- Real ELD/TMS/Fuel/Weather adapters
- Continuous monitoring service
- Alert generation engine
- Live tracking with maps

### Phase 3: Fleet Optimization (6 months)
- Multi-driver VRP solver
- Predictive ML (ETA, driver preferences)
- Advanced analytics dashboard

**Full Roadmap:** [planning/ROADMAP.md](./planning/ROADMAP.md)

---

## 💼 For Different Audiences

### For Product Managers
**Start here:**
1. [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) - High-level summary
2. [blueprint.md](./blueprint.md) - Complete vision
3. [planning/ROADMAP.md](./planning/ROADMAP.md) - Roadmap

**Focus on:** Problem, solution, go-to-market, competitive positioning

---

### For Engineers
**Start here:**
1. [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) - Context
2. [features/01-route-planning/](./features/01-route-planning/) - Core feature
3. Feature-specific IMPLEMENTATION_STATUS.md files

**Focus on:** Architecture, API design, implementation status

---

### For Stakeholders
**Start here:**
1. [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) - Overview
2. [planning/PHASE_SUMMARIES.md](./planning/PHASE_SUMMARIES.md) - Progress
3. [blueprint.md](./blueprint.md) - Vision

**Focus on:** Value proposition, roadmap, success metrics

---

## 🔗 Related Documentation

### Root Directory
- [/README.md](../README.md) - Project overview
- [/QUICKSTART.md](../QUICKSTART.md) - 5-minute setup
- [/DOCUMENTATION.md](../DOCUMENTATION.md) - Master documentation index

### Technical Docs
- [/.docs/INDEX.md](../.docs/INDEX.md) - Architecture documentation
- [/.docs/SETUP.md](../.docs/SETUP.md) - Setup instructions
- [/.docs/DEPLOY.md](../.docs/DEPLOY.md) - Deployment guide

---

## 🎯 Core Philosophy

> **"SALLY is a dispatch & driver coordination platform that generates optimized end-to-end plans, continuously monitors real-world conditions, and simplifies communication through automated alerts and dynamic route updates."**

**Key Principles:**
1. **HOS-Aware Routing** - Plans around driver hours, not just distance
2. **Compliance-First** - Zero violations, full audit trail
3. **Proactive Monitoring** - Alert before problems happen
4. **Dynamic Adaptation** - Re-plan when conditions change

---

## 📝 Maintaining This Directory

### When to Update Documents

**PRODUCT_OVERVIEW.md:**
- Major feature launches
- Product positioning changes
- Implementation status updates

**blueprint.md:**
- Product vision changes
- Market insights
- Pricing adjustments
- Roadmap updates

**Feature IMPLEMENTATION_STATUS.md:**
- When features are implemented
- When new limitations are discovered
- After each sprint/release

**Feature FEATURE_SPEC.md:**
- When requirements change
- When new use cases emerge
- After user feedback

---

## ❓ Questions?

**Product vision:** See [blueprint.md](./blueprint.md)

**Implementation status:** See feature-specific IMPLEMENTATION_STATUS.md files

**Architecture:** See [/.docs/INDEX.md](../.docs/INDEX.md)

**Setup/deployment:** See [/.docs/SETUP.md](../.docs/SETUP.md)

---

**Maintained By:** SALLY Product & Engineering Team

# SALLY Product Specifications

This directory contains the complete product specifications for SALLY: Intelligent Route Planning Platform for Truck Drivers.

---

## 📋 Document Guide

### Start Here

**New to SALLY?** Read documents in this order:

1. **[blueprint.md](./blueprint.md)** - Product vision, market positioning, and feature overview (20 min)
2. **[ROUTE_PLANNING_SPEC.md](./ROUTE_PLANNING_SPEC.md)** - Complete technical specification (45 min)
3. **[INTELLIGENT_OPTIMIZATION_FORMULA.md](./INTELLIGENT_OPTIMIZATION_FORMULA.md)** - REST optimization algorithm deep dive (30 min)

---

## 📚 Core Documents

### 1. blueprint.md - Product Vision & Strategy

**Audience:** Product Managers, Executives, Investors, Sales Team

**Purpose:** Defines what SALLY is, why it exists, and where it's going

**Key Sections:**
- **Problem Statement:** Why trucking needs intelligent route planning
- **Solution:** HOS-aware routing with dynamic updates
- **Core Features:** Route planning, rest optimization, fuel stops, dynamic updates
- **Market Positioning:** Category-creating platform (not TMS, not ELD)
- **Go-to-Market Strategy:** Entry wedge, sales motion, pricing
- **Roadmap:** Phase 1-5 (MVP → Fleet-wide → Live Data → Predictive Intelligence)
- **Success Metrics:** User adoption, compliance rates, ROI

**One-Line Summary:**
> "The first route planning platform built for truck drivers, not dispatchers—optimizes stop sequence, rest timing, fuel stops, and dynamically updates routes when reality doesn't match the plan."

---

### 2. ROUTE_PLANNING_SPEC.md - Technical Specification

**Audience:** Engineering Team, Architects, Backend/Frontend Developers

**Purpose:** Complete technical architecture and implementation specification

**Key Sections:**
- **System Architecture:** 3-layer system (Planning → Monitoring → Updates)
- **Route Planning Engine:** TSP optimization + HOS simulation
- **Continuous Monitoring Service:** 14 trigger types across 5 categories
- **Dynamic Update Handler:** Re-planning orchestration
- **REST Optimization Integration:** How rest decisions fit into route planning
- **Database Schema:** Complete models (RoutePlan, RouteSegment, RoutePlanUpdate, Stop)
- **API Endpoints:** All routes with request/response schemas
- **Data Flow:** Complete lifecycle from input to output

**System Architecture Overview:**
```
Route Planning (Initial) → Continuous Monitoring → Dynamic Updates → Re-Planning
         ↓                         ↓                      ↓              ↓
    Optimized route          14 trigger types      Threshold checks    New route v2
    with rest/fuel           monitored 24/7        decide re-plan      preserves history
```

---

### 3. INTELLIGENT_OPTIMIZATION_FORMULA.md - REST Algorithm

**Audience:** Developers, Product Managers, Compliance Team

**Purpose:** Deep dive into the intelligent REST optimization algorithm

**Key Sections:**
- **Feasibility Analysis:** Can driver complete remaining route with current hours?
- **Opportunity Scoring (0-100):** Quantifies value of extending rest at current location
- **Cost Calculation:** Time cost vs hours gained
- **Decision Engine Logic:** When to recommend FULL_REST, PARTIAL_REST, or NO_REST
- **Example Scenarios:** Real-world decision walkthroughs
- **Compliance Strategy:** Conservative defaults, audit-ready reasoning

**Core Algorithm:**
```
Feasibility Check → Opportunity Scoring → Cost-Benefit Analysis → Recommendation + Reasoning
```

**Decision Types:**
- **MANDATORY_REST:** Route not feasible without rest (100% confidence, cannot decline)
- **OPPORTUNISTIC_REST:** Route feasible but marginal (60-75% confidence, driver can decline)
- **NO_REST:** Route easily achievable with current hours (0% rest needed)

---

## 🏗️ System Architecture Summary

### Three-Layer Architecture

**Layer 1: Route Planning Engine** (Initial route generation)
- Input: Driver, truck, stops
- Output: Optimized route with rest/fuel stops
- Runs once when route is created

**Layer 2: Continuous Monitoring Service** (Background daemon)
- Monitors 14 trigger types across 5 categories
- Runs every 60 seconds per active route
- Proactive HOS monitoring (warn before violations)
- Reactive violation handling (force rest after violations)

**Layer 3: Dynamic Update Handler** (Re-planning orchestrator)
- Receives triggers from Layer 2
- Decides: Re-plan vs ETA update only
- Invokes Layer 1 to generate new route
- Notifies driver of changes

---

## 🎯 Product Evolution

### What SALLY Is Today

**Category:** Route Planning + Decision Intelligence Platform

**Target Users:**
- Drivers (following route plans, getting rest recommendations)
- Dispatchers/Ops Managers (creating routes, monitoring progress)

**Unique Value:**
> "The only route planning platform that understands drivers have hours, not infinite time."

**Core Differentiators:**
1. **HOS-Aware Routing:** Plans around driver hours, not just distance
2. **Automatic Rest Insertion:** Adds rest stops where HOS requires
3. **Continuous Monitoring:** Watches for 14 trigger types 24/7
4. **Dynamic Updates:** Re-plans when conditions change (dock delays, traffic, load changes)
5. **Fuel Optimization:** Inserts cheapest fuel stops on route
6. **Compliance-First:** Zero violations, full audit trail

---

## 📊 Key Features (MVP)

### 1. Route Planning Engine
- Optimizes stop sequence (TSP/VRP algorithms)
- Inserts rest stops where HOS requires
- Inserts fuel stops based on range and price
- Validates HOS compliance for entire route

**Example Output:**
```
1. Origin → Stop A (2h drive)
2. Stop A dock (2h)
3. Stop A → Truck Stop X (1h drive)
4. [REST: 10h at Truck Stop X] ← INSERTED
5. Truck Stop X → Stop B (3h drive)
6. Stop B dock (1h)
7. Stop B → Stop C (2h drive)
Total: 300 miles, 22h (incl. rest), HOS compliant ✅
```

### 2. Dynamic Update System

**Triggers:**
- **Dock Time Changes:** Actual dock time differs from estimate
- **Traffic Delays:** Real-time traffic alerts
- **Load Changes:** Stops added/cancelled mid-route
- **Driver Rest Requests:** "I want to rest here"

**Re-Plan Logic:**
- Compare impact vs threshold
- If minor (< 30min ETA change): Update ETAs only
- If major: Trigger full re-plan, may re-sequence stops

### 3. Intelligent Rest Management

**Types of Recommendations:**
- **Mandatory Rest:** Route not feasible without rest (100% confidence)
- **Opportunistic Rest:** Route feasible but marginal (60-75% confidence)
- **Dedicated Rest Stop:** Insert truck stop/service area as waypoint

**Rest Types:**
- **Full Rest (10h):** Resets all hours (11h drive + 14h duty)
- **Partial Rest (7h/8h):** Sleeper berth split (7/3 or 8/2)
- **Break (30min):** Required after 8h driving

---

## 🛠️ Technology Stack

### Backend
- **Language:** Python 3.11+
- **Framework:** FastAPI (async)
- **Optimization:** Custom TSP (greedy + 2-opt) → OR-Tools (Phase 2 for VRP)
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **ORM:** SQLAlchemy 2.0 (async)

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **State:** Zustand + React Query
- **UI:** Tailwind CSS + Shadcn/ui
- **Maps:** MapLibre or Leaflet

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Cloud:** AWS (Phase 2 deployment)

---

## 📖 Related Documentation

### Architecture Diagrams
Located in `/.docs/architecture/`:
- **C4 Model Diagrams:** System context, containers, components, code-level
- **Sequence Diagrams:** End-to-end flow
- **Deployment Diagrams:** Infrastructure
- **Data Flow Diagrams:** Data pipeline

See [/.docs/INDEX.md](../.docs/INDEX.md) for complete architecture documentation.

### Implementation Guides
Located in root directory:
- **[/README.md](../README.md):** Project overview and quick start
- **[/QUICKSTART.md](../QUICKSTART.md):** 5-minute setup guide
- **[/SETUP.md](../SETUP.md):** Detailed setup instructions
- **[/DEPLOY.md](../DEPLOY.md):** Deployment guide (Docker, Vercel, CapRover)

---

## 🗺️ Roadmap

### Phase 1: Single-Driver Route Planning (MVP - Current)
- Route planning engine (TSP + HOS simulation)
- Rest stop insertion
- Fuel stop insertion
- Dynamic updates (4 trigger types)
- Web dashboard (plan routes, monitor routes)
- **Goal:** Prove value with 5 pilot drivers

### Phase 2: Fleet-Wide Optimization (3 months)
- Multi-driver assignment (VRP solver)
- Load matching (which driver gets which load)
- Driver preferences (home time, regions)
- **Goal:** Scale to 50+ trucks per carrier

### Phase 3: Live Data Integration (3 months)
- ELD API integration (auto-populate HOS)
- TMS API integration (auto-pull stops)
- Telematics integration (live truck location)
- Google Maps Directions + Traffic API
- **Goal:** Fully automated route planning

### Phase 4: Predictive Intelligence (6 months)
- ML-based ETA prediction (learn from history)
- Driver preference learning (personalize recommendations)
- Lane-specific patterns (optimize by route)
- **Goal:** Self-optimizing system

---

## 📏 Success Criteria

### MVP (Phase 1)
- ✅ 5 pilot carriers (5–20 trucks each)
- ✅ 100 routes planned
- ✅ Zero HOS violations on planned routes
- ✅ 90% driver acceptance rate (on optional rest recommendations)
- ✅ <5s route optimization time (10 stops)
- ✅ Positive ROI (time saved + violations avoided > subscription cost)

### Phase 2 (Fleet-Wide)
- ✅ 10 paying customers (50–100 trucks each)
- ✅ 1,000 routes planned per week
- ✅ $100K ARR
- ✅ 80% renewal rate

### Phase 3 (Live Data)
- ✅ 50 customers
- ✅ 3 ELD integrations (Samsara, KeepTruckin, Omnitracs)
- ✅ 2 TMS integrations (McLeod, TMW)
- ✅ $500K ARR

---

## 💼 For Different Audiences

### For Product Managers
**Read:** blueprint.md (all sections)
**Focus on:** Problem statement, solution, go-to-market, roadmap

### For Engineering Leads
**Read:** ROUTE_PLANNING_SPEC.md (all sections)
**Focus on:** System architecture, core components, database schema, API design

### For Backend Developers
**Read:** ROUTE_PLANNING_SPEC.md + INTELLIGENT_OPTIMIZATION_FORMULA.md
**Focus on:** Route planning engine, HOS simulation, REST optimization logic

### For Frontend Developers
**Read:** ROUTE_PLANNING_SPEC.md (Section: Frontend Changes)
**Focus on:** UI components, state management, API integration

### For QA/Testing
**Read:** All three documents
**Focus on:** Example scenarios, edge cases, compliance requirements

### For Sales/Marketing
**Read:** blueprint.md (Sections: Problem, Solution, Go-to-Market, Pricing)
**Focus on:** Value proposition, competitive positioning, ROI calculations

---

## 📝 Document Maintenance

### When to Update Each Document

**blueprint.md:**
- Product vision changes
- New market insights
- Pricing adjustments
- Roadmap updates

**ROUTE_PLANNING_SPEC.md:**
- Architecture changes
- New trigger types added
- Database schema changes
- API endpoint changes

**INTELLIGENT_OPTIMIZATION_FORMULA.md:**
- REST algorithm updates
- Scoring logic changes
- New HOS rules

---

## 🗄️ Archive

**Location:** `.specs/archive/`

Contains historical documents from earlier product iterations:
- Old REST-only implementation summaries
- Deprecated technical specs
- Superseded implementation plans

**Note:** These documents are kept for historical reference only. The current product vision is documented in the three core documents above.

---

## ❓ Questions?

For questions about:
- **Product vision:** See blueprint.md
- **Architecture:** See ROUTE_PLANNING_SPEC.md
- **REST optimization:** See INTELLIGENT_OPTIMIZATION_FORMULA.md
- **Setup/deployment:** See root directory documentation

---

## 🎯 Core Philosophy

> **"Route planning isn't just about shortest distance—it's about HOS compliance, rest timing, fuel costs, and adapting to reality."**

> **"We don't just route trucks. We route drivers with hours, fuel, and rest built into every mile."**

**SALLY: Where routing meets reality.**

---

**Last Updated:** January 23, 2026
**Maintained By:** SALLY Product Team

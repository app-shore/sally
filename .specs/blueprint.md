# Dock-Time Rest Optimization Platform

## One-Line Idea

Turn unavoidable dock time into **FMCSA-compliant rest** so drivers can drive longer **when it actually matters**.

---

## Problem

In US trucking, drivers must take mandatory rest breaks (HOS rules). Today:

* Drivers wait hours at docks (loading/unloading)
* That time is often logged as on-duty and **not treated as rest**
* Drivers are forced to take additional breaks later
* Result: fragmented rest, lost driving hours, lower utilization

This is wasted time disguised as compliance.

---

## Core Insight

**Loading/unloading is already forced downtime.**
If post-load driving demand is low, forcing a separate long break later is inefficient.

Rest is not the problem.
**Bad timing of rest is the problem.**

---

## Solution

A compliance-aware decision engine that:

1. Detects dock time in real time
2. Predicts post-load driving demand
3. Evaluates HOS legality
4. Recommends **full / partial / no rest** at the dock
5. Logs decisions with audit-ready explanations

You don’t reduce rest.
You **move it to the right moment**.

---

## Product Definition

**Category:** Decision-intelligence layer (not TMS, not ELD)

**Primary Users:**

* Mid-size carriers (50–500 trucks)
* Ops managers & drivers

---

## Core Features (MVP)

### 1. Dock-Time-as-Rest Engine

* Identifies eligible dock periods
* Classifies rest as:

  * Full rest
  * Partial rest
  * Not eligible

### 2. Post-Load Drive Predictor

Uses:

* Remaining route length
* Appointment schedules
* Traffic & lane history

### 3. HOS Compliance Guardrail

* 11-hour driving rule
* 14-hour on-duty window
* 30-min break rule
* Sleeper berth splits (7/3, 8/2)

Every recommendation includes **legal reasoning**.

### 4. Driver App (Advisory)

* 🟢 Take full rest now
* 🟡 Partial rest recommended
* 🔴 Do not rest here

Optional “Why?” explanation.

### 5. Ops Dashboard

* Hours recovered
* Dock delay hotspots
* Compliance risk score
* Value recovered per lane

---

## System Architecture

### Data Inputs

* ELD duty status
* GPS & route data
* Dock timestamps (manual → automated)
* Appointments

### Core Services

* HOS Rule Engine
* Rest Optimization Engine
* Prediction Engine

### Outputs

* Driver recommendations
* Compliance logs
* Fleet analytics

---

## Tech Stack

* Backend: Python + FastAPI
* Rules Engine: Declarative Python rules
* Optimization: OR-Tools (phase 2)
* DB: PostgreSQL
* Cache: Redis
* Frontend Ops: React
* Driver App: React Native
* Cloud: AWS

---

## Optimization Logic (Simplified)

```
IF dock_time ≥ required_rest
AND post_load_drive ≤ threshold
AND sleeper_allowed
→ FULL REST

ELSE IF dock_time ≥ partial_rest
→ PARTIAL REST

ELSE
→ NO REST
```

**Objective:**
Maximize productive driving while minimizing idle time and compliance risk.

---

## Compliance Strategy

* Conservative defaults
* Advisory-only MVP (driver chooses)
* Full audit trail per recommendation
* Rule-based before ML

Make auditors bored.

---

## Pricing

* $25–40 per truck / month
* Pilot: free analysis of last 30 days
* Enterprise: compliance reports + API

---

## Go-To-Market

### Entry Wedge

* "We don’t replace your TMS"
* "We don’t dispatch"
* "We unlock lost hours"

### Sales Motion

1. Analyze historical trips
2. Show lost hours due to poor rest timing
3. Pilot with 5–10 trucks
4. Expand fleet-wide

---

## Competitive Reality

* Existing tools track HOS and routes
* None optimize **when rest should happen**
* This product sits between compliance and routing

Category-creating, not feature-competing.

---

## Roadmap

**Phase 1:** Advisory engine (MVP)
**Phase 2:** Predictive optimization
**Phase 3:** Automated ELD actions
**Phase 4:** Rest-as-a-Service API

---

## Risks

* Regulatory interpretation → solved via transparency
* Driver trust → solved via explainability
* ELD integrations → solved via advisory-first approach

---

## Final Framing

> We don’t reduce rest.
> We move it to where it actually makes sense.

Rest is not downtime.
**It’s a resource.**

# Landing Page Design

**Status:** Implemented
**Last validated:** 2026-02-12
**Source plans:** `_archive/2026-02-05-landing-page-operations-assistant.md`, `_archive/2026-02-05-landing-page-implementation-plan.md`

---

## Overview

The SALLY marketing landing page was redesigned to reposition the product from "route planning system" to "fleet operations assistant." The page emphasizes three core capabilities (Plan, Monitor, Coordinate) and introduces an "Ask SALLY" section showing practical Q&A use cases.

---

## Messaging Strategy

### Primary Framing

- **Before:** "Route planning system with HOS compliance"
- **After:** "Fleet operations assistant that coordinates dispatchers and drivers"

### Key Messaging Principles

1. **SALLY as active participant** -- "SALLY generates," "SALLY monitors," "SALLY decides"
2. **AI mentions: subtle** -- no "AI" in hero; "intelligent" in features; implies intelligence through "Ask SALLY"
3. **Coordination emphasis** -- new "Coordinate" capability card, "Coordination Gap" section, "Ask SALLY" two-way Q&A
4. **Dual audience** -- dispatcher pain points on left, driver pain points on right

---

## Page Structure (11 Sections)

### Section 1: Hero

- **Headline:** "SALLY" (gradient text)
- **Tagline:** "Your Fleet Operations Assistant"
- **Subtitle:** "Coordinate dispatchers and drivers with automated planning, continuous monitoring, and proactive alerts"
- **CTAs:** "Get Started" (primary) + "See How It Works" (scroll link)
- **Background:** Animated route visualization

### Section 2: Three Core Capabilities (New)

Three cards in a responsive grid:

1. **Plan** -- animated route-building SVG showing start -> stops -> rest -> fuel -> end
2. **Monitor** -- animated dashboard SVG with status indicators and data pulses
3. **Coordinate** -- animated split view (dispatcher left, driver right) with alert flow

### Section 3: The Coordination Gap (Updated)

- Side-by-side layout: Dispatcher pain points vs. Driver pain points
- Bottom divider: "The Gap SALLY Fills"
- Large "D" letter visuals for each side

### Section 4: One Platform. Zero Violations. (Kept)

- `AnimatedRoute` component showing detailed route planning animation
- Stats grid: 5-10 Stops Optimized | <5s Planning Time | 100% HOS Compliant | 24/7 Monitoring

### Section 5: Features -- Intelligence That Works For You (Reorganized)

Features organized by category with headers:
- **Planning** (3 cards): HOS-Aware Routing, Automatic Rest Insertion, Smart Fuel Optimization
- **Monitoring** (2 cards): Continuous Monitoring, Proactive Alerts
- **Compliance** (1 card): Zero Violations

### Section 6: Three Steps to Compliance (Kept)

Three numbered timeline cards with updated copy emphasizing SALLY as the actor.

### Section 7: Ask SALLY (New)

2x3 grid of Q&A cards:
- **Dispatcher questions:** Route status, re-plan reasoning, HOS limits approaching
- **Driver questions:** Rest stop recommendation, appointment feasibility, next stop details

Each card shows a question as header and a static visual mockup as answer.

### Section 8: Continuous Monitoring (Kept)

`MonitoringDashboard` component with "Always Watching. Always Ready." header.

### Section 9: Integration Ecosystem (Kept)

Center SALLY "Intelligence Layer" with three integration category cards (TMS, ELD, External Data).

### Section 10: ROI Calculator (Kept)

Interactive calculator showing fleet savings estimates.

### Section 11: Final CTA (Updated)

- **Title:** "Coordinate smarter, not harder"
- **Subtitle:** "Join fleets who've eliminated the coordination gap between dispatch and drivers"

---

## Components (Validated Against Code)

All landing page components are located at `apps/web/src/shared/components/common/landing/`:

| Component | Status |
|-----------|--------|
| `LandingPage.tsx` | Confirmed |
| `CapabilitiesSection.tsx` | Confirmed |
| `PlanAnimation.tsx` | Confirmed |
| `MonitorAnimation.tsx` | Confirmed |
| `CoordinateAnimation.tsx` | Confirmed |
| `AskSallySection.tsx` | Confirmed |
| `AnimatedRoute.tsx` | Confirmed |
| `FeatureCard.tsx` | Confirmed |
| `MonitoringDashboard.tsx` | Confirmed |
| `ROICalculator.tsx` | Confirmed |
| `ScrollReveal.tsx` | Confirmed |
| `FeaturesVisualJourney.tsx` | Confirmed |

### Additional Directories Found (Undocumented in Original Plans)

- `sally-canvas/` -- canvas-based animations (built, undocumented)
- `sally-nerve/` -- neural network style animations (built, undocumented)

---

## Sections Removed

- **Comparison Table (Traditional vs SALLY)** -- removed as too sales-heavy; capabilities and "Ask SALLY" sections better demonstrate value

---

## Animation Guidelines

- **Plan Animation:** 3-5 second loop, smooth path drawing
- **Monitor Animation:** Continuous subtle updates
- **Coordinate Animation:** 4-6 second loop showing full dispatcher-to-driver flow
- All animations use framer-motion and respect `prefers-reduced-motion`

---

## Design Standards Applied

- Dark mode support via semantic color tokens
- Responsive at all breakpoints (375px, 768px, 1440px)
- Shadcn UI components for all interactive elements
- Monochrome color palette (see `monochrome-design-system.md`)

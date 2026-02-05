# Landing Page Redesign: SALLY as Operations Assistant

**Date:** February 5, 2026
**Status:** Design Complete - Ready for Implementation
**Objective:** Reposition SALLY marketing landing page from "route planning system" to "fleet operations assistant" that coordinates dispatchers and drivers

---

## Problem Statement

The current landing page primarily emphasizes route planning and HOS compliance, but doesn't adequately convey that SALLY is an **operations assistant** that helps both dispatchers and drivers coordinate their work through:
- Automated planning
- Continuous monitoring
- Proactive alerts and two-way communication

This narrow framing misses the broader value proposition and fails to differentiate SALLY from traditional route planners.

---

## Design Goals

1. **Reframe primary value proposition** - From "route planner" to "operations assistant"
2. **Emphasize coordination** - Show how SALLY bridges the gap between dispatchers and drivers
3. **Demonstrate breadth** - Three core capabilities (Plan, Monitor, Coordinate)
4. **Maintain conversion elements** - Keep ROI calculator and strong CTAs
5. **Reduce sales-heavy content** - Remove comparison table, keep focus on capabilities
6. **Add conversational element** - New "Ask SALLY" section shows assistant nature

---

## Complete Page Structure

### Section 1: Hero (UPDATED)

**Visual:** Keep animated route background

**Content:**
- **Main Headline:** "SALLY" (gradient text, existing style)
- **Tagline:** "Your Fleet Operations Assistant"
- **Subtitle:** "Coordinate dispatchers and drivers with automated planning, continuous monitoring, and proactive alerts"
- **CTAs:**
  - Primary: "Get Started" (→ /login or dashboard based on auth)
  - Secondary: "See How It Works" (smooth scroll to #how-it-works)
- **Scroll Indicator:** Keep existing animated scroll indicator

**Key Changes:**
- Removed: "Stop planning routes. Start preventing violations."
- Removed: "The only platform that routes drivers, not trucks."
- Added: Operations assistant framing with coordination emphasis

---

### Section 2: Three Core Capabilities (NEW)

**Background:** `bg-background`

**Section Title:** Optional - "What SALLY Does" (or no title, let cards speak)

**Layout:** Three equal-width cards in a row (3-column grid)

**Card 1: Plan**
- **Icon/Animation:** Animated route building SVG
  - Start point (circle) → delivery stops (squares) → rest stop (plus icon) → fuel stop (fuel icon) → end point (target circle)
  - Path draws in smoothly, labels appear
  - Similar style to existing AnimatedRoute component
- **Title:** "Plan"
- **Description:** "Generate HOS-compliant routes with optimized stop sequences, automatic rest insertion, and fuel stops in seconds"

**Card 2: Monitor**
- **Icon/Animation:** Live monitoring dashboard SVG
  - Multiple routes/status indicators
  - Trigger types appearing/updating
  - Data flowing (animated dots/pulses)
  - Real-time status changes
- **Title:** "Monitor"
- **Description:** "Track every active route continuously with 14 trigger types monitored every 60 seconds across your entire fleet"

**Card 3: Coordinate**
- **Icon/Animation:** Alert coordination flow SVG
  - Left side: Dispatcher dashboard with alert notification appearing
  - Arrow/connection line
  - Right side: Driver app showing update received
  - Two-way coordination visual (dispatch → driver → dispatch)
- **Title:** "Coordinate"
- **Description:** "Alert dispatchers when intervention is needed and automatically update drivers when conditions change"

**Visual Style:**
- Cards with hover lift effect
- Dark mode support (bg-background, text-foreground)
- Animations loop continuously (subtle, not distracting)
- Icons/animations similar size to existing feature cards

---

### Section 3: The Coordination Gap (UPDATED)

**Background:** `bg-muted`

**Section Title:** "The Coordination Gap" (previously "The Broken Communication Line")

**Layout:** Keep existing side-by-side with large "D" letters

**Left Side: Dispatcher Pain**
- Manual HOS tracking across fleet
- No visibility into route feasibility
- Reactive problem solving
- Constant driver check-ins for status
- Hours spent on coordination calls

**Right Side: Driver Pain**
- No clear route plan from dispatch
- Manual rest timing decisions
- HOS violation stress
- Inefficient fuel stops
- Constant uncertainty about next steps

**Bottom Divider:**
- Keep dashed line visual
- Change text from "Communication Breakdown" to **"The Gap SALLY Fills"**

**Key Changes:**
- Title emphasizes "coordination" not just "communication"
- Pain points updated to focus on coordination failures
- Bottom divider positions SALLY as the solution

---

### Section 4: One Platform. Zero Violations. (KEEP)

**Background:** `bg-background`

**No structural changes - keep existing:**
- Section title: "One Platform. Zero Violations."
- Intro text: "Watch as SALLY plans an HOS-compliant route with optimized stops" (minor wording update)
- AnimatedRoute component (the detailed route animation)
- Stats grid below:
  - 5-10 Stops Optimized
  - <5s Planning Time
  - 100% HOS Compliant
  - 24/7 Monitoring

**Rationale:** This is the strongest visual demo and clearly shows the planning capability in action.

---

### Section 5: Features - Intelligence That Works For You (REORGANIZED)

**Background:** `bg-muted`

**Section Title:** Keep "Intelligence That Works For You"

**Layout:** Stacked sections with category headers (horizontal rows)

**Category 1: Planning**
- Header: "Automated Planning" or just "Planning"
- 3 cards in a row:
  1. **HOS-Aware Routing** (RouteIcon)
     - "Unlike traditional planners, SALLY optimizes routes with full awareness of driver hours of service limits"
  2. **Automatic Rest Insertion** (RestIcon)
     - "System detects when rest is needed and automatically inserts optimal rest stops before violations occur"
  3. **Smart Fuel Optimization** (FuelIcon)
     - "Find the best fuel stops based on price, location, and route efficiency"

**Category 2: Monitoring**
- Header: "Continuous Monitoring" or just "Monitoring"
- 2 cards in a row:
  1. **Continuous Monitoring** (MonitorIcon)
     - "14 trigger types monitored every 60 seconds to catch issues before they become problems"
  2. **Proactive Alerts** (AlertIcon)
     - "Dispatchers get notified instantly when driver intervention is needed or conditions change"

**Category 3: Compliance**
- Header: "Zero Violations" or just "Compliance"
- 1 card (centered):
  1. **Zero Violations** (ComplianceIcon)
     - "Proactive monitoring and dynamic updates ensure 100% HOS compliance on every route"

**Visual Changes:**
- Add category headers above each row (text-2xl, font-bold, mb-8)
- Maintain existing FeatureCard component styling
- Stagger animations by row (delay 0, 0.3, 0.6)

---

### Section 6: How It Works - Three Steps to Compliance (KEEP)

**Background:** `bg-background`

**Section Title:** Keep "Three Steps to Compliance"

**Three numbered cards with timeline - minor copy updates:**

**Step 1: Input & Plan**
- "Select driver, add stops, set priorities. **SALLY generates** an optimized, HOS-compliant route with automatic rest and fuel stops in seconds."
- (Added "SALLY" to emphasize assistant)

**Step 2: Monitor 24/7**
- Keep existing copy as-is
- "Activate monitoring to track 14 trigger types every 60 seconds. System watches HOS limits, traffic, weather, and operational changes continuously."

**Step 3: Adapt & Update**
- "When conditions change, **SALLY decides** whether to re-plan or update ETAs. **Drivers and dispatchers get instant notifications** with clear reasoning."
- (Emphasis on SALLY as decision-maker and two-way communication)

---

### Section 7: Ask SALLY (NEW)

**Background:** `bg-muted`

**Section Title:** "Ask SALLY Anything" or "SALLY Answers Your Questions"

**Intro Text:** "Dispatchers and drivers get instant answers about routes, compliance, and operations"

**Layout:** 2x3 grid (6 cards)

**Dispatcher Questions (Left 3 cards):**

1. **"Is Route #1247 on track?"**
   - Visual: Mini status card showing:
     - Route progress (e.g., "Stop 3 of 7")
     - Current ETA vs planned
     - Any active alerts
   - Style: Small dashboard mockup

2. **"Why was Route #1832 re-planned?"**
   - Visual: Reasoning card showing:
     - Trigger: "Dock delay detected"
     - Details: "3hr actual vs 1hr planned"
     - Action: "Route re-planned to maintain compliance"
   - Style: Alert card with audit trail

3. **"Which drivers are approaching HOS limits?"**
   - Visual: List of 2-3 driver cards:
     - Driver name + current hours
     - "2.5 hours remaining - Alert active"
     - "5.0 hours remaining - On track"
   - Style: Small driver status cards

**Driver Questions (Right 3 cards):**

4. **"Where should I take my 10-hour break?"**
   - Visual: Map snippet showing:
     - Current location (dot)
     - Recommended rest stop (plus icon)
     - "Love's Travel Stop - Exit 47"
     - "Optimal timing: 2.3 hours from now"
   - Style: Mini map with callout

5. **"Can I make my next appointment on time?"**
   - Visual: Timeline showing:
     - Current position
     - Remaining drive hours
     - Appointment time
     - Answer: "Yes - 1.2 hours buffer" (green) or "No - 30 min short" (red)
   - Style: Linear timeline with status indicator

6. **"What's my next stop after this delivery?"**
   - Visual: Next stop card:
     - Address: "Walmart DC - Columbus, OH"
     - ETA: "Today 6:45 PM"
     - Special note: "Dock opens at 6:00 PM"
   - Style: Stop detail card

**Card Styling:**
- Question as header (text-lg, font-semibold)
- Visual answer below (small mockup/illustration)
- Hover lift effect
- Dark mode support
- Border and subtle shadow

**Implementation Notes:**
- These are static mockups/illustrations, not interactive
- Use simplified versions of actual app UI patterns
- Keep visuals small and scannable
- SVG illustrations where possible for crispness

---

### Section 8: Continuous Monitoring (KEEP)

**Background:** `bg-gradient-to-b from-foreground to-foreground/90 text-primary-foreground`

**Section Title:** "Always Watching. Always Ready."

**Subtitle:** "**SALLY monitors** every active route continuously to catch and prevent issues before they impact your operations" (minor update to add "SALLY monitors")

**Content:** Keep existing MonitoringDashboard component

**No other changes needed**

---

### Section 9: Integration Ecosystem - Plugs The Gap (KEEP)

**Background:** `bg-muted`

**Section Title:** "Plugs The Gap"

**Subtitle:** "SALLY integrates with your existing systems to provide the intelligence layer they're missing"

**Content:** Keep existing integration visualization:
- Center: SALLY "Intelligence Layer" card
- Three integration category cards:
  1. TMS Systems (McLeod, TMW, SAP TM)
  2. ELD/Telematics (Samsara, KeepTruckin, Geotab)
  3. External Data (OPIS, Weather APIs, HERE Maps)

**No changes needed** - this section already supports operations assistant framing

---

### Section 10: ROI Calculator (KEEP)

**Background:** `bg-muted`

**Section Title:** "Calculate Your Savings"

**Subtitle:** "See how much SALLY can save your fleet by preventing HOS violations and improving efficiency"

**Content:** Keep existing ROICalculator component

**No changes needed**

---

### Section 11: Final CTA (UPDATED)

**Background:** `bg-primary text-primary-foreground`

**Section Title:** "Coordinate smarter, not harder"

**Subtitle:** "Join fleets who've eliminated the coordination gap between dispatch and drivers"

**CTA Button:**
- Text: "Go to Dashboard" (authenticated) / "Start Free Trial" (not authenticated)
- Style: Keep existing (large, rounded, hover scale)

**Bottom Text:** "Trusted by forward-thinking fleets"

**Key Changes:**
- Title changed from "Route drivers, not trucks"
- Subtitle emphasizes coordination gap elimination
- Reinforces operations assistant positioning

---

## Sections REMOVED

### Comparison Table (Traditional vs SALLY)
**Reason:** Too sales-heavy, doesn't fit assistant framing. The capabilities sections and "Ask SALLY" section better demonstrate value without direct comparison.

---

## Key Messaging Changes

### Primary Framing
- **Before:** Route planning system with HOS compliance
- **After:** Fleet operations assistant that coordinates dispatchers and drivers

### AI Mentions
- **Approach:** Subtle, not prominent
- Hero: No "AI" mention
- Features: Can mention "intelligent" decision-making
- Ask SALLY: Implies intelligence without explicitly saying "AI"
- Rationale: "AI" is oversold; focus on practical capabilities

### Coordination Emphasis
- Problem section renamed to "The Coordination Gap"
- New "Coordinate" capability card
- "Ask SALLY" section shows two-way communication
- Final CTA: "Coordinate smarter, not harder"

### Assistant Language
- "SALLY generates..." (not just "system generates")
- "SALLY monitors..."
- "SALLY decides..."
- "Ask SALLY" section demonstrates conversational nature
- Positions SALLY as active participant, not passive tool

---

## Design Principles Applied

### 1. YAGNI (You Aren't Gonna Need It)
- Removed comparison table (nice-to-have, not essential)
- Kept only sections that directly communicate value
- Avoided over-engineering the "Ask SALLY" section (static mockups, not interactive)

### 2. Progressive Disclosure
- Hero → Quick capabilities overview → Problem → Detailed solution → Features → Q&A → Deep dives
- Each section builds on the previous
- Visitors can stop at any level and understand value

### 3. Visual Hierarchy
- Three core capabilities get prominent placement (section 2)
- Route animation demo still prominent (section 4)
- Category headers organize features clearly
- New "Ask SALLY" section provides concrete examples

### 4. Conversion Optimization
- Kept ROI calculator (important for B2B conversion)
- Kept integration ecosystem (addresses "will this work with our stack?")
- Multiple CTAs throughout page
- Strong final CTA with updated messaging

---

## Technical Implementation Notes

### New Components Needed

1. **CapabilitiesSection.tsx**
   - Three cards: Plan, Monitor, Coordinate
   - Each with animated SVG icon
   - Responsive grid (1 col mobile, 3 col desktop)

2. **PlanAnimation.tsx** (for Plan card)
   - Simplified version of AnimatedRoute
   - Route building animation (start → stops → rest → fuel → end)
   - Looping animation

3. **MonitorAnimation.tsx** (for Monitor card)
   - Dashboard-style animation
   - Multiple routes with status indicators
   - Trigger detection simulation
   - Data flow animation

4. **CoordinateAnimation.tsx** (for Coordinate card)
   - Split view: Dispatcher left, Driver right
   - Alert appearing on dispatcher side
   - Connection line/arrow
   - Update appearing on driver side
   - Looping flow

5. **AskSallySection.tsx**
   - 6-card grid (2x3)
   - Question header + visual answer
   - Static mockups/illustrations for each answer
   - Responsive (1 col mobile, 2 col tablet, 3 col desktop)

6. **QuestionCard.tsx**
   - Reusable component for Ask SALLY cards
   - Props: question, visual (React node), userType (dispatcher/driver)
   - Hover effects, dark mode support

### Components to Update

1. **LandingPage.tsx**
   - Add CapabilitiesSection after hero
   - Update problem section title and content
   - Reorganize features section with category headers
   - Add AskSallySection after How It Works
   - Update final CTA copy
   - Remove ComparisonTable

2. **FeatureCard.tsx** (minor updates)
   - Ensure supports category grouping
   - May need to adjust spacing/layout

### Styling Considerations

- All new components must support dark mode
- Use semantic color tokens (bg-background, text-foreground, etc.)
- Responsive at all breakpoints (mobile, tablet, desktop)
- Animations: subtle, looping, performant
- Hover effects consistent with existing design
- Shadcn UI components for all interactive elements

### Animation Guidelines

- **Plan Animation:** 3-5 second loop, smooth path drawing
- **Monitor Animation:** Continuous subtle updates, not overwhelming
- **Coordinate Animation:** 4-6 second loop showing full flow
- All animations: Use framer-motion, respect prefers-reduced-motion
- Performance: RequestAnimationFrame, GPU acceleration where possible

---

## Success Metrics

### Messaging Clarity
- Visitors should understand SALLY is an operations assistant, not just route planner
- "Coordinate" capability should be as prominent as "Plan"
- Both dispatcher and driver value propositions clear

### User Understanding
- "Ask SALLY" section should demonstrate practical use cases
- Visitors can imagine themselves using SALLY
- Clear differentiation from TMS, ELD, and basic route planners

### Conversion Elements
- ROI calculator engagement (track interactions)
- CTA click-through rates
- Time on page (should increase with more relevant content)
- Scroll depth (ensure visitors reach key sections)

---

## Next Steps

1. **Review & Approve Design** - Validate all sections and messaging
2. **Create Implementation Plan** - Break down into tasks
3. **Build New Components** - CapabilitiesSection, animations, Ask SALLY section
4. **Update Existing Components** - LandingPage, problem section, features, CTA
5. **Test Responsive & Dark Mode** - All new sections
6. **Review & Iterate** - Get feedback, refine animations and copy
7. **Deploy** - Launch updated landing page

---

## Appendix: Copy Bank

### Alternative Headlines (if needed)
- "Your Fleet Operations Assistant"
- "Coordinate Dispatch and Drivers Seamlessly"
- "Operations Intelligence for Modern Fleets"

### Alternative CTAs
- "Coordinate smarter, not harder" ✓ (selected)
- "Your operations assistant awaits"
- "Eliminate the coordination gap"

### Tagline Options
- "Coordinate dispatchers and drivers with automated planning, continuous monitoring, and proactive alerts" ✓ (selected)
- "Automated planning, proactive monitoring, seamless coordination"
- "Plan routes. Monitor operations. Coordinate teams."

---

**Document Status:** Design Complete
**Ready for:** Implementation Planning
**Estimated Implementation:** 3-5 days (new components + updates)
**Priority:** High - Core marketing messaging update

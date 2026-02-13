# SALLY Product Launch Video v2 — Design Document

**Date:** February 13, 2026
**Audience:** Fleet owners & dispatchers (small-to-mid carriers, 20–100 trucks)
**Tone:** Cinematic, poetic — mirrors the SALLY Nerve landing page
**Duration:** 60 seconds (1800 frames at 30fps)
**Resolution:** 1920x1080, H.264 MP4

## Core Concept

The video mirrors the SALLY Nerve landing page narrative arc: Stillness → Signals → Awakening → Intelligence → Response → Certainty → Invitation.

Two product halves get equal weight:
1. **The Brain** — AI-powered route planning (Scene 4)
2. **The Nerve** — Real-time monitoring + AI conversational chat (Scene 5)

## Marketing Psychology Framework

- **PAS (Problem → Agitation → Solution)** — open with pain, not brand
- **Loss aversion** — lead with cost of failure ($16K/violation)
- **Mirror technique** — describe their exact daily chaos to build trust
- **Rule of three** — three reflexes, three stats
- **Show, don't tell** — animated sequences instead of bullet points
- **Concrete ROI** — end with numbers they can take to their boss

## Scene Breakdown

### Scene 1: Stillness (0–5s, 150 frames)
- Pure black background
- Single white dot appears center, softly pulsing with glow halo
- After ~60 frames, "SALLY" emerges from blur below the dot, letter by letter
- Minimal, mysterious. Something is waking up.

### Scene 2: Signals (5–15s, 300 frames)
- Dot remains. Thin signal lines radiate outward like neural connections
- Main text fades in: "Every minute, your fleet sends thousands of signals."
- Four signal examples appear staggered (muted text):
  - "Hours ticking down on a driver's clock"
  - "Weather shifting along I-40"
  - "A dock running 90 minutes behind"
  - "Fuel prices dropping two exits ahead"
- Beat. Then final line: "Right now, most of them go unheard."
- Copy matches the Nerve landing page exactly.

### Scene 3: Awakening (15–20s, 150 frames)
- Neural network suddenly lights up — nodes pulse outward from center
- Text: "What if your fleet could feel?"
- Then: "SALLY connects every signal into one nervous system."
- Network animation intensifies — connections forming between nodes

### Scene 4: The Brain — AI Route Planning (20–32s, 360 frames)
- Title: "PLAN" (large, bold) + subtitle "AI that thinks in hours, miles, and regulations."
- Animated dark map with grid lines
- Route builds step by step:
  1. Five stops appear sequentially with glowing dots and city labels
  2. Route line draws between them (optimized, not linear order)
  3. Rest stop auto-inserts between stops 3-4, labeled "10h Rest — HOS Compliant"
  4. Fuel stop auto-inserts, labeled "Fuel · $3.42/gal · Cheapest on route"
  5. HOS compliance bar along bottom — countdown runs but never hits zero
- Bottom ticker: "Optimized sequence · Auto rest · Smart fuel · Zero violations"

### Scene 5: The Nerve — Monitor + Respond + Converse (32–44s, 360 frames)
- Title: "MONITOR · RESPOND" + subtitle "A nervous system that never sleeps."
- **Part A — Alert Resolution (first 5s):**
  - Alert card slides in: "HOS Warning: Driver J. Smith — 45 min remaining" (yellow dot)
  - Transforms/resolves: "Route updated. Rest stop inserted at Mile 247." (green checkmark)
  - Text: "24/7 monitoring. Proactive, not reactive."
- **Part B — AI Chat (next 7s):**
  - SallyOrb appears center, pulsing (idle → listening → thinking → speaking)
  - Text: "It doesn't just monitor. It converses."
  - Chat exchange types in:
    - Dispatcher: "Can driver 14 make Memphis on time?"
    - Orb transitions to thinking state
    - SALLY: "Yes. 3.5 hours drive time. 1.2-hour buffer. HOS compliant through delivery."
    - Orb transitions to speaking/confident state

### Scene 6: Certainty (44–52s, 240 frames)
- Three stats count up with large animated numbers:
  - "$185,000+" saved annually (50-truck fleet)
  - "520" dispatcher hours recovered per year
  - "100%" HOS compliant
- Text below: "For fleets that refuse to fly blind."

### Scene 7: Invitation (52–60s, 240 frames)
- Everything fades. SallyOrb returns, pulsing softly.
- Text: "Give your fleet a nervous system."
- SALLY logo springs in
- CTA pill: "Request a demo → sally.dev"

## Visual Design

- **Background:** Pure black (#000000) throughout
- **Text:** White (#FFFFFF) primary, #A0A0A0 muted, #666666 dimmed
- **Status colors:** Red #EF4444, Yellow #EAB308, Green #22C55E, Blue #3B82F6
- **Font:** Inter (system-ui fallback)
- **Animation:** Remotion spring() + interpolate(), all inline styles
- **Neural network:** Animated nodes + connecting lines, white with low opacity

## New Components Needed

1. **PulsingDot** — Central dot with glow, configurable pulse speed
2. **NeuralNetwork** — Animated nodes + connections radiating from center
3. **SallyOrb** — Simplified version of landing page orb (idle/thinking/speaking states)
4. **MockChat** — Chat bubble exchange with typewriter effect
5. **HOSBar** — Horizontal progress bar showing hours remaining
6. **StatCounter** — Animated number with prefix/suffix and label

## Components to Reuse (from v1)

- AnimatedText (typewriter + fade modes)
- FadeIn (directional fade wrapper)
- GlowDot (route stops on map)
- MockMap (enhanced with rest/fuel stop insertions + HOS bar)
- Counter (base for StatCounter)
- theme.ts (color constants)

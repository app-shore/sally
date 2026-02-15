# SALLY Product Launch Video — Design Document

**Date**: 2026-02-13
**Type**: Remotion-based product video
**Status**: Approved

## Overview

30-45 second cinematic product launch video for SALLY, built with Remotion (React-based video framework). Target audience: fleet managers, dispatchers, and trucking company decision-makers.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Remotion 4.x | React/TypeScript, fits stack, real MP4 output |
| Tone | Sleek & cinematic | Dark bg, smooth animations, premium feel |
| Duration | ~35 seconds | Punchy teaser for landing pages / social |
| Visuals | Stylized UI mockups | React components, not screenshots |
| Location | `.worktrees/product-launch-video/` | Isolated worktree, dedicated branch |

## Scene Breakdown (6 scenes, ~35s)

### Scene 1: Logo Reveal (0-4s)
- Black → SALLY logo fades in with glow
- Tagline types in: "Your Fleet Operations Assistant"

### Scene 2: The Problem (4-9s)
- Text cards fade in sequence:
  - "Manual route planning wastes hours"
  - "HOS violations cost $16,000+ per incident"
  - "Dispatchers juggle 50+ drivers blind"

### Scene 3: Route Planning (9-17s)
- Dark stylized map with animated route line
- Stops appear as glowing dots
- Labels: "Optimized Stop Sequence" → "Auto Rest Stops" → "Fuel Stop Insertion"

### Scene 4: Real-Time Monitoring (17-24s)
- Stylized dispatcher dashboard (dark cards)
- Alert badges animate in: "HOS Warning", "Driver Stopped", "Dock Delay"
- Animated counter: "Routes Monitored: 24/7"

### Scene 5: Compliance (24-30s)
- Large animated "0" → "Zero HOS Violations"
- "Audit-ready compliance documentation"
- Checkmarks animate in

### Scene 6: CTA / Close (30-35s)
- Fade to black → SALLY logo larger
- "Plan smarter. Drive compliant. Sleep easy."
- CTA: "Get Started → sally.dev"

## Component Architecture

```
apps/product-video/
├── src/
│   ├── Root.tsx
│   ├── Video.tsx
│   ├── scenes/
│   │   ├── LogoReveal.tsx
│   │   ├── TheProblem.tsx
│   │   ├── RoutePlanning.tsx
│   │   ├── Monitoring.tsx
│   │   ├── Compliance.tsx
│   │   └── CallToAction.tsx
│   ├── components/
│   │   ├── AnimatedText.tsx
│   │   ├── MockMap.tsx
│   │   ├── MockDashboard.tsx
│   │   ├── Counter.tsx
│   │   ├── GlowDot.tsx
│   │   └── SallyLogo.tsx
│   └── styles/
│       └── global.css
├── package.json
├── remotion.config.ts
└── tsconfig.json
```

## Visual Design

- **Background**: #000000 (pure black)
- **Primary text**: #FFFFFF
- **Secondary text**: #A0A0A0
- **Accent**: White glow (blur + opacity)
- **Route line**: White gradient
- **Status colors**: Subtle red/yellow/green (badges only)
- **Font**: Inter

## Animation Principles

- `spring()` for all entrances
- `interpolate()` for fades and slides
- Staggered delays: 150-200ms between items
- No harsh cuts — everything flows

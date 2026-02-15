# SALLY Product Launch Video — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 35-second cinematic product launch video for SALLY using Remotion, rendered as MP4.

**Architecture:** Standalone Remotion app inside the monorepo at `apps/product-video/`. Uses `<Series>` to chain 6 scene components sequentially. Each scene uses `spring()` and `interpolate()` for animations. All styling is inline (Remotion doesn't support Tailwind CSS animations — only inline styles work).

**Tech Stack:** Remotion 4.x, React 18, TypeScript, pnpm

---

## Pre-Implementation: Worktree Setup

### Task 0: Create branch and worktree

**Step 1: Create the branch**

```bash
cd /Users/ajay-admin/sally
git branch product-launch-video
```

**Step 2: Create the worktree**

```bash
git worktree add .worktrees/product-launch-video product-launch-video
```

**Step 3: Verify**

```bash
ls .worktrees/product-launch-video/
```

Expected: Full repo checkout on the `product-launch-video` branch.

All subsequent work happens inside `.worktrees/product-launch-video/`.

---

## Task 1: Scaffold Remotion Project

**Files:**
- Create: `apps/product-video/package.json`
- Create: `apps/product-video/tsconfig.json`
- Create: `apps/product-video/src/index.ts`
- Create: `apps/product-video/src/Root.tsx`

**Step 1: Create package.json**

```json
{
  "name": "@sally/product-video",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "studio": "remotion studio src/index.ts",
    "render": "remotion render src/index.ts SallyLaunchVideo out/sally-launch.mp4",
    "preview": "remotion preview src/index.ts"
  },
  "dependencies": {
    "@remotion/cli": "4.0.261",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "remotion": "4.0.261"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.9.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create src/index.ts**

This is the Remotion entry point that registers the root component.

```ts
import { registerRoot } from "remotion";
import { Root } from "./Root";

registerRoot(Root);
```

**Step 4: Create src/Root.tsx**

The main composition definition. 1050 frames = 35 seconds at 30fps.

```tsx
import { Composition } from "remotion";
import { SallyLaunchVideo } from "./Video";

export const Root: React.FC = () => {
  return (
    <Composition
      id="SallyLaunchVideo"
      component={SallyLaunchVideo}
      durationInFrames={1050}
      width={1920}
      height={1080}
      fps={30}
    />
  );
};
```

**Step 5: Install dependencies**

```bash
cd /Users/ajay-admin/sally/.worktrees/product-launch-video/apps/product-video
pnpm install
```

**Step 6: Commit**

```bash
git add apps/product-video/package.json apps/product-video/tsconfig.json apps/product-video/src/
git commit -m "feat(product-video): scaffold Remotion project structure"
```

---

## Task 2: Shared Animation Components

**Files:**
- Create: `apps/product-video/src/components/AnimatedText.tsx`
- Create: `apps/product-video/src/components/FadeIn.tsx`
- Create: `apps/product-video/src/components/Counter.tsx`
- Create: `apps/product-video/src/components/GlowDot.tsx`
- Create: `apps/product-video/src/lib/theme.ts`

**Step 1: Create theme constants**

`apps/product-video/src/lib/theme.ts`:

```ts
export const theme = {
  bg: "#000000",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  dimmed: "#666666",
  accent: "#FFFFFF",
  alertRed: "#EF4444",
  alertYellow: "#EAB308",
  alertGreen: "#22C55E",
  font: "Inter, system-ui, sans-serif",
} as const;
```

**Step 2: Create AnimatedText component**

`apps/product-video/src/components/AnimatedText.tsx`:

Handles two modes: typewriter (character-by-character reveal) and fade (opacity + slide).

```tsx
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { theme } from "../lib/theme";

type AnimatedTextProps = {
  text: string;
  mode?: "typewriter" | "fade";
  fontSize?: number;
  color?: string;
  delay?: number;
  style?: React.CSSProperties;
};

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  mode = "fade",
  fontSize = 48,
  color = theme.text,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (mode === "typewriter") {
    const charsToShow = interpolate(
      frame - delay,
      [0, text.length * 2],
      [0, text.length],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return (
      <div
        style={{
          fontFamily: theme.font,
          fontSize,
          color,
          letterSpacing: "-0.02em",
          ...style,
        }}
      >
        {text.slice(0, Math.floor(charsToShow))}
        {Math.floor(charsToShow) < text.length && (
          <span style={{ opacity: frame % 15 < 8 ? 1 : 0 }}>|</span>
        )}
      </div>
    );
  }

  // Fade mode
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 100, stiffness: 200 },
  });
  const y = interpolate(translateY, [0, 1], [20, 0]);

  return (
    <div
      style={{
        fontFamily: theme.font,
        fontSize,
        color,
        opacity,
        transform: `translateY(${y}px)`,
        letterSpacing: "-0.02em",
        ...style,
      }}
    >
      {text}
    </div>
  );
};
```

**Step 3: Create FadeIn wrapper component**

`apps/product-video/src/components/FadeIn.tsx`:

```tsx
import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

type FadeInProps = {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "none";
  style?: React.CSSProperties;
};

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  direction = "up",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const progress = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 100, stiffness: 200 },
  });

  const offsetMap = { up: [30, 0], down: [-30, 0], none: [0, 0] };
  const translateY = interpolate(progress, [0, 1], offsetMap[direction]);

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)`, ...style }}>
      {children}
    </div>
  );
};
```

**Step 4: Create Counter component**

`apps/product-video/src/components/Counter.tsx`:

Animated number that counts from 0 to target value.

```tsx
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { theme } from "../lib/theme";

type CounterProps = {
  from?: number;
  to: number;
  suffix?: string;
  prefix?: string;
  fontSize?: number;
  delay?: number;
  duration?: number;
};

export const Counter: React.FC<CounterProps> = ({
  from = 0,
  to,
  suffix = "",
  prefix = "",
  fontSize = 120,
  delay = 0,
  duration = 30,
}) => {
  const frame = useCurrentFrame();
  const value = interpolate(frame - delay, [0, duration], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily: theme.font,
        fontSize,
        fontWeight: 800,
        color: theme.text,
        letterSpacing: "-0.04em",
      }}
    >
      {prefix}
      {Math.round(value)}
      {suffix}
    </div>
  );
};
```

**Step 5: Create GlowDot component**

`apps/product-video/src/components/GlowDot.tsx`:

Glowing dot for route stops on the map.

```tsx
import React from "react";
import { useCurrentFrame, spring, useVideoConfig } from "remotion";

type GlowDotProps = {
  x: number;
  y: number;
  delay?: number;
  size?: number;
  color?: string;
  label?: string;
};

export const GlowDot: React.FC<GlowDotProps> = ({
  x,
  y,
  delay = 0,
  size = 12,
  color = "#FFFFFF",
  label,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 80, stiffness: 300 },
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}
    >
      {/* Glow */}
      <div
        style={{
          width: size * 3,
          height: size * 3,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: 0.15,
          filter: "blur(8px)",
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Dot */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          position: "relative",
        }}
      />
      {/* Label */}
      {label && (
        <div
          style={{
            position: "absolute",
            top: size + 8,
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 14,
            color: "#A0A0A0",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
```

**Step 6: Commit**

```bash
git add apps/product-video/src/components/ apps/product-video/src/lib/
git commit -m "feat(product-video): add shared animation components and theme"
```

---

## Task 3: Scene 1 — Logo Reveal

**Files:**
- Create: `apps/product-video/src/scenes/LogoReveal.tsx`

**Step 1: Implement LogoReveal**

Duration: 120 frames (4 seconds). Black screen → logo scales in with spring → tagline types in.

```tsx
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { theme } from "../lib/theme";

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo scale: starts at 0, springs to 1
  const logoScale = spring({
    fps,
    frame: frame - 15,
    config: { damping: 80, stiffness: 200 },
  });

  // Logo glow opacity
  const glowOpacity = interpolate(frame, [15, 40], [0, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Glow behind logo */}
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          backgroundColor: theme.text,
          opacity: glowOpacity,
          filter: "blur(80px)",
        }}
      />

      {/* Logo text */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: theme.font,
            fontSize: 96,
            fontWeight: 800,
            color: theme.text,
            letterSpacing: "-0.04em",
          }}
        >
          SALLY
        </div>
      </div>

      {/* Tagline */}
      <div style={{ position: "absolute", bottom: 380 }}>
        <AnimatedText
          text="Your Fleet Operations Assistant"
          mode="typewriter"
          fontSize={28}
          color={theme.muted}
          delay={50}
        />
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
git add apps/product-video/src/scenes/LogoReveal.tsx
git commit -m "feat(product-video): add logo reveal scene"
```

---

## Task 4: Scene 2 — The Problem

**Files:**
- Create: `apps/product-video/src/scenes/TheProblem.tsx`

**Step 1: Implement TheProblem**

Duration: 150 frames (5 seconds). Three pain-point text cards appear in sequence with staggered fade-in.

```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { FadeIn } from "../components/FadeIn";
import { theme } from "../lib/theme";

const problems = [
  "Manual route planning wastes hours",
  "HOS violations cost $16,000+ per incident",
  "Dispatchers juggle 50+ drivers blind",
];

export const TheProblem: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 48,
        }}
      >
        <FadeIn delay={0}>
          <AnimatedText
            text="The Problem"
            fontSize={24}
            color={theme.dimmed}
            mode="fade"
            delay={0}
            style={{ textTransform: "uppercase", letterSpacing: "0.2em" }}
          />
        </FadeIn>

        {problems.map((problem, i) => (
          <AnimatedText
            key={problem}
            text={problem}
            fontSize={44}
            color={theme.text}
            mode="fade"
            delay={20 + i * 30}
            style={{ fontWeight: 600 }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
git add apps/product-video/src/scenes/TheProblem.tsx
git commit -m "feat(product-video): add problem statement scene"
```

---

## Task 5: Scene 3 — Route Planning

**Files:**
- Create: `apps/product-video/src/scenes/RoutePlanning.tsx`
- Create: `apps/product-video/src/components/MockMap.tsx`

**Step 1: Create MockMap component**

Stylized dark map with animated route line and glowing stops.

```tsx
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { GlowDot } from "./GlowDot";
import { theme } from "../lib/theme";

// Simplified route points (relative positions within 800x500 container)
const stops = [
  { x: 80, y: 400, label: "Dallas, TX" },
  { x: 250, y: 280, label: "Oklahoma City" },
  { x: 420, y: 180, label: "Wichita, KS" },
  { x: 560, y: 100, label: "Kansas City" },
  { x: 720, y: 80, label: "Chicago, IL" },
];

// SVG path through the stops
const pathD = "M 80 400 C 150 340, 200 300, 250 280 C 320 240, 370 200, 420 180 C 480 150, 520 120, 560 100 C 620 85, 680 80, 720 80";

export const MockMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the route line drawing
  const pathProgress = interpolate(frame, [0, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        width: 800,
        height: 500,
      }}
    >
      {/* Grid lines for map feel */}
      <svg width={800} height={500} style={{ position: "absolute" }}>
        {/* Subtle grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <React.Fragment key={i}>
            <line
              x1={i * 80}
              y1={0}
              x2={i * 80}
              y2={500}
              stroke="#1a1a1a"
              strokeWidth={1}
            />
            <line
              x1={0}
              y1={i * 50}
              x2={800}
              y2={i * 50}
              stroke="#1a1a1a"
              strokeWidth={1}
            />
          </React.Fragment>
        ))}

        {/* Route line */}
        <path
          d={pathD}
          fill="none"
          stroke={theme.text}
          strokeWidth={2}
          strokeDasharray="1200"
          strokeDashoffset={1200 * (1 - pathProgress)}
          opacity={0.6}
        />
      </svg>

      {/* Stop dots */}
      {stops.map((stop, i) => (
        <GlowDot
          key={stop.label}
          x={stop.x}
          y={stop.y}
          label={stop.label}
          delay={15 + i * 18}
          size={10}
        />
      ))}
    </div>
  );
};
```

**Step 2: Implement RoutePlanning scene**

Duration: 240 frames (8 seconds).

```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { MockMap } from "../components/MockMap";
import { AnimatedText } from "../components/AnimatedText";
import { FadeIn } from "../components/FadeIn";
import { theme } from "../lib/theme";

const features = [
  { text: "Optimized Stop Sequence", delay: 60 },
  { text: "Auto Rest Stops", delay: 100 },
  { text: "Fuel Stop Insertion", delay: 140 },
];

export const RoutePlanning: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
        }}
      >
        <FadeIn delay={0}>
          <AnimatedText
            text="Intelligent Route Planning"
            fontSize={40}
            color={theme.text}
            mode="fade"
            style={{ fontWeight: 700 }}
          />
        </FadeIn>

        <MockMap />

        {/* Feature labels below the map */}
        <div
          style={{
            display: "flex",
            gap: 60,
            marginTop: 20,
          }}
        >
          {features.map((f) => (
            <FadeIn key={f.text} delay={f.delay}>
              <div
                style={{
                  fontFamily: theme.font,
                  fontSize: 18,
                  color: theme.muted,
                  padding: "8px 20px",
                  border: `1px solid #333`,
                  borderRadius: 24,
                }}
              >
                {f.text}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Step 3: Commit**

```bash
git add apps/product-video/src/scenes/RoutePlanning.tsx apps/product-video/src/components/MockMap.tsx
git commit -m "feat(product-video): add route planning scene with animated map"
```

---

## Task 6: Scene 4 — Real-Time Monitoring

**Files:**
- Create: `apps/product-video/src/scenes/Monitoring.tsx`
- Create: `apps/product-video/src/components/MockDashboard.tsx`

**Step 1: Create MockDashboard component**

Stylized alert cards that pop in.

```tsx
import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { theme } from "../lib/theme";

type Alert = {
  type: "warning" | "danger" | "info";
  title: string;
  description: string;
};

const alerts: Alert[] = [
  { type: "warning", title: "HOS Warning", description: "Driver J. Smith — 45 min remaining" },
  { type: "danger", title: "Driver Stopped", description: "Unit #847 — stationary 22 min" },
  { type: "info", title: "Dock Delay", description: "Stop #3 — 40 min wait detected" },
];

const colorMap = {
  warning: theme.alertYellow,
  danger: theme.alertRed,
  info: "#3B82F6",
};

export const MockDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 600 }}>
      {alerts.map((alert, i) => {
        const delay = 10 + i * 20;
        const scale = spring({
          fps,
          frame: Math.max(0, frame - delay),
          config: { damping: 80, stiffness: 200 },
        });
        const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={alert.title}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 24px",
              borderRadius: 12,
              border: "1px solid #222",
              backgroundColor: "#0a0a0a",
              transform: `scale(${scale})`,
              opacity,
            }}
          >
            {/* Status dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: colorMap[alert.type],
                boxShadow: `0 0 8px ${colorMap[alert.type]}`,
              }}
            />
            <div>
              <div
                style={{
                  fontFamily: theme.font,
                  fontSize: 18,
                  fontWeight: 600,
                  color: theme.text,
                }}
              >
                {alert.title}
              </div>
              <div
                style={{
                  fontFamily: theme.font,
                  fontSize: 14,
                  color: theme.muted,
                  marginTop: 2,
                }}
              >
                {alert.description}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

**Step 2: Implement Monitoring scene**

Duration: 210 frames (7 seconds).

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { MockDashboard } from "../components/MockDashboard";
import { AnimatedText } from "../components/AnimatedText";
import { FadeIn } from "../components/FadeIn";
import { theme } from "../lib/theme";

export const Monitoring: React.FC = () => {
  const frame = useCurrentFrame();

  // "24/7" counter effect
  const monitorProgress = interpolate(frame, [80, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
        }}
      >
        <FadeIn delay={0}>
          <AnimatedText
            text="Real-Time Monitoring"
            fontSize={40}
            color={theme.text}
            mode="fade"
            style={{ fontWeight: 700 }}
          />
        </FadeIn>

        <MockDashboard />

        {/* 24/7 badge */}
        <FadeIn delay={80}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 16,
            }}
          >
            {/* Pulsing dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: theme.alertGreen,
                boxShadow: `0 0 8px ${theme.alertGreen}`,
              }}
            />
            <div
              style={{
                fontFamily: theme.font,
                fontSize: 20,
                color: theme.muted,
                opacity: monitorProgress,
              }}
            >
              Monitoring 24/7 — Every 60 seconds
            </div>
          </div>
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
};
```

**Step 3: Commit**

```bash
git add apps/product-video/src/scenes/Monitoring.tsx apps/product-video/src/components/MockDashboard.tsx
git commit -m "feat(product-video): add real-time monitoring scene with alert cards"
```

---

## Task 7: Scene 5 — Compliance

**Files:**
- Create: `apps/product-video/src/scenes/Compliance.tsx`

**Step 1: Implement Compliance scene**

Duration: 180 frames (6 seconds). Big animated "0" with compliance messaging.

```tsx
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { FadeIn } from "../components/FadeIn";
import { theme } from "../lib/theme";

const checkmarks = [
  "Proactive HOS monitoring",
  "Automatic rest stop insertion",
  "Audit-ready documentation",
];

export const Compliance: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Big "0" springs in
  const zeroScale = spring({
    fps,
    frame: frame - 10,
    config: { damping: 60, stiffness: 150, mass: 1.2 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Big zero */}
        <div
          style={{
            fontFamily: theme.font,
            fontSize: 180,
            fontWeight: 800,
            color: theme.text,
            letterSpacing: "-0.04em",
            transform: `scale(${zeroScale})`,
            lineHeight: 1,
          }}
        >
          0
        </div>

        <AnimatedText
          text="Zero HOS Violations"
          fontSize={36}
          color={theme.text}
          mode="fade"
          delay={30}
          style={{ fontWeight: 600 }}
        />

        {/* Checkmarks */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginTop: 24,
          }}
        >
          {checkmarks.map((item, i) => (
            <FadeIn key={item} delay={50 + i * 15}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: theme.font,
                  fontSize: 20,
                  color: theme.muted,
                }}
              >
                <span style={{ color: theme.alertGreen }}>✓</span>
                {item}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
git add apps/product-video/src/scenes/Compliance.tsx
git commit -m "feat(product-video): add compliance scene with animated zero"
```

---

## Task 8: Scene 6 — Call to Action

**Files:**
- Create: `apps/product-video/src/scenes/CallToAction.tsx`

**Step 1: Implement CallToAction scene**

Duration: 150 frames (5 seconds). Logo returns, tagline, CTA.

```tsx
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { theme } from "../lib/theme";

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    fps,
    frame: frame - 10,
    config: { damping: 80, stiffness: 200 },
  });

  const glowOpacity = interpolate(frame, [10, 50], [0, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaOpacity = interpolate(frame, [70, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          backgroundColor: theme.text,
          opacity: glowOpacity,
          filter: "blur(100px)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          transform: `scale(${logoScale})`,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontFamily: theme.font,
            fontSize: 80,
            fontWeight: 800,
            color: theme.text,
            letterSpacing: "-0.04em",
          }}
        >
          SALLY
        </div>

        {/* Tagline */}
        <AnimatedText
          text="Plan smarter. Drive compliant. Sleep easy."
          fontSize={28}
          color={theme.muted}
          mode="fade"
          delay={30}
        />
      </div>

      {/* CTA */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          opacity: ctaOpacity,
        }}
      >
        <div
          style={{
            fontFamily: theme.font,
            fontSize: 22,
            color: theme.text,
            padding: "14px 40px",
            border: `1px solid #444`,
            borderRadius: 32,
            letterSpacing: "0.05em",
          }}
        >
          Get Started → sally.dev
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
git add apps/product-video/src/scenes/CallToAction.tsx
git commit -m "feat(product-video): add call-to-action closing scene"
```

---

## Task 9: Wire Up Main Video Composition

**Files:**
- Create: `apps/product-video/src/Video.tsx`

**Step 1: Create the main video composition**

Uses `<Series>` to chain all 6 scenes sequentially.

```tsx
import React from "react";
import { Series } from "remotion";
import { LogoReveal } from "./scenes/LogoReveal";
import { TheProblem } from "./scenes/TheProblem";
import { RoutePlanning } from "./scenes/RoutePlanning";
import { Monitoring } from "./scenes/Monitoring";
import { Compliance } from "./scenes/Compliance";
import { CallToAction } from "./scenes/CallToAction";

export const SallyLaunchVideo: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={120}>
        <LogoReveal />
      </Series.Sequence>
      <Series.Sequence durationInFrames={150}>
        <TheProblem />
      </Series.Sequence>
      <Series.Sequence durationInFrames={240}>
        <RoutePlanning />
      </Series.Sequence>
      <Series.Sequence durationInFrames={210}>
        <Monitoring />
      </Series.Sequence>
      <Series.Sequence durationInFrames={180}>
        <Compliance />
      </Series.Sequence>
      <Series.Sequence durationInFrames={150}>
        <CallToAction />
      </Series.Sequence>
    </Series>
  );
};
```

**Step 2: Verify frame count**

120 + 150 + 240 + 210 + 180 + 150 = **1050 frames** = 35 seconds at 30fps ✓

**Step 3: Commit**

```bash
git add apps/product-video/src/Video.tsx
git commit -m "feat(product-video): wire up all scenes into main video composition"
```

---

## Task 10: Test and Render

**Step 1: Open Remotion Studio for preview**

```bash
cd /Users/ajay-admin/sally/.worktrees/product-launch-video/apps/product-video
pnpm studio
```

Expected: Browser opens at `http://localhost:3000` with Remotion Studio. You should see the `SallyLaunchVideo` composition listed and can scrub through all 1050 frames.

**Step 2: Visual review**

Scrub through each scene and verify:
- Scene 1 (0-4s): Logo fades in with glow, tagline types in
- Scene 2 (4-9s): Three problem statements appear sequentially
- Scene 3 (9-17s): Map with route line animation and stop dots
- Scene 4 (17-24s): Alert cards pop in, 24/7 badge appears
- Scene 5 (24-30s): Big "0" springs in, checkmarks appear
- Scene 6 (30-35s): Logo returns, tagline, CTA button

**Step 3: Render to MP4**

```bash
pnpm render
```

Expected: Video file at `apps/product-video/out/sally-launch.mp4` (~35 seconds, 1920x1080, H.264).

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(product-video): complete SALLY product launch video"
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 0 | Create branch + worktree | 1 min |
| 1 | Scaffold Remotion project | 3 min |
| 2 | Shared animation components | 5 min |
| 3 | Scene 1: Logo Reveal | 3 min |
| 4 | Scene 2: The Problem | 3 min |
| 5 | Scene 3: Route Planning + Map | 5 min |
| 6 | Scene 4: Monitoring + Dashboard | 5 min |
| 7 | Scene 5: Compliance | 3 min |
| 8 | Scene 6: Call to Action | 3 min |
| 9 | Wire up main Video composition | 2 min |
| 10 | Test in Studio + Render MP4 | 5 min |

# SALLY Product Launch Video v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the 60-second cinematic product launch video to mirror the SALLY Nerve landing page narrative, balancing AI route planning and real-time monitoring with conversational AI chat.

**Architecture:** Replace all 6 existing scenes with 7 new scenes following the Nerve narrative arc (Stillness → Signals → Awakening → Brain → Nerve → Certainty → Invitation). Reuse existing animation primitives (AnimatedText, FadeIn, GlowDot, Counter). Add 5 new components (PulsingDot, NeuralNetwork, SallyOrb, MockChat, HOSBar). Update Root.tsx to 1800 frames (60s at 30fps).

**Tech Stack:** Remotion 4.x, React 18, TypeScript, pnpm (existing setup)

---

## Task 1: Add New Shared Components — PulsingDot + NeuralNetwork

**Files:**
- Create: `apps/product-video/src/components/PulsingDot.tsx`
- Create: `apps/product-video/src/components/NeuralNetwork.tsx`
- Modify: `apps/product-video/src/lib/theme.ts` — add blue color

**Step 1: Update theme with blue color**

Add `alertBlue` to `apps/product-video/src/lib/theme.ts`:

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
  alertBlue: "#3B82F6",
  font: "Inter, system-ui, sans-serif",
} as const;
```

**Step 2: Create PulsingDot component**

`apps/product-video/src/components/PulsingDot.tsx`:

A central dot with animated glow that pulses rhythmically. Used in Scene 1 (Stillness) and Scene 7 (Invitation).

```tsx
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

type PulsingDotProps = {
  size?: number;
  color?: string;
  delay?: number;
  style?: React.CSSProperties;
};

export const PulsingDot: React.FC<PulsingDotProps> = ({
  size = 16,
  color = "#FFFFFF",
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dot appears with spring
  const appear = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 80, stiffness: 200 },
  });

  // Continuous pulse (cycles every 60 frames = 2 seconds)
  const pulseFrame = Math.max(0, frame - delay - 15);
  const pulse = Math.sin((pulseFrame / 60) * Math.PI * 2) * 0.3 + 0.7;

  // Glow radius pulses
  const glowSize = size * 6 * pulse;
  const glowOpacity = interpolate(pulse, [0.4, 1], [0.08, 0.2]);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${appear})`,
        ...style,
      }}
    >
      {/* Outer glow */}
      <div
        style={{
          position: "absolute",
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: glowOpacity,
          filter: "blur(30px)",
        }}
      />
      {/* Inner glow */}
      <div
        style={{
          position: "absolute",
          width: size * 2.5,
          height: size * 2.5,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: 0.15 * pulse,
          filter: "blur(10px)",
        }}
      />
      {/* Core dot */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          position: "relative",
        }}
      />
    </div>
  );
};
```

**Step 3: Create NeuralNetwork component**

`apps/product-video/src/components/NeuralNetwork.tsx`:

Animated nodes + connecting lines that radiate from center. Used in Scene 2 (Signals) and Scene 3 (Awakening).

```tsx
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

type NeuralNetworkProps = {
  width?: number;
  height?: number;
  activationDelay?: number;
  intensity?: "low" | "high";
};

// Fixed node positions (relative to center)
const nodes = [
  { x: 0, y: -120 },
  { x: 110, y: -60 },
  { x: 110, y: 60 },
  { x: 0, y: 120 },
  { x: -110, y: 60 },
  { x: -110, y: -60 },
  // Outer ring
  { x: 0, y: -220 },
  { x: 190, y: -110 },
  { x: 190, y: 110 },
  { x: 0, y: 220 },
  { x: -190, y: 110 },
  { x: -190, y: -110 },
];

// Connections between nodes (inner to outer)
const connections = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
  [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 6],
];

export const NeuralNetwork: React.FC<NeuralNetworkProps> = ({
  width = 500,
  height = 500,
  activationDelay = 0,
  intensity = "low",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cx = width / 2;
  const cy = height / 2;

  const isHigh = intensity === "high";
  const baseOpacity = isHigh ? 0.6 : 0.2;
  const nodeSize = isHigh ? 4 : 3;

  return (
    <svg width={width} height={height} style={{ position: "absolute" }}>
      {/* Connections */}
      {connections.map(([from, to], i) => {
        const delay = activationDelay + i * 3;
        const progress = interpolate(frame - delay, [0, 20], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Pulse effect for high intensity
        const pulseFrame = Math.max(0, frame - delay - 20);
        const pulse = isHigh
          ? Math.sin((pulseFrame / 40 + i * 0.3) * Math.PI * 2) * 0.3 + 0.7
          : 1;

        return (
          <line
            key={`${from}-${to}`}
            x1={cx + nodes[from].x}
            y1={cy + nodes[from].y}
            x2={cx + nodes[to].x}
            y2={cy + nodes[to].y}
            stroke="#FFFFFF"
            strokeWidth={1}
            opacity={progress * baseOpacity * pulse}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const delay = activationDelay + i * 5;
        const scale = spring({
          fps,
          frame: Math.max(0, frame - delay),
          config: { damping: 80, stiffness: 300 },
        });

        // Pulse for high intensity
        const pulseFrame = Math.max(0, frame - delay - 15);
        const pulse = isHigh
          ? Math.sin((pulseFrame / 50 + i * 0.5) * Math.PI * 2) * 0.4 + 0.8
          : 1;

        return (
          <React.Fragment key={i}>
            {/* Glow */}
            {isHigh && (
              <circle
                cx={cx + node.x}
                cy={cy + node.y}
                r={nodeSize * 4}
                fill="#FFFFFF"
                opacity={scale * 0.1 * pulse}
              />
            )}
            {/* Dot */}
            <circle
              cx={cx + node.x}
              cy={cy + node.y}
              r={nodeSize * scale}
              fill="#FFFFFF"
              opacity={scale * (isHigh ? 0.9 : 0.5) * pulse}
            />
          </React.Fragment>
        );
      })}
    </svg>
  );
};
```

**Step 4: Commit**

```bash
git add apps/product-video/src/components/PulsingDot.tsx apps/product-video/src/components/NeuralNetwork.tsx apps/product-video/src/lib/theme.ts
git commit -m "feat(product-video): add PulsingDot and NeuralNetwork components"
```

---

## Task 2: Add New Shared Components — SallyOrb + MockChat + HOSBar

**Files:**
- Create: `apps/product-video/src/components/SallyOrb.tsx`
- Create: `apps/product-video/src/components/MockChat.tsx`
- Create: `apps/product-video/src/components/HOSBar.tsx`

**Step 1: Create SallyOrb component**

`apps/product-video/src/components/SallyOrb.tsx`:

Simplified version of the landing page's neural-network-inspired orb. Has three states: idle (soft pulse), thinking (rotation + morph), speaking (confident pulse).

```tsx
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

type OrbState = "idle" | "thinking" | "speaking";

type SallyOrbProps = {
  state?: OrbState;
  size?: number;
  delay?: number;
};

export const SallyOrb: React.FC<SallyOrbProps> = ({
  state = "idle",
  size = 80,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appear = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 80, stiffness: 200 },
  });

  const t = Math.max(0, frame - delay);

  // State-dependent animation
  let coreScale = 1;
  let glowIntensity = 0.15;
  let ringOpacity = 0;
  let rotation = 0;

  if (state === "idle") {
    coreScale = 1 + Math.sin(t / 30 * Math.PI) * 0.05;
    glowIntensity = 0.12 + Math.sin(t / 30 * Math.PI) * 0.05;
  } else if (state === "thinking") {
    coreScale = 1 + Math.sin(t / 15 * Math.PI) * 0.1;
    glowIntensity = 0.2 + Math.sin(t / 20 * Math.PI) * 0.1;
    ringOpacity = 0.3;
    rotation = t * 3;
  } else if (state === "speaking") {
    coreScale = 1 + Math.sin(t / 20 * Math.PI) * 0.08;
    glowIntensity = 0.25 + Math.sin(t / 25 * Math.PI) * 0.08;
    ringOpacity = 0.15;
  }

  const nodeCount = 8;
  const nodeRadius = size * 0.7;

  return (
    <div
      style={{
        position: "relative",
        width: size * 3,
        height: size * 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${appear})`,
      }}
    >
      {/* Outer glow */}
      <div
        style={{
          position: "absolute",
          width: size * 2.5,
          height: size * 2.5,
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          opacity: glowIntensity,
          filter: "blur(40px)",
        }}
      />

      {/* Rotating ring (thinking/speaking) */}
      {ringOpacity > 0 && (
        <svg
          width={size * 2.2}
          height={size * 2.2}
          style={{
            position: "absolute",
            transform: `rotate(${rotation}deg)`,
            opacity: ringOpacity,
          }}
        >
          <circle
            cx={size * 1.1}
            cy={size * 1.1}
            r={size * 0.9}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1}
            strokeDasharray="8 12"
          />
        </svg>
      )}

      {/* Orbital nodes */}
      <svg
        width={size * 3}
        height={size * 3}
        style={{
          position: "absolute",
          transform: `rotate(${rotation * 0.5}deg)`,
        }}
      >
        {Array.from({ length: nodeCount }).map((_, i) => {
          const angle = (i / nodeCount) * Math.PI * 2;
          const pulse = Math.sin((t / 40 + i * 0.8) * Math.PI * 2) * 0.3 + 0.7;
          const nx = size * 1.5 + Math.cos(angle) * nodeRadius;
          const ny = size * 1.5 + Math.sin(angle) * nodeRadius;
          const nodeOpacity = state === "idle" ? 0.2 : state === "thinking" ? 0.5 * pulse : 0.4;

          return (
            <React.Fragment key={i}>
              <line
                x1={size * 1.5}
                y1={size * 1.5}
                x2={nx}
                y2={ny}
                stroke="#FFFFFF"
                strokeWidth={0.5}
                opacity={nodeOpacity * 0.5}
              />
              <circle
                cx={nx}
                cy={ny}
                r={2.5}
                fill="#FFFFFF"
                opacity={nodeOpacity}
              />
            </React.Fragment>
          );
        })}
      </svg>

      {/* Core */}
      <div
        style={{
          width: size * coreScale,
          height: size * coreScale,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 70%, transparent 100%)",
          border: "1px solid rgba(255,255,255,0.2)",
          position: "relative",
        }}
      />
    </div>
  );
};
```

**Step 2: Create MockChat component**

`apps/product-video/src/components/MockChat.tsx`:

Chat exchange with typewriter effect. Shows a dispatcher message, a thinking pause, then SALLY's response.

```tsx
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { theme } from "../lib/theme";

type ChatMessage = {
  role: "user" | "sally";
  text: string;
  delay: number;
};

type MockChatProps = {
  messages: ChatMessage[];
  width?: number;
};

export const MockChat: React.FC<MockChatProps> = ({
  messages,
  width = 700,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width,
      }}
    >
      {messages.map((msg, i) => {
        const adjustedFrame = frame - msg.delay;
        if (adjustedFrame < 0) return null;

        // Fade in the bubble
        const bubbleOpacity = interpolate(adjustedFrame, [0, 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Typewriter for text
        const charsToShow = interpolate(
          adjustedFrame,
          [5, 5 + msg.text.length * 1.5],
          [0, msg.text.length],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const isUser = msg.role === "user";
        const visibleText = msg.text.slice(0, Math.floor(charsToShow));
        const showCursor = Math.floor(charsToShow) < msg.text.length;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: isUser ? "flex-end" : "flex-start",
              opacity: bubbleOpacity,
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "12px 18px",
                borderRadius: 16,
                backgroundColor: isUser ? "#1a1a1a" : "rgba(255,255,255,0.05)",
                border: isUser ? "1px solid #333" : "1px solid rgba(255,255,255,0.1)",
                fontFamily: theme.font,
                fontSize: 18,
                lineHeight: 1.5,
                color: isUser ? theme.muted : theme.text,
              }}
            >
              {!isUser && (
                <div
                  style={{
                    fontSize: 11,
                    color: theme.dimmed,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  SALLY
                </div>
              )}
              {visibleText}
              {showCursor && (
                <span style={{ opacity: frame % 15 < 8 ? 1 : 0, color: theme.dimmed }}>
                  |
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

**Step 3: Create HOSBar component**

`apps/product-video/src/components/HOSBar.tsx`:

Horizontal progress bar showing HOS hours remaining. Animates from full to a safe level, never hitting zero.

```tsx
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { theme } from "../lib/theme";

type HOSBarProps = {
  delay?: number;
  width?: number;
};

export const HOSBar: React.FC<HOSBarProps> = ({
  delay = 0,
  width = 700,
}) => {
  const frame = useCurrentFrame();

  // Bar fades in
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Hours count down from 11 to 3.2, then back up to 8.5 (after rest inserted)
  const hours = (() => {
    const t = frame - delay;
    if (t < 0) return 11;
    if (t < 120) {
      // Count down: 11 → 3.2 over 120 frames
      return interpolate(t, [0, 120], [11, 3.2], {
        extrapolateRight: "clamp",
      });
    }
    // After rest inserted, jump back up: 3.2 → 8.5
    return interpolate(t, [120, 150], [3.2, 8.5], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  })();

  const percentage = (hours / 11) * 100;
  const barColor =
    hours > 5 ? theme.alertGreen : hours > 2 ? theme.alertYellow : theme.alertRed;

  return (
    <div style={{ opacity, width }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: theme.font,
          fontSize: 13,
          color: theme.dimmed,
          marginBottom: 6,
        }}
      >
        <span>HOS Remaining</span>
        <span style={{ color: barColor, fontWeight: 600 }}>
          {hours.toFixed(1)}h
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 3,
          backgroundColor: "#1a1a1a",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            borderRadius: 3,
            backgroundColor: barColor,
            transition: "background-color 0.3s",
          }}
        />
      </div>
    </div>
  );
};
```

**Step 4: Commit**

```bash
git add apps/product-video/src/components/SallyOrb.tsx apps/product-video/src/components/MockChat.tsx apps/product-video/src/components/HOSBar.tsx
git commit -m "feat(product-video): add SallyOrb, MockChat, and HOSBar components"
```

---

## Task 3: Scene 1 — Stillness

**Files:**
- Replace: `apps/product-video/src/scenes/LogoReveal.tsx` → rename to `Stillness.tsx`
- Create: `apps/product-video/src/scenes/Stillness.tsx`
- Delete: `apps/product-video/src/scenes/LogoReveal.tsx`

**Step 1: Delete old LogoReveal, create Stillness**

`apps/product-video/src/scenes/Stillness.tsx`:

Duration: 150 frames (5s). Black → pulsing dot → "SALLY" emerges from blur.

```tsx
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { PulsingDot } from "../components/PulsingDot";
import { theme } from "../lib/theme";

export const Stillness: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "SALLY" emerges from blur after dot settles
  const textDelay = 60;
  const textProgress = spring({
    fps,
    frame: Math.max(0, frame - textDelay),
    config: { damping: 100, stiffness: 150 },
  });

  const textOpacity = interpolate(frame - textDelay, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textBlur = interpolate(textProgress, [0, 1], [12, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Pulsing dot */}
      <div style={{ position: "absolute" }}>
        <PulsingDot size={14} delay={20} />
      </div>

      {/* SALLY text emerging from blur */}
      <div
        style={{
          position: "absolute",
          marginTop: 100,
          fontFamily: theme.font,
          fontSize: 72,
          fontWeight: 800,
          color: theme.text,
          letterSpacing: "-0.04em",
          opacity: textOpacity,
          filter: `blur(${textBlur}px)`,
        }}
      >
        SALLY
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
rm apps/product-video/src/scenes/LogoReveal.tsx
git add apps/product-video/src/scenes/Stillness.tsx
git rm apps/product-video/src/scenes/LogoReveal.tsx
git commit -m "feat(product-video): replace LogoReveal with Stillness scene"
```

---

## Task 4: Scene 2 — Signals

**Files:**
- Replace: `apps/product-video/src/scenes/TheProblem.tsx` → `Signals.tsx`
- Create: `apps/product-video/src/scenes/Signals.tsx`
- Delete: `apps/product-video/src/scenes/TheProblem.tsx`

**Step 1: Create Signals scene**

`apps/product-video/src/scenes/Signals.tsx`:

Duration: 300 frames (10s). Signal lines radiate. Fleet signal examples fade in. "Most go unheard."

```tsx
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { NeuralNetwork } from "../components/NeuralNetwork";
import { AnimatedText } from "../components/AnimatedText";
import { FadeIn } from "../components/FadeIn";
import { theme } from "../lib/theme";

const signals = [
  "Hours ticking down on a driver's clock",
  "Weather shifting along I-40",
  "A dock running 90 minutes behind",
  "Fuel prices dropping two exits ahead",
];

export const Signals: React.FC = () => {
  const frame = useCurrentFrame();

  // "unheard" line appears late
  const unheardOpacity = interpolate(frame, [230, 250], [0, 1], {
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
      {/* Neural network in background */}
      <div style={{ position: "absolute", opacity: 0.4 }}>
        <NeuralNetwork
          width={800}
          height={800}
          activationDelay={10}
          intensity="low"
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          zIndex: 1,
        }}
      >
        {/* Main text */}
        <AnimatedText
          text="Every minute, your fleet sends thousands of signals."
          fontSize={36}
          color={theme.text}
          mode="fade"
          delay={10}
          style={{ fontWeight: 600, maxWidth: 800, textAlign: "center" }}
        />

        {/* Signal examples */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginTop: 20,
          }}
        >
          {signals.map((signal, i) => (
            <FadeIn key={signal} delay={60 + i * 25}>
              <div
                style={{
                  fontFamily: theme.font,
                  fontSize: 22,
                  color: theme.dimmed,
                  textAlign: "center",
                }}
              >
                {signal}
              </div>
            </FadeIn>
          ))}
        </div>

        {/* "unheard" line */}
        <div
          style={{
            marginTop: 40,
            fontFamily: theme.font,
            fontSize: 30,
            fontWeight: 600,
            color: theme.muted,
            opacity: unheardOpacity,
            fontStyle: "italic",
          }}
        >
          Right now, most of them go unheard.
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
rm apps/product-video/src/scenes/TheProblem.tsx
git add apps/product-video/src/scenes/Signals.tsx
git rm apps/product-video/src/scenes/TheProblem.tsx
git commit -m "feat(product-video): replace TheProblem with Signals scene"
```

---

## Task 5: Scene 3 — Awakening

**Files:**
- Create: `apps/product-video/src/scenes/Awakening.tsx`

**Step 1: Create Awakening scene**

`apps/product-video/src/scenes/Awakening.tsx`:

Duration: 150 frames (5s). Neural network lights up intensely. "What if your fleet could feel?"

```tsx
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { NeuralNetwork } from "../components/NeuralNetwork";
import { AnimatedText } from "../components/AnimatedText";
import { theme } from "../lib/theme";

export const Awakening: React.FC = () => {
  const frame = useCurrentFrame();

  // Flash on transition
  const flash = interpolate(frame, [0, 8, 20], [0.3, 0.15, 0], {
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
      {/* White flash overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#FFFFFF",
          opacity: flash,
          zIndex: 10,
        }}
      />

      {/* Neural network — HIGH intensity */}
      <div style={{ position: "absolute" }}>
        <NeuralNetwork
          width={900}
          height={900}
          activationDelay={5}
          intensity="high"
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          zIndex: 1,
        }}
      >
        <AnimatedText
          text="What if your fleet could feel?"
          fontSize={44}
          color={theme.text}
          mode="fade"
          delay={15}
          style={{ fontWeight: 700 }}
        />

        <AnimatedText
          text="SALLY connects every signal into one nervous system."
          fontSize={24}
          color={theme.muted}
          mode="fade"
          delay={55}
        />
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
git add apps/product-video/src/scenes/Awakening.tsx
git commit -m "feat(product-video): add Awakening scene with neural network activation"
```

---

## Task 6: Scene 4 — The Brain (AI Route Planning)

**Files:**
- Replace: `apps/product-video/src/scenes/RoutePlanning.tsx` → rewrite
- Modify: `apps/product-video/src/components/MockMap.tsx` → enhanced version with rest/fuel stop insertion and HOS bar

**Step 1: Rewrite MockMap with rest stop, fuel stop, and HOS bar**

Replace `apps/product-video/src/components/MockMap.tsx` entirely:

```tsx
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { GlowDot } from "./GlowDot";
import { HOSBar } from "./HOSBar";
import { theme } from "../lib/theme";

const stops = [
  { x: 80, y: 380, label: "Dallas, TX", type: "stop" as const },
  { x: 220, y: 270, label: "Oklahoma City", type: "stop" as const },
  { x: 370, y: 190, label: "Wichita, KS", type: "stop" as const },
  { x: 440, y: 240, label: "10h Rest — HOS Compliant", type: "rest" as const },
  { x: 520, y: 145, label: "Fuel · $3.42/gal", type: "fuel" as const },
  { x: 600, y: 100, label: "Kansas City", type: "stop" as const },
  { x: 730, y: 80, label: "Chicago, IL", type: "stop" as const },
];

const pathD =
  "M 80 380 C 140 330, 180 290, 220 270 C 280 230, 330 210, 370 190 C 390 200, 420 230, 440 240 C 470 220, 500 170, 520 145 C 550 125, 580 110, 600 100 C 650 90, 700 82, 730 80";

const colorMap = {
  stop: "#FFFFFF",
  rest: theme.alertGreen,
  fuel: theme.alertBlue,
};

export const MockMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pathProgress = interpolate(frame, [10, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", width: 800, height: 480 }}>
      {/* Grid */}
      <svg width={800} height={440} style={{ position: "absolute" }}>
        {Array.from({ length: 11 }).map((_, i) => (
          <React.Fragment key={i}>
            <line x1={i * 80} y1={0} x2={i * 80} y2={440} stroke="#111" strokeWidth={1} />
            <line x1={0} y1={i * 44} x2={800} y2={i * 44} stroke="#111" strokeWidth={1} />
          </React.Fragment>
        ))}

        {/* Route line */}
        <path
          d={pathD}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeDasharray="1500"
          strokeDashoffset={1500 * (1 - pathProgress)}
          opacity={0.5}
        />
      </svg>

      {/* Stop dots */}
      {stops.map((stop, i) => {
        // Rest and fuel stops appear later
        const baseDelay = stop.type === "stop" ? 20 + i * 15 : 80 + i * 10;
        return (
          <GlowDot
            key={stop.label}
            x={stop.x}
            y={stop.y}
            label={stop.label}
            delay={baseDelay}
            size={stop.type === "stop" ? 8 : 10}
            color={colorMap[stop.type]}
          />
        );
      })}

      {/* HOS Bar at bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 50, right: 50 }}>
        <HOSBar delay={30} width={700} />
      </div>
    </div>
  );
};
```

**Step 2: Rewrite RoutePlanning scene**

Replace `apps/product-video/src/scenes/RoutePlanning.tsx`:

```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
import { MockMap } from "../components/MockMap";
import { AnimatedText } from "../components/AnimatedText";
import { FadeIn } from "../components/FadeIn";
import { theme } from "../lib/theme";

const badges = [
  { text: "Optimized Sequence", delay: 160 },
  { text: "Auto Rest Stops", delay: 190 },
  { text: "Smart Fuel Stops", delay: 220 },
  { text: "Zero Violations", delay: 250 },
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
          gap: 24,
        }}
      >
        {/* Title */}
        <AnimatedText
          text="PLAN"
          fontSize={56}
          color={theme.text}
          mode="fade"
          delay={0}
          style={{ fontWeight: 800, letterSpacing: "0.1em" }}
        />
        <AnimatedText
          text="AI that thinks in hours, miles, and regulations."
          fontSize={22}
          color={theme.dimmed}
          mode="fade"
          delay={15}
        />

        {/* Map */}
        <div style={{ marginTop: 16 }}>
          <MockMap />
        </div>

        {/* Feature badges */}
        <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
          {badges.map((b) => (
            <FadeIn key={b.text} delay={b.delay}>
              <div
                style={{
                  fontFamily: theme.font,
                  fontSize: 14,
                  color: theme.muted,
                  padding: "6px 16px",
                  border: "1px solid #333",
                  borderRadius: 20,
                }}
              >
                {b.text}
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
git commit -m "feat(product-video): rewrite route planning scene with AI-powered map, rest/fuel stops, HOS bar"
```

---

## Task 7: Scene 5 — The Nerve (Monitor + Respond + Converse)

**Files:**
- Replace: `apps/product-video/src/scenes/Monitoring.tsx` → rewrite
- Delete: `apps/product-video/src/scenes/Compliance.tsx` (merged into this scene)
- Delete: `apps/product-video/src/components/MockDashboard.tsx` (no longer needed)

**Step 1: Rewrite Monitoring scene as TheNerve**

Replace `apps/product-video/src/scenes/Monitoring.tsx` entirely with new file `apps/product-video/src/scenes/TheNerve.tsx`:

Duration: 360 frames (12s). Part A: alert → resolution. Part B: SallyOrb + AI chat.

```tsx
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { SallyOrb } from "../components/SallyOrb";
import { MockChat } from "../components/MockChat";
import { AnimatedText } from "../components/AnimatedText";
import { FadeIn } from "../components/FadeIn";
import { theme } from "../lib/theme";

const chatMessages = [
  {
    role: "user" as const,
    text: "Can driver 14 make Memphis on time?",
    delay: 200,
  },
  {
    role: "sally" as const,
    text: "Yes. 3.5 hours drive time. 1.2-hour buffer. HOS compliant through delivery.",
    delay: 250,
  },
];

export const TheNerve: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- PART A: Alert → Resolution (frames 0-170) ---
  const alertScale = spring({
    fps,
    frame: Math.max(0, frame - 15),
    config: { damping: 80, stiffness: 200 },
  });
  const alertOpacity = interpolate(frame, [15, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Alert resolves at frame 90
  const resolveProgress = interpolate(frame, [90, 105], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Part A fades out, Part B fades in
  const partAOpacity = interpolate(frame, [155, 170], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const partBOpacity = interpolate(frame, [170, 185], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Determine orb state based on frame
  const orbState = frame < 240 ? "idle" : frame < 260 ? "thinking" : "speaking";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* --- PART A: Alert + Resolution --- */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          opacity: partAOpacity,
        }}
      >
        <AnimatedText
          text="MONITOR · RESPOND"
          fontSize={48}
          color={theme.text}
          mode="fade"
          delay={0}
          style={{ fontWeight: 800, letterSpacing: "0.08em" }}
        />
        <AnimatedText
          text="A nervous system that never sleeps."
          fontSize={20}
          color={theme.dimmed}
          mode="fade"
          delay={10}
        />

        {/* Alert card */}
        <div
          style={{
            transform: `scale(${alertScale})`,
            opacity: alertOpacity,
            width: 550,
          }}
        >
          {/* Warning state */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "18px 24px",
              borderRadius: 12,
              border: `1px solid ${resolveProgress > 0.5 ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
              backgroundColor: resolveProgress > 0.5 ? "rgba(34,197,94,0.05)" : "rgba(234,179,8,0.05)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: resolveProgress > 0.5 ? theme.alertGreen : theme.alertYellow,
                boxShadow: `0 0 8px ${resolveProgress > 0.5 ? theme.alertGreen : theme.alertYellow}`,
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontFamily: theme.font, fontSize: 18, fontWeight: 600, color: theme.text }}>
                {resolveProgress > 0.5 ? "Route Updated" : "HOS Warning"}
              </div>
              <div style={{ fontFamily: theme.font, fontSize: 14, color: theme.muted, marginTop: 2 }}>
                {resolveProgress > 0.5
                  ? "Rest stop inserted at Mile 247. Driver compliant."
                  : "Driver J. Smith — 45 min remaining"}
              </div>
            </div>
            {resolveProgress > 0.5 && (
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: 22,
                  color: theme.alertGreen,
                  opacity: interpolate(resolveProgress, [0.5, 1], [0, 1]),
                }}
              >
                ✓
              </div>
            )}
          </div>
        </div>

        <FadeIn delay={110}>
          <div
            style={{
              fontFamily: theme.font,
              fontSize: 16,
              color: theme.dimmed,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: theme.alertGreen,
                boxShadow: `0 0 6px ${theme.alertGreen}`,
              }}
            />
            24/7 monitoring. Proactive, not reactive.
          </div>
        </FadeIn>
      </div>

      {/* --- PART B: AI Chat --- */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          opacity: partBOpacity,
        }}
      >
        <AnimatedText
          text="It doesn't just monitor. It converses."
          fontSize={28}
          color={theme.muted}
          mode="fade"
          delay={175}
          style={{ fontStyle: "italic" }}
        />

        {/* Orb */}
        <SallyOrb state={orbState} size={60} delay={180} />

        {/* Chat */}
        <MockChat messages={chatMessages} width={600} />
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Clean up old files**

```bash
rm apps/product-video/src/scenes/Monitoring.tsx
rm apps/product-video/src/scenes/Compliance.tsx
rm apps/product-video/src/components/MockDashboard.tsx
git add apps/product-video/src/scenes/TheNerve.tsx
git rm apps/product-video/src/scenes/Monitoring.tsx apps/product-video/src/scenes/Compliance.tsx apps/product-video/src/components/MockDashboard.tsx
git commit -m "feat(product-video): add TheNerve scene with alert resolution and AI chat"
```

---

## Task 8: Scene 6 — Certainty (ROI Stats)

**Files:**
- Create: `apps/product-video/src/scenes/Certainty.tsx`

**Step 1: Create Certainty scene**

`apps/product-video/src/scenes/Certainty.tsx`:

Duration: 240 frames (8s). Three ROI stats count up. "For fleets that refuse to fly blind."

```tsx
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { Counter } from "../components/Counter";
import { FadeIn } from "../components/FadeIn";
import { AnimatedText } from "../components/AnimatedText";
import { theme } from "../lib/theme";

const stats = [
  { to: 185000, prefix: "$", suffix: "+", label: "saved annually (50-truck fleet)", delay: 10, duration: 50 },
  { to: 520, prefix: "", suffix: "", label: "dispatcher hours recovered per year", delay: 40, duration: 40 },
  { to: 100, prefix: "", suffix: "%", label: "HOS compliant", delay: 70, duration: 30 },
];

export const Certainty: React.FC = () => {
  const frame = useCurrentFrame();

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
        {/* Stats row */}
        <div style={{ display: "flex", gap: 80 }}>
          {stats.map((stat) => (
            <FadeIn key={stat.label} delay={stat.delay}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Counter
                  to={stat.to}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  fontSize={64}
                  delay={stat.delay}
                  duration={stat.duration}
                />
                <div
                  style={{
                    fontFamily: theme.font,
                    fontSize: 15,
                    color: theme.dimmed,
                    maxWidth: 200,
                    textAlign: "center",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Tagline */}
        <AnimatedText
          text="For fleets that refuse to fly blind."
          fontSize={28}
          color={theme.muted}
          mode="fade"
          delay={120}
          style={{ fontWeight: 500, fontStyle: "italic" }}
        />
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
git add apps/product-video/src/scenes/Certainty.tsx
git commit -m "feat(product-video): add Certainty scene with ROI stats"
```

---

## Task 9: Scene 7 — Invitation (CTA)

**Files:**
- Replace: `apps/product-video/src/scenes/CallToAction.tsx` → rewrite

**Step 1: Rewrite CallToAction as Invitation**

Replace `apps/product-video/src/scenes/CallToAction.tsx`:

Duration: 240 frames (8s). SallyOrb returns. "Give your fleet a nervous system." SALLY logo. CTA.

```tsx
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { SallyOrb } from "../components/SallyOrb";
import { AnimatedText } from "../components/AnimatedText";
import { theme } from "../lib/theme";

export const Invitation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    fps,
    frame: Math.max(0, frame - 60),
    config: { damping: 80, stiffness: 200 },
  });

  const ctaOpacity = interpolate(frame, [130, 150], [0, 1], {
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
          gap: 20,
        }}
      >
        {/* Orb */}
        <SallyOrb state="idle" size={50} delay={10} />

        {/* "Give your fleet a nervous system" */}
        <AnimatedText
          text="Give your fleet a nervous system."
          fontSize={38}
          color={theme.text}
          mode="fade"
          delay={30}
          style={{ fontWeight: 600 }}
        />

        {/* SALLY logo */}
        <div
          style={{
            fontFamily: theme.font,
            fontSize: 72,
            fontWeight: 800,
            color: theme.text,
            letterSpacing: "-0.04em",
            transform: `scale(${logoScale})`,
            marginTop: 8,
          }}
        >
          SALLY
        </div>

        {/* CTA */}
        <div style={{ opacity: ctaOpacity, marginTop: 16 }}>
          <div
            style={{
              fontFamily: theme.font,
              fontSize: 20,
              color: theme.text,
              padding: "14px 40px",
              border: "1px solid #444",
              borderRadius: 32,
              letterSpacing: "0.05em",
            }}
          >
            Request a demo → sally.dev
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**

```bash
rm apps/product-video/src/scenes/CallToAction.tsx
git add apps/product-video/src/scenes/CallToAction.tsx
git rm apps/product-video/src/scenes/CallToAction.tsx
git commit -m "feat(product-video): rewrite CTA as Invitation scene with SallyOrb"
```

Note: The Invitation component is written to the same file path replacing the old CallToAction. The `git rm` removes the old content from tracking, `git add` adds the new. Actually — we are overwriting the file, so just:

```bash
git add apps/product-video/src/scenes/CallToAction.tsx
git commit -m "feat(product-video): rewrite CTA as Invitation scene with SallyOrb"
```

Wait — the file name should change. Let me correct:

```bash
rm apps/product-video/src/scenes/CallToAction.tsx
git rm apps/product-video/src/scenes/CallToAction.tsx
git add apps/product-video/src/scenes/Invitation.tsx
git commit -m "feat(product-video): replace CallToAction with Invitation scene"
```

Save the component to `apps/product-video/src/scenes/Invitation.tsx` (not CallToAction.tsx).

---

## Task 10: Wire Up New Video Composition

**Files:**
- Rewrite: `apps/product-video/src/Video.tsx`
- Modify: `apps/product-video/src/Root.tsx` — update to 1800 frames

**Step 1: Update Root.tsx**

Change `durationInFrames` from 1050 to 1800 in `apps/product-video/src/Root.tsx`:

```tsx
import { Composition } from "remotion";
import { SallyLaunchVideo } from "./Video";

export const Root: React.FC = () => {
  return (
    <Composition
      id="SallyLaunchVideo"
      component={SallyLaunchVideo}
      durationInFrames={1800}
      width={1920}
      height={1080}
      fps={30}
    />
  );
};
```

**Step 2: Rewrite Video.tsx**

```tsx
import React from "react";
import { Series } from "remotion";
import { Stillness } from "./scenes/Stillness";
import { Signals } from "./scenes/Signals";
import { Awakening } from "./scenes/Awakening";
import { RoutePlanning } from "./scenes/RoutePlanning";
import { TheNerve } from "./scenes/TheNerve";
import { Certainty } from "./scenes/Certainty";
import { Invitation } from "./scenes/Invitation";

export const SallyLaunchVideo: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={150}>
        <Stillness />
      </Series.Sequence>
      <Series.Sequence durationInFrames={300}>
        <Signals />
      </Series.Sequence>
      <Series.Sequence durationInFrames={150}>
        <Awakening />
      </Series.Sequence>
      <Series.Sequence durationInFrames={360}>
        <RoutePlanning />
      </Series.Sequence>
      <Series.Sequence durationInFrames={360}>
        <TheNerve />
      </Series.Sequence>
      <Series.Sequence durationInFrames={240}>
        <Certainty />
      </Series.Sequence>
      <Series.Sequence durationInFrames={240}>
        <Invitation />
      </Series.Sequence>
    </Series>
  );
};
```

Frame count: 150 + 300 + 150 + 360 + 360 + 240 + 240 = **1800 frames = 60 seconds** ✓

**Step 3: Commit**

```bash
git add apps/product-video/src/Video.tsx apps/product-video/src/Root.tsx
git commit -m "feat(product-video): wire up v2 composition — 7 scenes, 60 seconds"
```

---

## Task 11: Test in Studio + Render

**Step 1: Temporarily remove package-lock.json (Remotion lockfile conflict)**

```bash
cd /Users/ajay-admin/sally/.worktrees/product-launch-video
mv package-lock.json package-lock.json.bak
```

**Step 2: Launch Remotion Studio**

```bash
cd apps/product-video
npx remotion studio src/index.ts --port 3002
```

Expected: Browser opens. Scrub through 1800 frames:
- Scene 1 (0–5s): Pulsing dot, SALLY emerges from blur
- Scene 2 (5–15s): Neural network, signal lines, "unheard"
- Scene 3 (15–20s): Flash, network intensifies, "What if your fleet could feel?"
- Scene 4 (20–32s): Map builds with rest/fuel stops, HOS bar
- Scene 5 (32–44s): Alert → resolves → orb → AI chat conversation
- Scene 6 (44–52s): Stats count up ($185K, 520, 100%)
- Scene 7 (52–60s): Orb, "Give your fleet a nervous system", logo, CTA

**Step 3: Render to MP4**

```bash
pnpm render
```

**Step 4: Restore lockfile and commit**

```bash
cd /Users/ajay-admin/sally/.worktrees/product-launch-video
mv package-lock.json.bak package-lock.json
git add -A
git commit -m "feat(product-video): SALLY product launch video v2 — The Nerve"
```

**Step 5: Push and update PR**

```bash
git push origin product-launch-video
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | New components: PulsingDot + NeuralNetwork | 3 files |
| 2 | New components: SallyOrb + MockChat + HOSBar | 3 files |
| 3 | Scene 1: Stillness | 1 file (replaces LogoReveal) |
| 4 | Scene 2: Signals | 1 file (replaces TheProblem) |
| 5 | Scene 3: Awakening | 1 new file |
| 6 | Scene 4: Route Planning (rewrite) | 2 files (rewrites) |
| 7 | Scene 5: The Nerve (monitor + chat) | 1 new file (deletes 3 old) |
| 8 | Scene 6: Certainty | 1 new file |
| 9 | Scene 7: Invitation | 1 file (replaces CallToAction) |
| 10 | Wire up composition | 2 files (rewrite) |
| 11 | Test + render + push | — |

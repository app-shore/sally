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

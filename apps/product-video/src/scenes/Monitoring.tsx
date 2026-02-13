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

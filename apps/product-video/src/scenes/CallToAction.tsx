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

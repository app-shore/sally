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

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

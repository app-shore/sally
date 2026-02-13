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

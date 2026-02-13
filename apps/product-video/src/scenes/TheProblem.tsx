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

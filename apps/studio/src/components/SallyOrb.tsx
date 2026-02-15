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
    coreScale = 1 + Math.sin((t / 30) * Math.PI) * 0.05;
    glowIntensity = 0.12 + Math.sin((t / 30) * Math.PI) * 0.05;
  } else if (state === "thinking") {
    coreScale = 1 + Math.sin((t / 15) * Math.PI) * 0.1;
    glowIntensity = 0.2 + Math.sin((t / 20) * Math.PI) * 0.1;
    ringOpacity = 0.3;
    rotation = t * 3;
  } else if (state === "speaking") {
    coreScale = 1 + Math.sin((t / 20) * Math.PI) * 0.08;
    glowIntensity = 0.25 + Math.sin((t / 25) * Math.PI) * 0.08;
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
          const pulse =
            Math.sin((t / 40 + i * 0.8) * Math.PI * 2) * 0.3 + 0.7;
          const nx = size * 1.5 + Math.cos(angle) * nodeRadius;
          const ny = size * 1.5 + Math.sin(angle) * nodeRadius;
          const nodeOpacity =
            state === "idle" ? 0.2 : state === "thinking" ? 0.5 * pulse : 0.4;

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
          background:
            "radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 70%, transparent 100%)",
          border: "1px solid rgba(255,255,255,0.2)",
          position: "relative",
        }}
      />
    </div>
  );
};

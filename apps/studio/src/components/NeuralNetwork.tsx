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

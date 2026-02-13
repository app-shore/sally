import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

/**
 * Remotion-compatible NervousSystem SVG — ported from the sally-nerve landing page.
 * Central SALLY node with 11 labeled outer nodes connected by edges,
 * with signal pulses traveling along connections.
 */

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
}

const nodes: Node[] = [
  { id: "core", label: "SALLY", x: 50, y: 50 },
  { id: "hos", label: "HOS", x: 20, y: 25 },
  { id: "fuel", label: "Fuel", x: 80, y: 20 },
  { id: "weather", label: "Weather", x: 15, y: 65 },
  { id: "traffic", label: "Traffic", x: 85, y: 60 },
  { id: "dock", label: "Docks", x: 35, y: 15 },
  { id: "vehicle", label: "Vehicle", x: 65, y: 15 },
  { id: "driver", label: "Driver", x: 25, y: 80 },
  { id: "dispatch", label: "Dispatch", x: 75, y: 80 },
  { id: "route", label: "Route", x: 50, y: 85 },
  { id: "eta", label: "ETA", x: 10, y: 45 },
  { id: "compliance", label: "Compliance", x: 90, y: 42 },
];

const edges: [string, string][] = [
  ["core", "hos"],
  ["core", "fuel"],
  ["core", "weather"],
  ["core", "traffic"],
  ["core", "dock"],
  ["core", "vehicle"],
  ["core", "driver"],
  ["core", "dispatch"],
  ["core", "route"],
  ["core", "eta"],
  ["core", "compliance"],
  ["hos", "driver"],
  ["hos", "compliance"],
  ["fuel", "route"],
  ["weather", "traffic"],
  ["dock", "eta"],
  ["driver", "dispatch"],
  ["vehicle", "driver"],
  ["route", "eta"],
];

const nodeMap: Record<string, Node> = {};
nodes.forEach((n) => {
  nodeMap[n.id] = n;
});

type NervousSystemSVGProps = {
  size?: number;
  activationDelay?: number;
  intensity?: "low" | "high";
};

export const NervousSystemSVG: React.FC<NervousSystemSVGProps> = ({
  size = 700,
  activationDelay = 0,
  intensity = "low",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isHigh = intensity === "high";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ position: "absolute" }}
    >
      {/* Edges */}
      {edges.map(([fromId, toId], i) => {
        const from = nodeMap[fromId];
        const to = nodeMap[toId];
        if (!from || !to) return null;

        const isCoreEdge = fromId === "core" || toId === "core";
        const edgeDelay = activationDelay + i * 2;

        // Line draws in
        const lineProgress = interpolate(
          frame - edgeDelay,
          [0, 20],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        // For high intensity, edges pulse
        const pulsePhase = Math.max(0, frame - edgeDelay - 20);
        const pulse = isHigh
          ? Math.sin((pulsePhase / 40 + i * 0.3) * Math.PI * 2) * 0.2 + 0.8
          : 1;

        const baseOpacity = isHigh ? 0.5 : 0.3;

        // Signal pulse traveling along edge
        const pulseCycleDuration = fps * (2 + (i % 3));
        const pulseDelay = activationDelay + 30 + i * 8;
        const pulseFrame = Math.max(0, frame - pulseDelay);
        const t = (pulseFrame % pulseCycleDuration) / pulseCycleDuration;
        const pulseActive = frame > pulseDelay;
        const pulseDotOpacity = pulseActive
          ? interpolate(
              t,
              [0, 0.1, 0.9, 1],
              [0, 0.8, 0.8, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )
          : 0;

        const pulseDotX = from.x + (to.x - from.x) * t;
        const pulseDotY = from.y + (to.y - from.y) * t;

        return (
          <g key={`edge-${i}`}>
            <line
              x1={from.x}
              y1={from.y}
              x2={from.x + (to.x - from.x) * lineProgress}
              y2={from.y + (to.y - from.y) * lineProgress}
              stroke="#FFFFFF"
              strokeWidth={isCoreEdge ? 0.2 : 0.1}
              opacity={lineProgress * baseOpacity * pulse}
            />
            {/* Signal pulse dot */}
            {pulseActive && (
              <circle
                cx={pulseDotX}
                cy={pulseDotY}
                r={0.4}
                fill="#FFFFFF"
                opacity={pulseDotOpacity * (isHigh ? 0.9 : 0.5)}
              />
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const isCore = node.id === "core";
        const nodeDelay = activationDelay + i * 4;

        const scale = spring({
          fps,
          frame: Math.max(0, frame - nodeDelay),
          config: { damping: 80, stiffness: 200 },
        });

        const nodeRadius = isCore ? 2.5 : 1;
        const nodeOpacity = isHigh ? 0.9 : 0.6;

        // Core pulse ring (high intensity)
        const pulsePhase = Math.max(0, frame - nodeDelay - 15);
        const coreRingScale = isCore && isHigh
          ? interpolate(
              pulsePhase % (fps * 3),
              [0, fps * 3],
              [1, 3],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )
          : 0;
        const coreRingOpacity = isCore && isHigh
          ? interpolate(
              pulsePhase % (fps * 3),
              [0, fps * 3],
              [0.4, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )
          : 0;

        // Label fade in
        const labelOpacity = interpolate(
          frame - nodeDelay - 10,
          [0, 15],
          [0, 0.7],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <g key={node.id}>
            {/* Core pulse ring */}
            {isCore && isHigh && frame > nodeDelay + 15 && (
              <circle
                cx={node.x}
                cy={node.y}
                r={3 * coreRingScale}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={0.15}
                opacity={coreRingOpacity}
              />
            )}
            {/* Glow for high intensity */}
            {isHigh && (
              <circle
                cx={node.x}
                cy={node.y}
                r={(isCore ? 5 : 2.5) * scale}
                fill="#FFFFFF"
                opacity={scale * 0.08}
              />
            )}
            {/* Node dot */}
            <circle
              cx={node.x}
              cy={node.y}
              r={nodeRadius * scale}
              fill={isCore ? "#FFFFFF" : "#888888"}
              opacity={scale * nodeOpacity}
            />
            {/* Label */}
            <text
              x={node.x}
              y={node.y + (isCore ? 5 : 3)}
              textAnchor="middle"
              fill="#AAAAAA"
              style={{
                fontSize: isCore ? 2.5 : 1.8,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
              opacity={labelOpacity}
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

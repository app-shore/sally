'use client';

import { motion, useReducedMotion, type Transition } from 'framer-motion';
import type { OrbState } from '../engine/types';

interface SallyOrbProps {
  state: OrbState;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP = { sm: 36, md: 52, lg: 72 };

/**
 * Nerve-system inspired orb — SVG neural network with signal pulses,
 * radiating pulse rings, and organic morphing core.
 * Design language taken from the Sally Nerve landing page.
 */

// Neural nodes arranged around the core (percentage-based SVG coords)
const NERVE_NODES = [
  { x: 50, y: 12 },  // top
  { x: 85, y: 28 },  // top-right
  { x: 92, y: 62 },  // right
  { x: 72, y: 88 },  // bottom-right
  { x: 28, y: 88 },  // bottom-left
  { x: 8, y: 62 },   // left
  { x: 15, y: 28 },  // top-left
];

// Edges connecting peripheral nodes to core (center at 50,50)
const NERVE_EDGES = NERVE_NODES.map(node => ({
  from: node,
  to: { x: 50, y: 50 },
}));

// Cross-connections between adjacent peripheral nodes
const CROSS_EDGES = [
  { from: NERVE_NODES[0], to: NERVE_NODES[1] },
  { from: NERVE_NODES[1], to: NERVE_NODES[2] },
  { from: NERVE_NODES[2], to: NERVE_NODES[3] },
  { from: NERVE_NODES[3], to: NERVE_NODES[4] },
  { from: NERVE_NODES[4], to: NERVE_NODES[5] },
  { from: NERVE_NODES[5], to: NERVE_NODES[6] },
  { from: NERVE_NODES[6], to: NERVE_NODES[0] },
];

export function SallyOrb({ state, size = 'md', onClick, className = '' }: SallyOrbProps) {
  const prefersReducedMotion = useReducedMotion();
  const px = SIZE_MAP[size];
  const coreRadius = px * 0.28; // Core as percentage of total

  // Signal pulse speed varies by state
  const signalDuration = {
    idle: 4,
    listening: 1.5,
    thinking: 2,
    speaking: 2.5,
  }[state];

  // Node visibility/brightness by state
  const nodeOpacity = {
    idle: 0.25,
    listening: 0.9,
    thinking: 0.6,
    speaking: 0.75,
  }[state];

  // Edge opacity by state
  const edgeOpacity = {
    idle: 0.12,
    listening: 0.5,
    thinking: 0.35,
    speaking: 0.45,
  }[state];

  // Core animation by state
  const coreAnimation = prefersReducedMotion
    ? { opacity: [0.8, 1, 0.8] }
    : {
        idle: { scale: [1, 1.08, 1] },
        listening: { scale: [1, 1.15, 1] },
        thinking: { scale: [1, 0.95, 1.05, 1], rotate: [0, -5, 5, 0] },
        speaking: { scale: [1, 1.12, 1] },
      }[state];

  const coreTransition = ({
    idle: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
    listening: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const },
    thinking: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const },
    speaking: { duration: 1.4, repeat: Infinity, ease: 'easeOut' as const },
  } as const satisfies Record<OrbState, Transition>)[state];

  // Pulse ring count by state
  const pulseRings = state === 'idle' ? 1 : state === 'listening' ? 3 : state === 'speaking' ? 2 : 0;

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full cursor-pointer ${className}`}
      style={{ width: px, height: px }}
      aria-label={`SALLY assistant - ${state}`}
    >
      {/* Full SVG neural network */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
      >
        {/* Cross-connection edges (peripheral ring) */}
        {CROSS_EDGES.map((edge, i) => (
          <g key={`cross-${i}`}>
            <motion.line
              x1={edge.from.x} y1={edge.from.y}
              x2={edge.to.x} y2={edge.to.y}
              className="stroke-gray-400 dark:stroke-gray-600"
              strokeWidth={0.5}
              animate={{ opacity: edgeOpacity * 0.6 }}
              transition={{ duration: 0.4 }}
            />
            {/* Signal pulse on cross edges — only when active */}
            {state !== 'idle' && !prefersReducedMotion && (
              <motion.circle
                r={1.2}
                className="fill-gray-400 dark:fill-gray-500"
                animate={{
                  cx: [edge.from.x, edge.to.x],
                  cy: [edge.from.y, edge.to.y],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: signalDuration * 1.2,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: 'linear',
                }}
              />
            )}
          </g>
        ))}

        {/* Core-to-node edges (radial spokes) */}
        {NERVE_EDGES.map((edge, i) => (
          <g key={`edge-${i}`}>
            <motion.line
              x1={edge.from.x} y1={edge.from.y}
              x2={edge.to.x} y2={edge.to.y}
              className="stroke-gray-300 dark:stroke-gray-700"
              strokeWidth={0.8}
              animate={{ opacity: edgeOpacity }}
              transition={{ duration: 0.4 }}
            />
            {/* Signal dot traveling inward to core */}
            {!prefersReducedMotion && (
              <motion.circle
                r={1.5}
                className="fill-gray-500 dark:fill-gray-400"
                animate={{
                  cx: [edge.from.x, edge.to.x],
                  cy: [edge.from.y, edge.to.y],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: signalDuration,
                  repeat: Infinity,
                  delay: i * (signalDuration / NERVE_NODES.length),
                  ease: 'linear',
                }}
              />
            )}
          </g>
        ))}

        {/* Peripheral nerve nodes */}
        {NERVE_NODES.map((node, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={node.x}
            cy={node.y}
            r={2.5}
            className="fill-gray-400 dark:fill-gray-500"
            animate={{
              opacity: nodeOpacity,
              scale: state === 'listening' && !prefersReducedMotion
                ? [1, 1.4, 1]
                : 1,
            }}
            transition={{
              opacity: { duration: 0.4 },
              scale: { duration: 1.5, repeat: Infinity, delay: i * 0.2 },
            }}
          />
        ))}
      </svg>

      {/* Radiating pulse rings (like Pulse.tsx from landing page) */}
      {!prefersReducedMotion && Array.from({ length: pulseRings }).map((_, i) => (
        <motion.div
          key={`pulse-${i}`}
          className="absolute rounded-full border border-gray-300 dark:border-gray-600"
          style={{ width: px * 0.5, height: px * 0.5 }}
          animate={{
            scale: [1, 2.5 + i * 0.3],
            opacity: [0.35, 0],
          }}
          transition={{
            duration: state === 'listening' ? 2 : 3,
            repeat: Infinity,
            delay: i * 0.7,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Listening glow (like landing page core pulse) */}
      {state === 'listening' && !prefersReducedMotion && (
        <motion.div
          className="absolute rounded-full"
          style={{ width: px * 0.6, height: px * 0.6 }}
          animate={{
            boxShadow: [
              '0 0 8px rgba(120,120,120,0.15)',
              '0 0 24px rgba(120,120,120,0.4)',
              '0 0 8px rgba(120,120,120,0.15)',
            ],
          }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}

      {/* Core orb — organic morphing shape inspired by sn-morph */}
      <motion.div
        className="absolute rounded-full bg-black dark:bg-white flex items-center justify-center shadow-lg"
        style={{
          width: coreRadius * 2,
          height: coreRadius * 2,
        }}
        animate={coreAnimation}
        transition={coreTransition}
      >
        {/* S icon — bold and clearly visible */}
        <svg
          width={coreRadius * 1.3}
          height={coreRadius * 1.3}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M17 8C17 5.5 14.8 3.5 12 3.5C9.2 3.5 7 5.5 7 8C7 9.2 7.5 10.2 8.2 11M7 16C7 18.5 9.2 20.5 12 20.5C14.8 20.5 17 18.5 17 16C17 14.8 16.5 13.8 15.8 13"
            stroke="white"
            className="dark:stroke-black"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
    </button>
  );
}

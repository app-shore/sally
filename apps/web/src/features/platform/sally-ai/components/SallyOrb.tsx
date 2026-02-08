'use client';

import { motion, useReducedMotion, type TargetAndTransition, type Transition } from 'framer-motion';
import type { OrbState } from '../engine/types';

interface SallyOrbProps {
  state: OrbState;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const sizeMap = { sm: 32, md: 48, lg: 64 };

export function SallyOrb({ state, size = 'md', onClick, className = '' }: SallyOrbProps) {
  const px = sizeMap[size];
  const prefersReducedMotion = useReducedMotion();

  const orbAnimations: Record<OrbState, TargetAndTransition> = {
    idle: prefersReducedMotion
      ? { opacity: [0.7, 1, 0.7] }
      : { scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] },
    listening: prefersReducedMotion
      ? { opacity: 1 }
      : { scale: 1.1, opacity: 1 },
    thinking: prefersReducedMotion
      ? { opacity: [0.6, 1, 0.6] }
      : { scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] },
    speaking: prefersReducedMotion
      ? { opacity: [0.8, 1, 0.8] }
      : { scale: [1, 1.03, 1] },
  };

  const orbTransitions: Record<OrbState, Transition> = {
    idle: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    listening: { duration: 0.3 },
    thinking: { duration: 1, repeat: Infinity },
    speaking: { duration: 0.5, repeat: Infinity },
  };

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full ${className}`}
      style={{ width: px, height: px }}
      aria-label={`SALLY assistant - ${state}`}
    >
      {/* Ripple rings for speaking state */}
      {state === 'speaking' && !prefersReducedMotion && [0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-gray-400 dark:border-gray-600"
          style={{ width: px, height: px }}
          initial={{ scale: 1, opacity: 0.3 }}
          animate={{ scale: [1, 2 + i], opacity: [0.3, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Glow ring for listening state */}
      {state === 'listening' && !prefersReducedMotion && (
        <motion.div
          className="absolute rounded-full"
          style={{ width: px + 12, height: px + 12 }}
          animate={{
            boxShadow: [
              '0 0 15px rgba(150,150,150,0.3)',
              '0 0 30px rgba(150,150,150,0.5)',
              '0 0 15px rgba(150,150,150,0.3)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Main orb */}
      <motion.div
        className="rounded-full bg-black dark:bg-white flex items-center justify-center cursor-pointer"
        style={{ width: px, height: px }}
        animate={orbAnimations[state]}
        transition={orbTransitions[state]}
      >
        <svg
          width={px * 0.5}
          height={px * 0.5}
          viewBox="0 0 32 32"
          fill="none"
        >
          <path
            d="M 16 8 Q 10 8, 10 12 Q 10 14, 13 15 Q 19 16, 19 19 Q 19 22, 16 22 Q 12 22, 10 19"
            stroke="white"
            className="dark:stroke-black"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </motion.div>
    </button>
  );
}

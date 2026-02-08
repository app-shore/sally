'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * A single radiating pulse — like a heartbeat ripple.
 * Used as a visual anchor for section transitions.
 */
export function Pulse({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className={`relative flex items-center justify-center ${className}`}>
      {/* Ripple rings */}
      {isInView && [0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-gray-300 dark:border-gray-700"
          style={{ width: 20, height: 20 }}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: [1, 6 + i * 2], opacity: [0.4, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.8,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Center dot */}
      <motion.div
        className="w-2 h-2 rounded-full bg-foreground"
        animate={isInView ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
}

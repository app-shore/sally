'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface SignalSource {
  category: string;
  description: string;
  feeds: string[];
}

const sources: SignalSource[] = [
  {
    category: 'ELD / Telematics',
    description: 'Real-time HOS, location, vehicle health',
    feeds: ['Samsara', 'KeepTruckin', 'Geotab'],
  },
  {
    category: 'TMS',
    description: 'Load data, delivery windows, dispatch orders',
    feeds: ['project44', 'McLeod', 'TMW'],
  },
  {
    category: 'External Data',
    description: 'Fuel prices, weather, traffic, mapping',
    feeds: ['OPIS', 'Weather APIs', 'HERE Maps'],
  },
];

export function SignalSources() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <div ref={ref} className="relative w-full max-w-4xl mx-auto">
      {/* Central SALLY node */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex justify-center mb-16"
      >
        <div className="relative">
          {/* Pulse rings */}
          {isInView && [0, 1].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-gray-200 dark:border-gray-800"
              animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 1.5, ease: 'easeOut' }}
            />
          ))}
          <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center">
            <span className="text-background text-xs font-bold tracking-wider">SALLY</span>
          </div>
        </div>
      </motion.div>

      {/* Signal lines from sources to center — SVG */}
      <svg
        className="absolute top-0 left-0 w-full pointer-events-none"
        style={{ height: '80px' }}
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
      >
        {sources.map((_, i) => {
          const xPositions = [16.6, 50, 83.3];
          const x = xPositions[i];
          return (
            <g key={i}>
              {/* Static line */}
              <motion.line
                x1={x} y1={20}
                x2={50} y2={0}
                className="stroke-gray-200 dark:stroke-gray-800"
                strokeWidth={0.15}
                initial={{ pathLength: 0 }}
                animate={isInView ? { pathLength: 1 } : {}}
                transition={{ duration: 1, delay: 0.5 + i * 0.15 }}
              />
              {/* Signal dot traveling up the line */}
              {isInView && (
                <motion.circle
                  r={0.4}
                  className="fill-gray-400 dark:fill-gray-500"
                  animate={{
                    cx: [x, 50],
                    cy: [20, 0],
                    opacity: [0.8, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: 1.5 + i * 0.6,
                    ease: 'linear',
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Source cards */}
      <div className="grid md:grid-cols-3 gap-8 md:gap-6">
        {sources.map((source, i) => (
          <motion.div
            key={source.category}
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.7, delay: 0.4 + i * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center"
          >
            {/* Category */}
            <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">
              {source.category}
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground/70 mb-4">
              {source.description}
            </p>

            {/* Feed names as minimal pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {source.feeds.map((feed, j) => (
                <motion.span
                  key={feed}
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.8 + i * 0.15 + j * 0.1 }}
                  className="text-[10px] md:text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground"
                >
                  {feed}
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

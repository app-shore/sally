'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface FloatingSallyButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function FloatingSallyButton({ onClick, isOpen }: FloatingSallyButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
    >
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            onClick={onClick}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="relative group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            {/* Pulse rings */}
            <motion.div
              className="absolute inset-0 rounded-full bg-black"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-black"
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.2, 0, 0.2],
              }}
              transition={{
                duration: 2,
                delay: 0.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />

            {/* Main button */}
            <div className="relative w-16 h-16 bg-black rounded-full flex items-center justify-center shadow-card-lg hover:shadow-card-hover transition-shadow">
              {/* SALLY icon - stylized "S" */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                className="relative z-10"
              >
                <motion.path
                  d="M 16 8 Q 10 8, 10 12 Q 10 14, 13 15 Q 19 16, 19 19 Q 19 22, 16 22 Q 12 22, 10 19"
                  stroke="#fff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 1.5 }}
                />
                {/* AI sparkle */}
                <motion.circle
                  cx="24"
                  cy="10"
                  r="2"
                  fill="#fff"
                  initial={{ scale: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                />
              </svg>

              {/* Active indicator dot */}
              <motion.div
                className="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            </div>

            {/* Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="absolute right-full mr-4 top-1/2 -translate-y-1/2 whitespace-nowrap"
                >
                  <div className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                    Ask SALLY anything
                    <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-black" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

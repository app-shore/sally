'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, ReactNode } from 'react';

/**
 * Text that flows in from atmospheric blur — like words
 * emerging from fog. Supports children as ReactNode for
 * mixed content (spans, etc.)
 */
interface FlowTextProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'none';
}

export function FlowText({
  children,
  as: Tag = 'div',
  className = '',
  delay = 0,
  direction = 'up',
}: FlowTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const yOffset = direction === 'up' ? 30 : direction === 'down' ? -30 : 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset, filter: 'blur(12px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.9, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Tag className={className}>{children}</Tag>
    </motion.div>
  );
}

/**
 * Staggered flow — each child line appears sequentially
 */
export function FlowStagger({
  lines,
  className = '',
  lineClassName = '',
  stagger = 0.15,
  delay = 0,
}: {
  lines: string[];
  className?: string;
  lineClassName?: string;
  stagger?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{
            duration: 0.7,
            delay: delay + i * stagger,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className={lineClassName}
        >
          {line}
        </motion.div>
      ))}
    </div>
  );
}

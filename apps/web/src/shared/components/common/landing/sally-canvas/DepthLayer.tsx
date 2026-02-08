'use client';

import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { useRef, useEffect, ReactNode } from 'react';

interface DepthLayerProps {
  children: ReactNode;
  depth?: number; // 0 = no parallax, 1 = max parallax
  className?: string;
  mouseInfluence?: number; // how much mouse affects position
}

export function DepthLayer({
  children,
  depth = 0.5,
  className = '',
  mouseInfluence = 0,
}: DepthLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [depth * 100, depth * -100]);

  const springX = useSpring(mouseX, { stiffness: 50, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 30 });

  useEffect(() => {
    if (mouseInfluence === 0) return;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      mouseX.set(((e.clientX - centerX) / centerX) * mouseInfluence * 20);
      mouseY.set(((e.clientY - centerY) / centerY) * mouseInfluence * 20);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseInfluence, mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      style={{
        y,
        x: mouseInfluence > 0 ? springX : undefined,
        ...(mouseInfluence > 0 ? { translateY: springY } : {}),
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

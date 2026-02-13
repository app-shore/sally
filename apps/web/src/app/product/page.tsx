'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';
import {
  Route,
  ShieldCheck,
  Fuel,
  Activity,
  Bell,
  Smartphone,
  ArrowRight,
  Zap,
  Radio,
  MessageSquare,
  BrainCircuit,
  TrendingDown,
  Clock,
  Shield,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';

const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3001';

/* ─── Data ─── */

const stats = [
  { value: '0', label: 'HOS Violations', icon: Shield },
  { value: '40%', label: 'Less Planning Time', icon: Clock },
  { value: '12%', label: 'Fuel Cost Savings', icon: TrendingDown },
  { value: '24/7', label: 'Route Monitoring', icon: Activity },
];

const showcaseScreens = [
  {
    src: '/screenshots/command-center.png',
    alt: 'SALLY Command Center — real-time fleet overview with active routes, HOS compliance, and alerts',
    title: 'Command Center',
    subtitle: 'Your fleet at a glance. Every route, every driver, every alert — one screen.',
  },
  {
    src: '/screenshots/sally-ai-chat.png',
    alt: 'SALLY AI Chat — conversational AI co-pilot for route planning and fleet operations',
    title: 'Talk to SALLY',
    subtitle: 'Plan routes, check alerts, find drivers — just ask. SALLY understands your fleet.',
  },
  {
    src: '/screenshots/plan-route.png',
    alt: 'SALLY AI Route Planner — select loads, assign drivers, and let AI generate optimized routes',
    title: 'AI Route Planning',
    subtitle: 'Select loads, pick a driver. AI handles the rest — HOS, fuel, rest stops, all optimized.',
  },
  {
    src: '/screenshots/loads.png',
    alt: 'SALLY Loads Board — Kanban view of drafts, pending, assigned, and in-transit loads',
    title: 'Loads Board',
    subtitle: 'Every load from draft to delivery. Drag, assign, and track in real time.',
  },
  {
    src: '/screenshots/fleet.png',
    alt: 'SALLY Fleet Management — driver roster with HOS status and TMS integration',
    title: 'Fleet Management',
    subtitle: 'Your entire driver roster synced from TMS. One-click SALLY access for every driver.',
  },
];

const capabilities = [
  {
    icon: BrainCircuit,
    title: 'SALLY AI',
    description:
      'Chat with SALLY like a teammate. Natural language route planning, fleet queries, and proactive recommendations.',
  },
  {
    icon: Route,
    title: 'AI Route Optimization',
    description:
      'TSP/VRP algorithms find the ideal stop sequence, minimize miles, and insert rest and fuel stops automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Zero-Violation HOS',
    description:
      'Segment-by-segment FMCSA validation. Every route is compliant before the wheels turn.',
  },
  {
    icon: Fuel,
    title: 'Fuel Intelligence',
    description:
      'Price-aware fueling with range-based stop insertion keeps costs low across every route.',
  },
  {
    icon: Activity,
    title: '24/7 Monitoring',
    description:
      '14 trigger types watch every active route for schedule drift, HOS limits, and conditions.',
  },
  {
    icon: Bell,
    title: 'Proactive Alerts',
    description:
      'Dispatchers get notified before problems happen — HOS warnings, delays, dock issues.',
  },
  {
    icon: Smartphone,
    title: 'Driver Experience',
    description:
      'Mobile-first interface with turn-by-turn guidance, live updates, and voice interaction.',
  },
];

const steps = [
  {
    number: '01',
    icon: Zap,
    title: 'Plan',
    description: 'Tell SALLY your stops — by chat or form. AI generates an optimized route with rest and fuel stops built in.',
  },
  {
    number: '02',
    icon: Radio,
    title: 'Monitor',
    description: 'Continuous monitoring watches every active route for schedule drift, HOS limits, and road conditions.',
  },
  {
    number: '03',
    icon: MessageSquare,
    title: 'Alert & Adapt',
    description: 'Dispatchers get proactive alerts with actions. Routes auto-update. Drivers see changes instantly.',
  },
];

const integrations = [
  { label: 'ELD / Samsara', description: 'Hours of Service data' },
  { label: 'TMS', description: 'Load and dispatch sync' },
  { label: 'Fuel APIs', description: 'Real-time pricing' },
  { label: 'Weather', description: 'Route condition alerts' },
];

/* ─── Animation Variants ─── */

const easeOut = [0.21, 0.47, 0.32, 0.98] as [number, number, number, number];

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' as const },
  transition: { duration: 0.7, ease: easeOut },
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true, margin: '-60px' as const },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  whileInView: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut as [number, number, number, number] },
  },
};

/* ─── Parallax Screenshot Component ─── */

function ParallaxScreenshot({
  screen,
  index,
}: {
  screen: (typeof showcaseScreens)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const isReversed = index % 2 === 1;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8, ease: easeOut, delay: 0.1 }}
      className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8 lg:gap-16`}
    >
      {/* Screenshot */}
      <motion.div style={{ y }} className="flex-1 w-full">
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-lg">
          <Image
            src={screen.src}
            alt={screen.alt}
            width={1920}
            height={1080}
            className="w-full h-auto"
            quality={90}
          />
        </div>
      </motion.div>

      {/* Text */}
      <div className="flex-1 w-full lg:max-w-md">
        <Badge variant="muted" className="mb-3">
          {String(index + 1).padStart(2, '0')} / {String(showcaseScreens.length).padStart(2, '0')}
        </Badge>
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">
          {screen.title}
        </h3>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
          {screen.subtitle}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Page ─── */

export default function ProductPage() {
  return (
    <div className="bg-background overflow-hidden">
      {/* ━━━ Hero ━━━ */}
      <section className="relative px-4 md:px-6 lg:px-8 pt-20 md:pt-32 pb-16 md:pb-24 max-w-5xl mx-auto text-center">
        {/* Subtle radial gradient backdrop */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-muted/50 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut }}
        >
          <Badge variant="muted" className="mb-6 text-xs tracking-wider uppercase">
            Fleet Operations Platform
          </Badge>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.1]">
            Your fleet&apos;s
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground">
              nervous system
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Chat with SALLY to plan AI-optimized routes, enforce HOS compliance, and get proactive alerts — so your dispatchers can focus on what matters.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: easeOut }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a href="mailto:sales@sally.app">
            <Button size="lg" className="text-base px-8 py-6">
              Request Demo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </a>
          <a href={docsUrl}>
            <Button variant="outline" size="lg" className="text-base px-8 py-6">
              View API Docs
            </Button>
          </a>
        </motion.div>

        {/* Hero screenshot — Command Center */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: easeOut }}
          className="mt-16 md:mt-20"
        >
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-2xl">
            <Image
              src="/screenshots/command-center.png"
              alt="SALLY Command Center — real-time fleet overview"
              width={1920}
              height={1080}
              className="w-full h-auto"
              priority
              quality={90}
            />
          </div>
        </motion.div>
      </section>

      {/* ━━━ Social Proof Stats ━━━ */}
      <section className="px-4 md:px-6 lg:px-8 py-16 md:py-20 border-y border-border bg-muted/30">
        <motion.div
          {...staggerContainer}
          className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              {...staggerItem}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-foreground/5 dark:bg-foreground/10 mb-3">
                <stat.icon className="h-5 w-5 text-foreground" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ━━━ Product Showcase — Alternating Screenshots ━━━ */}
      <section className="px-4 md:px-6 lg:px-8 py-20 md:py-32 max-w-6xl mx-auto">
        <motion.div {...fadeInUp} className="text-center mb-16 md:mb-24">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Built for how dispatchers
            <br className="hidden md:block" /> actually work
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Every screen designed to reduce cognitive load, surface what matters, and let AI handle the complexity.
          </p>
        </motion.div>

        <div className="space-y-20 md:space-y-32">
          {showcaseScreens.slice(1).map((screen, i) => (
            <ParallaxScreenshot key={screen.title} screen={screen} index={i} />
          ))}
        </div>
      </section>

      {/* ━━━ How It Works ━━━ */}
      <section className="px-4 md:px-6 lg:px-8 py-20 md:py-28 bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              Three steps to autopilot
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From first load to full fleet — SALLY gets you there fast.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: easeOut }}
                className="relative"
              >
                {/* Step connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+32px)] w-[calc(100%-32px)] h-px bg-border" />
                )}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground text-background mb-5">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mb-2 tracking-widest uppercase">
                    Step {step.number}
                  </p>
                  <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ Capabilities Grid ━━━ */}
      <section className="px-4 md:px-6 lg:px-8 py-20 md:py-28 max-w-6xl mx-auto">
        <motion.div {...fadeInUp} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Everything your fleet needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Seven core capabilities working together — schedule, compliance, budget.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: easeOut }}
            >
              <Card className="h-full group hover:shadow-md transition-shadow duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-muted group-hover:bg-foreground/5 dark:group-hover:bg-foreground/10 transition-colors duration-300">
                      <cap.icon className="h-5 w-5 text-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground">{cap.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {cap.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ━━━ Integrations ━━━ */}
      <section className="px-4 md:px-6 lg:px-8 py-16 md:py-20 border-t border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Connects to your stack
            </h2>
            <p className="mt-3 text-muted-foreground">
              Plug into the systems your fleet already uses.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {integrations.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: easeOut }}
              >
                <Card className="text-center hover:shadow-md transition-shadow duration-300">
                  <CardContent className="pt-6 pb-5">
                    <p className="font-medium text-foreground text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <a href={`${docsUrl}/api-guides`}>
              <Button variant="outline">
                Explore API Guides
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ━━━ Bottom CTA ━━━ */}
      <section className="px-4 md:px-6 lg:px-8 py-24 md:py-36 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: easeOut }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Ready to give your fleet
            <br className="hidden md:block" /> a nervous system?
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-lg mx-auto">
            Join the next generation of fleet operations. See how SALLY transforms dispatching from reactive chaos to proactive confidence.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:sales@sally.app">
              <Button size="lg" className="text-base px-8 py-6">
                Request Demo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
            <a href="mailto:sales@sally.app?subject=Sales Inquiry">
              <Button variant="outline" size="lg" className="text-base px-8 py-6">
                Talk to Sales
              </Button>
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

'use client';

import {
  motion,
  useScroll,
  useTransform,
  useInView,
  animate,
} from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
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
  Mail,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';

const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3001';

/* ─── Data ─── */

const stats = [
  { value: 0, suffix: '', label: 'HOS Violations', icon: Shield },
  { value: 40, suffix: '%', label: 'Less Planning Time', icon: Clock },
  { value: 12, suffix: '%', label: 'Fuel Cost Savings', icon: TrendingDown },
  { value: 24, suffix: '/7', label: 'Route Monitoring', icon: Activity },
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
    subtitle: 'Loads flow in automatically from your email, CSV uploads, or TMS integration. No manual entry — just plan and dispatch.',
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

const loadIngestionMethods = [
  {
    icon: Mail,
    title: 'Email',
    description: 'Forward load confirmations to SALLY. Loads are created automatically — zero typing, zero copy-paste.',
  },
  {
    icon: FileSpreadsheet,
    title: 'CSV Import',
    description: 'Drag and drop a spreadsheet. Hundreds of loads ingested in seconds with smart field mapping.',
  },
  {
    icon: RefreshCw,
    title: 'TMS Sync',
    description: 'Connect your TMS and loads flow in automatically. Always in sync, always up to date.',
  },
];

/* ─── Animation Config ─── */

const easeOut = [0.21, 0.47, 0.32, 0.98] as [number, number, number, number];

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' as const },
  transition: { duration: 0.7, ease: easeOut },
};

/* ─── Animated Counter Component ─── */

function AnimatedCounter({
  value,
  suffix,
}: {
  value: number;
  suffix: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration: 1.5,
      ease: easeOut,
      onUpdate: (v) => setDisplay(Math.round(v).toString()),
    });
    return () => controls.stop();
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

/* ─── Pulsing Live Dot ─── */

function LiveDot() {
  return (
    <span className="relative inline-flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground/40 dark:bg-foreground/30" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-foreground" />
      </span>
      <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
        Live
      </span>
    </span>
  );
}

/* ─── Parallax Screenshot with Tilt ─── */

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
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const rotate = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0, -1]);
  const isReversed = index % 2 === 1;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 80 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.9, ease: easeOut, delay: 0.1 }}
      className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8 lg:gap-16`}
    >
      {/* Screenshot with parallax + subtle rotate */}
      <motion.div style={{ y, rotateX: rotate }} className="flex-1 w-full [perspective:1200px]">
        <motion.div
          className="rounded-xl border border-border overflow-hidden bg-card shadow-lg"
          whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
        >
          <Image
            src={screen.src}
            alt={screen.alt}
            width={1920}
            height={1080}
            className="w-full h-auto"
            quality={90}
          />
        </motion.div>
      </motion.div>

      {/* Text with staggered children */}
      <motion.div
        initial={{ opacity: 0, x: isReversed ? -30 : 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, delay: 0.3, ease: easeOut }}
        className="flex-1 w-full lg:max-w-md"
      >
        <Badge variant="muted" className="mb-3 text-xs">
          {String(index + 1).padStart(2, '0')} / {String(showcaseScreens.length).padStart(2, '0')}
        </Badge>
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">
          {screen.title}
        </h3>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
          {screen.subtitle}
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ─── Hero Screenshot with Scroll Perspective ─── */

function HeroScreenshot() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.92]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.6]);
  const rotateX = useTransform(scrollYProgress, [0, 0.3], [0, 4]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.5, ease: easeOut }}
      className="mt-16 md:mt-20 [perspective:1200px]"
    >
      <motion.div
        style={{ scale, opacity, rotateX }}
        className="rounded-xl border border-border overflow-hidden bg-card shadow-2xl"
      >
        <Image
          src="/screenshots/command-center.png"
          alt="SALLY Command Center — real-time fleet overview"
          width={1920}
          height={1080}
          className="w-full h-auto"
          priority
          quality={90}
        />
      </motion.div>
    </motion.div>
  );
}

/* ─── Animated Step Connector ─── */

function StepConnector() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <div ref={ref} className="hidden md:block absolute top-8 left-[calc(50%+40px)] right-0 h-px overflow-hidden">
      <motion.div
        className="h-full bg-border"
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: easeOut }}
        style={{ transformOrigin: 'left' }}
      />
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Page
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function ProductPage() {
  return (
    <div className="bg-background overflow-hidden">
      {/* ━━━ Hero ━━━ */}
      <section className="relative px-4 md:px-6 lg:px-8 pt-20 md:pt-32 pb-16 md:pb-24 max-w-5xl mx-auto text-center">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            className="absolute top-1/3 left-1/4 w-[500px] h-[400px] bg-muted/40 rounded-full blur-3xl"
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/2 right-1/4 w-[400px] h-[500px] bg-muted/30 rounded-full blur-3xl"
            animate={{
              x: [0, -25, 0],
              y: [0, 15, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Badge variant="muted" className="text-xs tracking-wider uppercase">
              Fleet Operations Platform
            </Badge>
            <LiveDot />
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.1]">
            Your fleet&apos;s
            <br />
            <motion.span
              className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-[length:200%_auto]"
              animate={{ backgroundPosition: ['0% center', '100% center', '0% center'] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              nervous system
            </motion.span>
          </h1>

          <motion.p
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Chat with SALLY to plan AI-optimized routes, enforce HOS compliance, and get proactive alerts — so your dispatchers can focus on what matters.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: easeOut }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a href="mailto:sales@sally.app">
            <Button size="lg" className="text-base px-8 py-6 group">
              Request Demo
              <motion.span
                className="inline-block ml-2"
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowRight className="h-4 w-4" />
              </motion.span>
            </Button>
          </a>
          <a href={docsUrl}>
            <Button variant="outline" size="lg" className="text-base px-8 py-6">
              View API Docs
            </Button>
          </a>
        </motion.div>

        {/* Hero screenshot with scroll perspective */}
        <HeroScreenshot />
      </section>

      {/* ━━━ Social Proof Stats (Animated Counters) ━━━ */}
      <section className="px-4 md:px-6 lg:px-8 py-16 md:py-20 border-y border-border bg-muted/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: easeOut }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-foreground/5 dark:bg-foreground/10 mb-3">
                <stat.icon className="h-5 w-5 text-foreground" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
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

      {/* ━━━ Zero-Touch Load Creation ━━━ */}
      <section className="px-4 md:px-6 lg:px-8 py-20 md:py-28 border-y border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <Badge variant="muted" className="mb-4 text-xs tracking-wider uppercase">
              Zero Manual Entry
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              Loads create themselves
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop retyping load details. Forward an email, drop a CSV, or connect your TMS — SALLY handles the rest.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {loadIngestionMethods.map((method, i) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: easeOut }}
              >
                <Card className="h-full text-center group hover:shadow-md transition-shadow duration-300">
                  <CardContent className="pt-8 pb-6">
                    <motion.div
                      className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-foreground text-background mb-5"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <method.icon className="h-6 w-6" />
                    </motion.div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{method.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      {method.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ How It Works ━━━ */}
      <section className="px-4 md:px-6 lg:px-8 py-20 md:py-28">
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
                {/* Animated connector line */}
                {i < steps.length - 1 && <StepConnector />}

                <div className="text-center">
                  <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground text-background mb-5"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <step.icon className="h-7 w-7" />
                  </motion.div>
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
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: easeOut }}
            >
              <Card className="h-full group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-muted group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                      <cap.icon className="h-5 w-5" />
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
                <Card className="text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
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
      <section className="relative px-4 md:px-6 lg:px-8 py-24 md:py-36 text-center overflow-hidden">
        {/* Subtle animated backdrop */}
        <div className="absolute inset-0 -z-10">
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-muted/40 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

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
          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6, ease: easeOut }}
          >
            <a href="mailto:sales@sally.app">
              <Button size="lg" className="text-base px-8 py-6 group">
                Request Demo
                <motion.span
                  className="inline-block ml-2"
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.span>
              </Button>
            </a>
            <a href="mailto:sales@sally.app?subject=Sales Inquiry">
              <Button variant="outline" size="lg" className="text-base px-8 py-6">
                Talk to Sales
              </Button>
            </a>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
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
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';

const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3001';

const capabilities = [
  {
    icon: BrainCircuit,
    title: 'SALLY AI',
    description:
      'Chat with SALLY like a teammate. Dispatchers and drivers talk to an AI co-pilot that plans routes, answers questions, and handles the complexity through natural conversation.',
  },
  {
    icon: Route,
    title: 'AI-Powered Route Planning',
    description:
      'AI generates optimized routes using TSP/VRP algorithms — finding the ideal stop sequence, minimizing miles, and inserting rest and fuel stops automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'HOS Compliance',
    description:
      'Zero-violation guarantee with segment-by-segment validation against FMCSA regulations.',
  },
  {
    icon: Fuel,
    title: 'Fuel Optimization',
    description:
      'Price-aware fueling with range-based stop insertion keeps costs low across every route.',
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description:
      '24/7 monitoring with 14 trigger types catches issues before they become problems.',
  },
  {
    icon: Bell,
    title: 'Dispatcher Alerts',
    description:
      'Proactive notifications when intervention is needed — HOS warnings, delays, dock issues.',
  },
  {
    icon: Smartphone,
    title: 'Driver Experience',
    description:
      'Mobile-first interface keeps drivers informed with turn-by-turn guidance and live updates.',
  },
];

const steps = [
  {
    icon: Zap,
    title: 'Plan',
    description: 'Tell SALLY your stops and constraints — by chat or API. AI generates an optimized route with rest and fuel stops built in.',
  },
  {
    icon: Radio,
    title: 'Monitor',
    description: 'Continuous monitoring watches every active route for schedule drift, HOS limits, and road conditions.',
  },
  {
    icon: MessageSquare,
    title: 'Alert',
    description: 'Dispatchers get proactive alerts with recommended actions. Drivers see live route updates.',
  },
];

const integrations = [
  { label: 'ELD / Samsara', description: 'Hours of Service data' },
  { label: 'TMS', description: 'Load and dispatch sync' },
  { label: 'Fuel APIs', description: 'Real-time pricing' },
  { label: 'Weather', description: 'Route condition alerts' },
];

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5 },
};

export default function ProductPage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="px-4 md:px-6 lg:px-8 pt-16 md:pt-24 pb-12 md:pb-16 max-w-5xl mx-auto text-center">
        <motion.div {...fadeInUp}>
          <Badge variant="muted" className="mb-4">
            Fleet Operations Platform
          </Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Your Fleet&apos;s Operating System
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Chat with SALLY to plan AI-optimized routes, enforce HOS compliance, and get proactive alerts — so your fleet runs on autopilot.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="mailto:sales@sally.app">
              <Button size="lg">
                Request Demo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
            <a href={docsUrl}>
              <Button variant="outline" size="lg">
                View API Docs
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Capabilities Grid */}
      <section className="px-4 md:px-6 lg:px-8 py-12 md:py-16 max-w-6xl mx-auto">
        <motion.div {...fadeInUp}>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            Everything your fleet needs
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-10">
            An AI-powered platform with seven core capabilities working together to keep every truck on schedule, in compliance, and on budget.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Card className="h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-md bg-muted">
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

      {/* How It Works */}
      <section className="px-4 md:px-6 lg:px-8 py-12 md:py-16 max-w-5xl mx-auto">
        <motion.div {...fadeInUp}>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            How it works
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-foreground text-background mb-4">
                <step.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="px-4 md:px-6 lg:px-8 py-12 md:py-16 max-w-5xl mx-auto">
        <motion.div {...fadeInUp}>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2">
            Connects to your stack
          </h2>
          <p className="text-muted-foreground text-center mb-10">
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
              transition={{ duration: 0.3, delay: i * 0.08 }}
            >
              <Card className="text-center">
                <CardContent className="pt-6 pb-4">
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
      </section>

      {/* Bottom CTA */}
      <section className="px-4 md:px-6 lg:px-8 py-16 md:py-24 max-w-3xl mx-auto text-center">
        <motion.div {...fadeInUp}>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Ready to give your fleet a nervous system?
          </h2>
          <p className="text-muted-foreground mb-8">
            See how SALLY can transform your fleet operations.
          </p>
          <a href="mailto:sales@sally.app">
            <Button size="lg">
              Request Demo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </a>
        </motion.div>
      </section>
    </div>
  );
}

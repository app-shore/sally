'use client';

import { motion } from 'framer-motion';
import { ScrollReveal } from './ScrollReveal';
import { Card } from '@/shared/components/ui/card';
import {
  RouteIcon,
  MonitorIcon,
  AlertIcon,
  ComplianceIcon,
  RestIcon,
  FuelIcon,
} from './FeatureCard';

export function FeaturesBentoGrid() {
  return (
    <section className="py-32 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-center mb-12">
            Intelligence That Works For You
          </h2>
          <p className="text-xl text-muted-foreground text-center max-w-3xl mx-auto mb-20">
            Powerful features working together seamlessly
          </p>
        </ScrollReveal>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-fr">

          {/* Hero Feature - HOS-Aware Routing (Large, spans 2x2) */}
          <ScrollReveal delay={0}>
            <Card className="md:col-span-3 md:row-span-2 p-8 bg-gradient-to-br from-black to-gray-800 dark:from-white dark:to-gray-200 text-white dark:text-black hover:shadow-2xl transition-all group">
              <div className="h-full flex flex-col justify-between">
                <div>
                  <div className="w-16 h-16 mb-6 transform group-hover:scale-110 transition-transform">
                    <div className="text-white dark:text-black scale-150 origin-left">
                      <RouteIcon />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold mb-4">Smart Routing</h3>
                  <p className="text-gray-300 dark:text-gray-700 leading-relaxed text-lg">
                    Routes optimized with HOS compliance, fuel efficiency, rest stops, and real-time conditions. The brain of the operation.
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-700 dark:border-gray-300">
                  <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Core Planning Engine
                  </div>
                </div>
              </div>
            </Card>
          </ScrollReveal>

          {/* Rest Insertion (Medium) */}
          <ScrollReveal delay={0.1}>
            <Card className="md:col-span-3 p-6 bg-background border-2 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 mb-4 transform group-hover:scale-110 transition-transform">
                <RestIcon />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Automatic Rest Insertion</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                System detects when rest is needed and automatically inserts optimal rest stops before violations occur
              </p>
            </Card>
          </ScrollReveal>

          {/* Fuel Optimization (Medium) */}
          <ScrollReveal delay={0.15}>
            <Card className="md:col-span-3 p-6 bg-background border-2 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 mb-4 transform group-hover:scale-110 transition-transform">
                <FuelIcon />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Smart Fuel Optimization</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Find the best fuel stops based on price, location, and route efficiency
              </p>
            </Card>
          </ScrollReveal>

          {/* 24/7 Monitoring (Emphasized) */}
          <ScrollReveal delay={0.2}>
            <Card className="md:col-span-2 md:row-span-2 p-6 bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-400 dark:to-blue-600 text-white hover:shadow-2xl transition-all group">
              <div className="h-full flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 mb-4 transform group-hover:scale-110 transition-transform">
                    <div className="scale-125 origin-left">
                      <MonitorIcon />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">24/7 Continuous Monitoring</h3>
                  <p className="text-blue-100 dark:text-blue-50 leading-relaxed">
                    14 trigger types monitored every 60 seconds to catch issues before they become problems
                  </p>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm text-blue-200 dark:text-blue-100">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Always Active
                  </div>
                </div>
              </div>
            </Card>
          </ScrollReveal>

          {/* Proactive Alerts (Medium) */}
          <ScrollReveal delay={0.25}>
            <Card className="md:col-span-2 p-6 bg-background border-2 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 mb-4 transform group-hover:scale-110 transition-transform">
                <AlertIcon />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Proactive Alerts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Dispatchers get notified instantly when intervention is needed
              </p>
            </Card>
          </ScrollReveal>

          {/* Zero Violations (Emphasized) */}
          <ScrollReveal delay={0.3}>
            <Card className="md:col-span-2 p-6 bg-gradient-to-br from-green-500 to-green-700 dark:from-green-400 dark:to-green-600 text-white hover:shadow-2xl transition-all group">
              <div className="w-14 h-14 mb-4 transform group-hover:scale-110 transition-transform">
                <div className="scale-125 origin-left">
                  <ComplianceIcon />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3">Zero Violations</h3>
              <p className="text-green-100 dark:text-green-50 leading-relaxed">
                100% HOS compliance on every route
              </p>
              <div className="mt-4 pt-4 border-t border-green-400 dark:border-green-300">
                <div className="text-sm font-semibold">The Promise</div>
              </div>
            </Card>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
}

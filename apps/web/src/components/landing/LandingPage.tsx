"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Clock, Shield, Zap, Database, Route, TrendingUp, AlertTriangle, MapPin, Fuel } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-1.5 text-xs sm:text-sm font-medium text-white">
            <Shield className="h-4 w-4" />
            Zero HOS Violations Guaranteed
          </div>
          <h1 className="mb-3 sm:mb-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
            REST-OS
          </h1>
          <p className="mb-2 text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 font-semibold">
            HOS-Aware Route Planning Platform
          </p>
          <p className="mx-auto mb-4 max-w-3xl text-sm sm:text-base md:text-lg text-gray-500 px-4">
            The only route planner that understands drivers have hours, not infinite time.
          </p>
          <p className="mx-auto mb-8 sm:mb-12 max-w-3xl text-sm sm:text-base text-gray-600 px-4">
            Optimize multi-stop routes with automatic rest stop insertion, continuous HOS monitoring,
            and dynamic updates that keep your fleet compliant while maximizing efficiency.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <Link href="/route-planner">
              <Button
                size="lg"
                className="gap-2 bg-gray-900 px-6 sm:px-8 hover:bg-gray-800 w-full sm:w-auto"
              >
                Plan a Route
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/rest-optimizer">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 px-6 sm:px-8 w-full sm:w-auto"
              >
                Try Rest Optimizer
              </Button>
            </Link>
          </div>
        </div>

        {/* Route Planning Preview */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <Card className="border-gray-200 bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
            <CardContent className="p-6 sm:p-8 md:p-10">
              <div className="grid gap-8 lg:grid-cols-2 items-center">
                <div>
                  <h2 className="mb-4 text-2xl sm:text-3xl font-bold">
                    HOS-Aware Route Planning
                  </h2>
                  <p className="mb-6 text-gray-300 text-sm sm:text-base">
                    Unlike traditional route planners that only optimize for distance,
                    REST-OS continuously monitors driver hours and automatically inserts
                    rest stops, fuel stops, and breaks before violations occur.
                  </p>
                  <div className="space-y-3">
                    <PreviewFeature
                      icon={<Route className="h-5 w-5" />}
                      text="Optimizes multi-stop routes with TSP algorithm"
                    />
                    <PreviewFeature
                      icon={<Clock className="h-5 w-5" />}
                      text="Auto-inserts rest stops when HOS limits approached"
                    />
                    <PreviewFeature
                      icon={<Fuel className="h-5 w-5" />}
                      text="Optimizes fuel stops based on price and route"
                    />
                    <PreviewFeature
                      icon={<AlertTriangle className="h-5 w-5" />}
                      text="14 trigger types monitored continuously (60s intervals)"
                    />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 text-gray-900">
                  <div className="space-y-3">
                    <RouteSegmentDemo
                      sequence={1}
                      label="Origin → Stop A"
                      duration="2.0h"
                      icon={<MapPin className="h-4 w-4" />}
                    />
                    <RouteSegmentDemo
                      sequence={2}
                      label="Truck Stop - Full Rest"
                      duration="10h"
                      icon={<Clock className="h-4 w-4" />}
                      highlight
                    />
                    <RouteSegmentDemo
                      sequence={3}
                      label="Stop A → Stop B"
                      duration="3.5h"
                      icon={<MapPin className="h-4 w-4" />}
                    />
                    <RouteSegmentDemo
                      sequence={4}
                      label="Fuel Stop - Lowest Price"
                      duration="0.5h"
                      icon={<Fuel className="h-4 w-4" />}
                    />
                    <RouteSegmentDemo
                      sequence={5}
                      label="Stop B → Destination"
                      duration="2.0h"
                      icon={<MapPin className="h-4 w-4" />}
                    />
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Total Distance: 450 miles</span>
                      <span>HOS Compliant ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="mt-12 sm:mt-16 md:mt-20 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Proactive HOS Monitoring"
            description="Continuous simulation of remaining route every 60 seconds. Detects violations before they happen and automatically inserts rest stops."
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Dynamic Updates"
            description="Real-world conditions trigger re-planning: traffic delays, dock time changes, load modifications, and 11 other trigger types."
          />
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6" />}
            title="Cost Optimization"
            description="Minimize total route time or cost with intelligent fuel stop selection, efficient stop sequencing, and optimal rest timing."
          />
          <FeatureCard
            icon={<Route className="h-6 w-6" />}
            title="Multi-Stop Planning"
            description="Handles 5-10 stops with TSP optimization, respects time windows, and ensures appointment commitments are met."
          />
          <FeatureCard
            icon={<Database className="h-6 w-6" />}
            title="Complete Audit Trail"
            description="Every decision logged for compliance. Track plan versions, understand why routes changed, and maintain detailed records."
          />
          <FeatureCard
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Reactive Compliance"
            description="If violations occur despite proactive monitoring, system forces immediate mandatory rest with critical priority alerts."
          />
        </div>

        {/* How It Works */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <h2 className="mb-6 sm:mb-8 md:mb-10 text-center text-2xl sm:text-3xl font-bold text-gray-900">
            How It Works
          </h2>
          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
            <Step
              number="1"
              title="Plan Your Route"
              description="Select driver, add multiple stops, and set optimization priority. System generates HOS-compliant route with automatic rest and fuel stop insertion in under 5 seconds."
            />
            <Step
              number="2"
              title="Monitor Continuously"
              description="Activate route to start 24/7 monitoring. System checks 14 trigger types every 60 seconds: HOS limits, traffic, dock changes, fuel levels, and more."
            />
            <Step
              number="3"
              title="Adapt Dynamically"
              description="When conditions change, system decides: re-plan entire route or update ETAs only. Drivers receive alerts with new plans and clear reasoning for changes."
            />
          </div>
        </div>

        {/* ROI Section for Fleet Managers */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <Card className="border-gray-200 bg-white">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <h2 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-bold text-gray-900 text-center">
                Built for Fleet Operations at Scale
              </h2>
              <div className="grid gap-6 sm:gap-8 md:grid-cols-3 mb-8">
                <MetricCard
                  metric="Zero"
                  label="HOS Violations"
                  description="Proactive monitoring prevents violations before they occur"
                />
                <MetricCard
                  metric="100%"
                  label="Compliance Coverage"
                  description="All 14 trigger types monitored continuously"
                />
                <MetricCard
                  metric="<5s"
                  label="Planning Speed"
                  description="Optimize 5-10 stop routes instantly"
                />
              </div>
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                <UseCase
                  title="Fleet Managers"
                  description="Eliminate HOS violations (average $16,000 per violation), improve on-time delivery rates, and reduce fuel costs through optimized routing. Complete audit trail for DOT inspections."
                />
                <UseCase
                  title="Dispatchers"
                  description="Plan complex multi-stop routes in seconds, not hours. Automatic re-planning when conditions change means fewer manual interventions and more reliable ETAs."
                />
                <UseCase
                  title="Safety Officers"
                  description="Every route decision logged with full reasoning. Track plan versions, understand trigger causes, and demonstrate proactive compliance management to regulators."
                />
                <UseCase
                  title="Drivers"
                  description="Never worry about running out of hours. System plans rest stops automatically and alerts you before limits are reached. Clear guidance means less stress and better work-life balance."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unique Market Position */}
        <div className="mt-12 sm:mt-16 md:mt-20 text-center">
          <Card className="border-2 border-gray-900 bg-gray-50">
            <CardContent className="p-6 sm:p-8 md:p-10">
              <h2 className="mb-4 text-2xl sm:text-3xl font-bold text-gray-900">
                Why REST-OS is Different
              </h2>
              <p className="mx-auto max-w-3xl text-base sm:text-lg text-gray-600 mb-6">
                Traditional route planners optimize for distance or time. REST-OS optimizes for
                <span className="font-bold text-gray-900"> feasibility</span>.
              </p>
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 text-left max-w-4xl mx-auto">
                <ComparisonCard
                  type="traditional"
                  title="Traditional Route Planners"
                  points={[
                    "Distance-based optimization only",
                    "No HOS awareness",
                    "Static routes (no monitoring)",
                    "Drivers manually plan rest stops",
                    "Violations discovered after the fact"
                  ]}
                />
                <ComparisonCard
                  type="restos"
                  title="REST-OS"
                  points={[
                    "HOS-aware optimization",
                    "Automatic rest stop insertion",
                    "Continuous monitoring (14 triggers)",
                    "Proactive violation prevention",
                    "Dynamic re-planning when needed"
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-gray-200 bg-white transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900 text-white">
          {icon}
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mb-4 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-lg font-bold text-white">
          {number}
        </div>
      </div>
      <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function UseCase({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function PreviewFeature({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
        {icon}
      </div>
      <p className="text-sm text-gray-200">{text}</p>
    </div>
  );
}

function RouteSegmentDemo({
  sequence,
  label,
  duration,
  icon,
  highlight = false,
}: {
  sequence: number;
  label: string;
  duration: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  const bgColor = highlight ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200";
  const textColor = highlight ? "text-amber-700" : "text-gray-700";

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${bgColor}`}>
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
        {sequence}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className={textColor}>{icon}</div>
          <p className="text-xs sm:text-sm font-medium text-gray-900">{label}</p>
        </div>
      </div>
      <div className="text-xs font-mono text-gray-500">{duration}</div>
    </div>
  );
}

function MetricCard({
  metric,
  label,
  description,
}: {
  metric: string;
  label: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mb-2 text-3xl sm:text-4xl font-bold text-gray-900">{metric}</div>
      <div className="mb-1 text-sm sm:text-base font-semibold text-gray-700">{label}</div>
      <p className="text-xs sm:text-sm text-gray-600">{description}</p>
    </div>
  );
}

function ComparisonCard({
  type,
  title,
  points,
}: {
  type: "traditional" | "restos";
  title: string;
  points: string[];
}) {
  const isRestOS = type === "restos";
  const bgColor = isRestOS ? "bg-gray-900 text-white" : "bg-white";
  const pointColor = isRestOS ? "text-gray-300" : "text-gray-600";

  return (
    <div className={`p-4 sm:p-6 rounded-lg ${bgColor}`}>
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <ul className="space-y-2">
        {points.map((point, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            <span className={pointColor}>{isRestOS ? "✓" : "×"}</span>
            <span className={pointColor}>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

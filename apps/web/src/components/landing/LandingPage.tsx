"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Clock, Shield, Zap, Database, Route } from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onViewHistory: () => void;
}

export function LandingPage({ onGetStarted, onViewHistory }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="text-center">
          <h1 className="mb-3 sm:mb-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
            REST-OS
          </h1>
          <p className="mb-2 text-base sm:text-lg md:text-xl text-gray-600">
            Rest Optimization System for Truck Drivers
          </p>
          <p className="mx-auto mb-8 sm:mb-12 max-w-2xl text-sm sm:text-base text-gray-500 px-4">
            Intelligent rest recommendations that ensure HOS compliance while
            maximizing operational efficiency and driver well-being.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="gap-2 bg-gray-900 px-6 sm:px-8 hover:bg-gray-800 w-full sm:w-auto"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              onClick={onViewHistory}
              size="lg"
              variant="outline"
              className="gap-2 px-6 sm:px-8 w-full sm:w-auto"
            >
              View History
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-12 sm:mt-16 md:mt-20 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="HOS Compliance"
            description="Automatically calculates Hours of Service limits and ensures all recommendations meet FMCSA regulations."
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Intelligent Recommendations"
            description="Advanced decision engine analyzes driver status, dock times, and route requirements for optimal rest timing."
          />
          <FeatureCard
            icon={<Clock className="h-6 w-6" />}
            title="Real-Time Optimization"
            description="Instantly calculate whether full rest, partial rest, or no rest is needed based on current conditions."
          />
          <FeatureCard
            icon={<Route className="h-6 w-6" />}
            title="Route-Aware"
            description="Takes into account remaining distance, destination, and post-load drive feasibility."
          />
          <FeatureCard
            icon={<Database className="h-6 w-6" />}
            title="Future Integration"
            description="Designed to integrate with ELD and TMS systems for seamless automated data flow."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Transparent Logic"
            description="Every recommendation includes detailed reasoning so you understand the 'why' behind each decision."
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
              title="Input Parameters"
              description="Enter driver status (hours driven, on-duty time) and trip details (dock duration, destination, distance)."
            />
            <Step
              number="2"
              title="Run Analysis"
              description="Our optimization engine evaluates HOS compliance, operational requirements, and dock timing to find the best rest strategy."
            />
            <Step
              number="3"
              title="Get Recommendation"
              description="Receive clear guidance on rest requirements with duration, compliance status, and detailed reasoning."
            />
          </div>
        </div>

        {/* Use Cases */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <Card className="border-gray-200 bg-white">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <h2 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-bold text-gray-900">
                Who Benefits from REST-OS?
              </h2>
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                <UseCase
                  title="Fleet Managers"
                  description="Optimize driver schedules, reduce compliance violations, and improve operational efficiency across your fleet."
                />
                <UseCase
                  title="Dispatchers"
                  description="Make informed decisions about load assignments and delivery timelines based on real-time driver status."
                />
                <UseCase
                  title="Safety Officers"
                  description="Ensure HOS compliance, reduce fatigue-related incidents, and maintain detailed rest decision records."
                />
                <UseCase
                  title="Drivers"
                  description="Get clear guidance on rest requirements, avoid violations, and maintain a healthy work-life balance."
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

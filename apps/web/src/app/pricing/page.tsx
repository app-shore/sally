'use client';

import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

export default function PricingPage() {
  return (
    <div className="bg-background min-h-[calc(100vh-57px)] flex items-center justify-center px-4 md:px-6 lg:px-8 py-16">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          Pricing
        </h1>
        <p className="mt-3 text-base md:text-lg text-muted-foreground">
          We&apos;re building something special for fleets of every size.
        </p>

        <Card className="mt-8">
          <CardContent className="pt-8 pb-8 px-6 md:px-8">
            <p className="text-lg font-semibold text-foreground mb-2">
              Pricing plans coming soon
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              SALLY is currently in early access. We&apos;d love to understand your fleet and build the right plan for you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="mailto:sales@sally.app">
                <Button size="lg">
                  <Mail className="h-4 w-4 mr-2" />
                  Request a Demo
                </Button>
              </a>
              <a href="mailto:sales@sally.app?subject=Sales Inquiry">
                <Button variant="outline" size="lg">
                  Talk to Sales
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-sm text-muted-foreground">
          Already have access?{' '}
          <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

import { FeatureCard } from "@/components/FeatureCard"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const isPublic = process.env.NEXT_PUBLIC_DOCS_MODE === 'public'

export function DocsHome() {
  return (
    <div className="not-prose">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-4xl">
          SALLY Developer Portal
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground md:text-lg">
          Build on the intelligent fleet operations platform. SALLY converses — dispatchers ask, drivers update, and the platform handles the rest.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/getting-started/quickstart">
            <Button size="lg" className="w-full sm:w-auto">
              Get API Access
            </Button>
          </Link>
          {!isPublic && (
            <Link href="/developer-guide/environment-setup">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Developer Setup
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Entry Points */}
      <div className={`mb-12 grid grid-cols-1 gap-6 ${!isPublic ? 'md:grid-cols-2' : ''}`}>
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-2 text-xl font-bold text-foreground">For API Consumers</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Integrate SALLY into your fleet management tools. Route planning, HOS compliance, alerts, and monitoring via REST API.
          </p>
          <div className="space-y-3">
            <Link href="/getting-started/quickstart" className="block text-sm text-foreground hover:underline">
              Quickstart (5 min) &rarr;
            </Link>
            <Link href="/api-reference" className="block text-sm text-foreground hover:underline">
              API Reference &rarr;
            </Link>
            <Link href="/api-playground" className="block text-sm text-foreground hover:underline">
              API Playground &rarr;
            </Link>
          </div>
        </div>

        {!isPublic && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-2 text-xl font-bold text-foreground">For Developers</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Contribute to the SALLY platform. NestJS backend, Next.js frontend, PostgreSQL, and more.
            </p>
            <div className="space-y-3">
              <Link href="/developer-guide/environment-setup" className="block text-sm text-foreground hover:underline">
                Environment Setup &rarr;
              </Link>
              <Link href="/developer-guide/architecture" className="block text-sm text-foreground hover:underline">
                Architecture &rarr;
              </Link>
              <Link href="/contributing" className="block text-sm text-foreground hover:underline">
                Contributing &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* What is SALLY */}
      <div className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
          What is SALLY?
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Every day, US trucking dispatchers juggle route planning, Hours of Service regulations, fuel costs, and
          real-time disruptions across dozens of drivers — mostly in spreadsheets and phone calls. SALLY closes that
          coordination gap. It is a fleet operations platform that generates compliance-first routes with automatic rest
          and fuel stop insertion, monitors every active route around the clock, and alerts dispatchers the moment
          something needs attention. The result: fewer HOS violations, lower fuel spend, and dispatchers who manage
          by exception instead of by guesswork.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="mb-12">
        <h2 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">
          Core Features
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon=""
            title="SALLY AI"
            description="Conversational co-pilot for dispatchers and drivers"
            href="/product/features"
          />
          <FeatureCard
            icon=""
            title="Route Planning"
            description="Optimal stop sequence with TSP/VRP optimization"
            href="/api-playground#tag/Routes"
          />
          <FeatureCard
            icon=""
            title="Rest Stop Insertion"
            description="Automatic rest stops where HOS requires"
            href="/getting-started/understanding-hos"
          />
          <FeatureCard
            icon=""
            title="Fuel Optimization"
            description="Smart fuel stops based on range and pricing"
            href="/api-playground#tag/Routes"
          />
          <FeatureCard
            icon=""
            title="HOS Compliance"
            description="Zero violations with segment-by-segment validation"
            href="/getting-started/understanding-hos"
          />
          <FeatureCard
            icon=""
            title="24/7 Monitoring"
            description="20 alert types across 6 categories"
            href="/api-playground#operation/getRouteMonitoring"
          />
          <FeatureCard
            icon=""
            title="Dynamic Updates"
            description="Proactive and reactive route adjustments"
            href="/api-playground#tag/Routes"
          />
        </div>
      </div>

      {/* Tech Stack Bar — internal only */}
      {!isPublic && (
        <div className="rounded-lg border border-border bg-card px-6 py-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Built with
          </p>
          <p className="mt-1 text-sm text-foreground">
            NestJS · Next.js · PostgreSQL · Redis · Prisma · Tailwind · Shadcn/ui
          </p>
        </div>
      )}
    </div>
  )
}

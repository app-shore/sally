# Marketing Site Navigation & Pages — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add navigation (Home, Product, Developers, Pricing) to the public layout and create Product and Pricing pages for prospective clients.

**Architecture:** New routes `/product` and `/pricing` in the existing Next.js app, plus navigation links in `PublicLayout.tsx`. The "Developers" link navigates to the external docs site URL. All pages use the existing `PublicLayout` automatically (they are not in `protectedRoutePatterns`).

**Tech Stack:** Next.js 15 (App Router), Framer Motion 12, Shadcn/ui, Tailwind CSS, TypeScript

**Design Doc:** `.docs/plans/2026-02-13-marketing-site-and-docs-separation-design.md`

---

### Task 1: Add NEXT_PUBLIC_DOCS_URL env var

**Files:**
- Modify: `apps/web/.env.example`
- Modify: `apps/web/.env.local`

**Step 1: Add env var to .env.example**

Add at the end of `apps/web/.env.example`:

```
# --------------- Docs Site ---------------
NEXT_PUBLIC_DOCS_URL=http://localhost:3001
```

**Step 2: Add env var to .env.local**

Add at the end of `apps/web/.env.local`:

```
# --------------- Docs Site ---------------
NEXT_PUBLIC_DOCS_URL=http://localhost:3001
```

**Step 3: Commit**

```bash
git add apps/web/.env.example
git commit -m "chore: add NEXT_PUBLIC_DOCS_URL env var for docs site link"
```

Note: Do NOT commit `.env.local` (it should be in `.gitignore`).

---

### Task 2: Add navigation links to PublicLayout

**Files:**
- Modify: `apps/web/src/shared/components/layout/PublicLayout.tsx`

**Step 1: Add navigation to PublicLayout**

Replace the entire content of `apps/web/src/shared/components/layout/PublicLayout.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogIn, LogOut, ArrowRight, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { Button } from '@/shared/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { getDefaultRouteForRole } from '@/shared/lib/navigation';

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3001';

const navItems = [
  { label: 'Home', href: '/', external: false },
  { label: 'Product', href: '/product', external: false },
  { label: 'Developers', href: DOCS_URL, external: true },
  { label: 'Pricing', href: '/pricing', external: false },
];

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * PublicLayout - Layout for unauthenticated pages (landing, login, product, pricing)
 * Provides header with navigation, branding, login button, and theme toggle
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, signOut } = useAuthStore();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Public Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          {/* Logo and tagline */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-lg sm:text-xl font-bold text-foreground hover:text-muted-foreground transition-opacity font-space-grotesk"
              data-sally-logo
            >
              SALLY
            </Link>
            <span className="hidden lg:inline text-xs text-muted-foreground">|</span>
            <p className="hidden lg:block text-xs text-muted-foreground">
              Smart Routes. Confident Dispatchers. Happy Drivers.
            </p>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {/* Nav Links */}
            <nav className="flex items-center gap-1 mr-4">
              {navItems.map((item) => {
                const isActive = !item.external && pathname === item.href;
                const linkClass = `px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isActive
                    ? 'text-foreground font-medium bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`;

                if (item.external) {
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      className={linkClass}
                    >
                      {item.label}
                    </a>
                  );
                }

                return (
                  <Link key={item.label} href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <ThemeToggle />

            {/* User info if authenticated */}
            {isAuthenticated && user && (
              <div className="text-sm text-muted-foreground ml-2 mr-2">
                <span className="font-medium">
                  {user.firstName} {user.lastName}
                </span>
                <span className="mx-2">·</span>
                <span className="text-xs">{user.tenantName}</span>
              </div>
            )}

            {/* Login/Logout */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-2 ml-2">
                <Link href="/register">
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link href={getDefaultRouteForRole(user?.role)}>
                  <Button size="sm">
                    Go to App
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="flex flex-col p-2 space-y-1">
              {/* Nav Links */}
              <nav className="flex flex-col space-y-1 pb-2 border-b border-border mb-2">
                {navItems.map((item) => {
                  const isActive = !item.external && pathname === item.href;
                  const linkClass = `px-4 py-2.5 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'text-foreground font-medium bg-muted'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`;

                  if (item.external) {
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        className={linkClass}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={linkClass}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Theme toggle on mobile */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Theme
                </span>
                <ThemeToggle />
              </div>

              {/* Login/Logout on mobile */}
              {!isAuthenticated ? (
                <>
                  <Link href="/register" className="w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Register
                    </Button>
                  </Link>
                  <Link href="/login" className="w-full">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href={getDefaultRouteForRole(user?.role)} className="w-full">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Go to App
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default PublicLayout;
```

Key changes from original:
- Added `usePathname` import for active state detection
- Added `DOCS_URL` constant from env var
- Added `navItems` array with Home, Product, Developers (external), Pricing
- Desktop: nav links between logo/tagline and theme toggle
- Mobile: nav links in dropdown above theme toggle, separated by border
- Active state: `bg-muted text-foreground font-medium` for current page
- External links use `<a>` tag, internal links use Next.js `<Link>`
- Changed tagline breakpoint from `sm:` to `lg:` to make room for nav links

**Step 2: Verify the app compiles**

Run: `cd /Users/ajay-admin/sally && pnpm --filter web dev`

Open `http://localhost:3000` in browser. Verify:
- Nav links appear on desktop between logo and auth buttons
- "Home" is highlighted as active on the landing page
- "Developers" link navigates to docs site
- Mobile menu shows nav links above theme toggle
- Dark theme works correctly

**Step 3: Commit**

```bash
git add apps/web/src/shared/components/layout/PublicLayout.tsx
git commit -m "feat: add navigation links to public layout header"
```

---

### Task 3: Create Product page

**Files:**
- Create: `apps/web/src/app/product/page.tsx`

**Step 1: Create the Product page**

Create `apps/web/src/app/product/page.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import {
  MapPin,
  Clock,
  Fuel,
  Activity,
  Bell,
  Smartphone,
  ArrowRight,
  Plug,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3001';

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const capabilities = [
  {
    icon: MapPin,
    title: 'Route Planning',
    description:
      'TSP/VRP optimization finds the best stop sequence. Every route is planned for minimal miles, maximum compliance.',
  },
  {
    icon: Clock,
    title: 'HOS Compliance',
    description:
      'Segment-by-segment HOS simulation guarantees zero violations. Rest stops inserted automatically where regulations require.',
  },
  {
    icon: Fuel,
    title: 'Fuel Optimization',
    description:
      'Smart fuel stops based on vehicle range and real-time pricing. Fueling decisions that save money without adding risk.',
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description:
      '24/7 monitoring across 14 trigger types. Weather, traffic, dock delays, HOS clocks — all watched continuously.',
  },
  {
    icon: Bell,
    title: 'Dispatcher Alerts',
    description:
      'Proactive notifications the moment intervention is needed. Dispatchers manage by exception, not by guesswork.',
  },
  {
    icon: Smartphone,
    title: 'Driver Experience',
    description:
      'Mobile-first interface for drivers on the road. Route updates, rest stop guidance, and dispatch messages in one place.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Plan',
    description:
      'Submit origin, destination, and stops. SALLY returns an optimized route with rest stops, fuel stops, and HOS-compliant timing.',
  },
  {
    number: '02',
    title: 'Monitor',
    description:
      'Every active route is watched around the clock. 14 trigger types detect changes before they become problems.',
  },
  {
    number: '03',
    title: 'Alert',
    description:
      'When conditions change, SALLY re-plans automatically and alerts the right person — dispatcher or driver — with clear next steps.',
  },
];

const integrations = [
  { name: 'ELD / Samsara', description: 'Real-time HOS data from electronic logging devices' },
  { name: 'TMS', description: 'Load and shipment data from your transportation management system' },
  { name: 'Fuel APIs', description: 'Live fuel pricing across truck stop networks' },
  { name: 'Weather', description: 'Corridor-level weather conditions and forecasts' },
];

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
            {...fadeInUp}
          >
            Your Fleet&apos;s Operating System
          </motion.h1>
          <motion.p
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
            {...fadeInUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            SALLY plans compliant routes, monitors every mile, and alerts your team the moment something needs attention.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            {...fadeInUp}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <a href="mailto:hello@sally.app?subject=Demo Request">
              <Button size="lg">
                Request Demo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
            <a href={DOCS_URL}>
              <Button size="lg" variant="outline">
                View API Docs
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="py-16 md:py-24 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-4"
            {...fadeInUp}
          >
            What SALLY does
          </motion.h2>
          <motion.p
            className="text-sm md:text-base text-muted-foreground text-center max-w-xl mx-auto mb-12"
            {...fadeInUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            End-to-end fleet operations — from route planning to driver communication.
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <cap.icon className="h-5 w-5 text-muted-foreground" />
                      {cap.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{cap.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-12"
            {...fadeInUp}
          >
            How it works
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.15 }}
                className="text-center"
              >
                <div className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 md:py-24 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <motion.div className="text-center mb-12" {...fadeInUp}>
            <Plug className="h-6 w-6 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Connects to your stack
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
              SALLY integrates with the systems you already use to build a complete picture of your fleet.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {integrations.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-sm mb-1">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div
            className="text-center mt-8"
            {...fadeInUp}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <a href={`${DOCS_URL}/api-guides`}>
              <Button variant="outline" size="sm">
                Explore API Guides
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 md:py-32 px-4 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2
            className="text-2xl md:text-3xl font-bold tracking-tight mb-6"
            {...fadeInUp}
          >
            Ready to give your fleet a nervous system?
          </motion.h2>
          <motion.div {...fadeInUp} transition={{ duration: 0.5, delay: 0.1 }}>
            <a href="mailto:hello@sally.app?subject=Demo Request">
              <Button size="lg">
                Request Demo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
```

**Step 2: Verify the page renders**

Run: `cd /Users/ajay-admin/sally && pnpm --filter web dev`

Open `http://localhost:3000/product` in browser. Verify:
- All 5 sections render correctly
- Nav shows "Product" as active
- Cards use Shadcn components
- Dark theme works
- Responsive at 375px, 768px, 1440px
- Framer Motion fade-in animations trigger on scroll

**Step 3: Commit**

```bash
git add apps/web/src/app/product/page.tsx
git commit -m "feat: add product feature showcase page"
```

---

### Task 4: Create Pricing page

**Files:**
- Create: `apps/web/src/app/pricing/page.tsx`

**Step 1: Create the Pricing page**

Create `apps/web/src/app/pricing/page.tsx`:

```tsx
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Pricing
          </h1>
          <p className="text-base text-muted-foreground mb-10">
            We&apos;re building something special for fleets of every size.
          </p>

          <Card>
            <CardContent className="pt-8 pb-8 px-6 md:px-8 text-center">
              <h2 className="text-xl font-semibold mb-3">
                Pricing plans coming soon
              </h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                SALLY is currently in early access. We&apos;d love to understand your fleet
                and build the right plan for you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a href="mailto:hello@sally.app?subject=Demo Request">
                  <Button size="lg">
                    Request a Demo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </a>
                <a href="mailto:sales@sally.app?subject=Pricing Inquiry">
                  <Button size="lg" variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Talk to Sales
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          <p className="mt-8 text-xs text-muted-foreground">
            Already have access?{' '}
            <Link href="/login" className="underline hover:text-foreground transition-colors">
              Login
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
```

**Step 2: Verify the page renders**

Open `http://localhost:3000/pricing` in browser. Verify:
- Centered card with coming soon message
- Both CTA buttons visible
- "Login" link at bottom works
- Nav shows "Pricing" as active
- Dark theme works
- Responsive at 375px, 768px, 1440px

**Step 3: Commit**

```bash
git add apps/web/src/app/pricing/page.tsx
git commit -m "feat: add pricing coming-soon page"
```

---

### Task 5: Final verification and combined commit

**Step 1: Full verification checklist**

Open `http://localhost:3000` and verify:
- [ ] Landing page (Home) renders as before with nav showing "Home" active
- [ ] Click "Product" in nav → `/product` renders, "Product" highlighted
- [ ] Click "Developers" in nav → navigates to docs site (localhost:3001)
- [ ] Click "Pricing" in nav → `/pricing` renders, "Pricing" highlighted
- [ ] Mobile menu (< 768px): all 4 nav links visible above theme toggle
- [ ] Dark theme: all pages look correct
- [ ] Light theme: all pages look correct
- [ ] Login/Register buttons still work

**Step 2: No additional commit needed — individual tasks already committed**

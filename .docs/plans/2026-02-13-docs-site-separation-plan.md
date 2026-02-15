# Docs Site Public/Internal Separation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add build-time separation to the docs site so internal engineering docs (Developer Guide, Contributing) are excluded from the public production build, while remaining visible during local development.

**Architecture:** A `DOCS_MODE` environment variable (`internal` default, `public` for production) controls which sections appear in navigation and which pages are built. Nextra's `_meta.ts` conditionally includes/excludes sections. A Webpack plugin excludes internal page directories from the public build. The docs site header gets a "Back to SALLY" link.

**Tech Stack:** Nextra 3.3, Next.js 15, TypeScript, Vercel deployment

**Design Doc:** `.docs/plans/2026-02-13-marketing-site-and-docs-separation-design.md`

---

### Task 1: Add environment variables to docs app

**Files:**
- Modify: `apps/docs/.env`
- Modify: `apps/docs/.env.example`

**Step 1: Update .env with defaults**

Add to `apps/docs/.env`:

```
# --------------- Docs Mode ---------------
# "internal" = show all docs (dev default)
# "public" = hide Developer Guide + Contributing (production)
DOCS_MODE=internal

# --------------- App URL ---------------
# URL of the main SALLY app (for "Back to SALLY" link)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 2: Update .env.example**

Add to `apps/docs/.env.example`:

```
# --------------- Docs Mode ---------------
# "internal" = show all docs (dev default)
# "public" = hide Developer Guide + Contributing (production)
DOCS_MODE=internal

# --------------- App URL ---------------
# URL of the main SALLY app (for "Back to SALLY" link)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 3: Commit**

```bash
git add apps/docs/.env.example
git commit -m "chore: add DOCS_MODE and NEXT_PUBLIC_APP_URL env vars to docs app"
```

Note: Check if `apps/docs/.env` is in `.gitignore`. If it is, only commit `.env.example`. If it's tracked (some Nextra projects track `.env`), commit both.

---

### Task 2: Make _meta.ts conditional based on DOCS_MODE

**Files:**
- Modify: `apps/docs/pages/_meta.ts`

**Step 1: Update _meta.ts**

Replace the entire content of `apps/docs/pages/_meta.ts` with:

```ts
const isPublic = process.env.DOCS_MODE === 'public'

const meta: Record<string, any> = {
  "index": {
    "title": "Home",
    "type": "page",
    "display": "hidden"
  },
  "product": {
    "title": "Product",
    "type": "page"
  },
  "getting-started": {
    "title": "Getting Started",
    "type": "page"
  },
  "api-guides": {
    "title": "API Guides",
    "type": "page"
  },
  "api-reference": {
    "title": "API Reference",
    "type": "page"
  },
  "api-playground": {
    "title": "API Playground",
    "type": "page"
  },
  ...(!isPublic ? {
    "developer-guide": {
      "title": "Developer Guide",
      "type": "page"
    },
    "contributing": {
      "title": "Contributing",
      "type": "page"
    },
  } : {}),
  "resources": {
    "title": "Resources",
    "type": "page"
  },
  "blog": {
    "title": "Blog",
    "type": "page"
  }
}

export default meta
```

**Step 2: Verify in internal mode**

Run: `cd /Users/ajay-admin/sally && pnpm --filter docs dev`

Open `http://localhost:3001`. Verify:
- All sections visible in sidebar: Getting Started, API Guides, API Reference, API Playground, Developer Guide, Contributing, Resources, Blog
- This is the default behavior (DOCS_MODE=internal)

**Step 3: Verify in public mode**

Stop the dev server. Set `DOCS_MODE=public` in `apps/docs/.env` temporarily.

Run: `cd /Users/ajay-admin/sally && pnpm --filter docs dev`

Open `http://localhost:3001`. Verify:
- Developer Guide and Contributing are NOT in the sidebar
- All other sections visible

Revert `DOCS_MODE` back to `internal` in `.env`.

**Step 4: Commit**

```bash
git add apps/docs/pages/_meta.ts
git commit -m "feat: conditional _meta.ts based on DOCS_MODE env var"
```

---

### Task 3: Exclude internal pages from public build

**Files:**
- Modify: `apps/docs/next.config.mjs`

**Step 1: Update next.config.mjs to exclude internal pages in public mode**

Replace the entire content of `apps/docs/next.config.mjs` with:

```mjs
import nextra from 'nextra'

const isGithubPages = process.env.GITHUB_PAGES === 'true'
const isPublic = process.env.DOCS_MODE === 'public'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true
})

export default withNextra({
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  ...(isGithubPages && {
    basePath: '/sally',
    assetPrefix: '/sally/'
  }),
  // In public mode, exclude internal docs directories from the build
  ...(isPublic && {
    webpack: (config) => {
      config.plugins.push(
        new (await import('webpack')).default.IgnorePlugin({
          checkResource: (resource, context) => {
            // Exclude developer-guide and contributing pages in public mode
            if (context && (
              context.includes('/pages/developer-guide') ||
              context.includes('/pages/contributing')
            )) {
              return true
            }
            return false
          }
        })
      )
      return config
    }
  })
})
```

**Important:** The `IgnorePlugin` approach with dynamic `await import('webpack')` may not work in all Next.js configs. If this fails, use the alternative approach below.

**Alternative Step 1 (if IgnorePlugin doesn't work): Use redirects instead**

Replace with:

```mjs
import nextra from 'nextra'

const isGithubPages = process.env.GITHUB_PAGES === 'true'
const isPublic = process.env.DOCS_MODE === 'public'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true
})

export default withNextra({
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  ...(isGithubPages && {
    basePath: '/sally',
    assetPrefix: '/sally/'
  }),
  // In public mode, redirect internal docs to 404
  ...(isPublic && {
    redirects: async () => [
      {
        source: '/developer-guide/:path*',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/contributing/:path*',
        destination: '/404',
        permanent: false,
      },
    ],
  })
})
```

**Note on `output: 'export'`:** Since this is a static export site, `redirects` won't work with `output: 'export'`. The pages will still be built but hidden from navigation. This is acceptable because:
1. The pages are not linked anywhere in the public nav
2. Someone would have to guess the exact URL to find them
3. For true exclusion, consider removing `output: 'export'` or using a pre-build script that moves the directories

**Pragmatic approach:** Since `_meta.ts` already hides the sections from navigation and the homepage (Task 4), the IgnorePlugin/redirects are a defense-in-depth layer. If neither works cleanly with `output: 'export'`, skip this task and rely on navigation hiding alone. The pages technically exist in the build but are undiscoverable.

**Step 2: Test the build**

```bash
cd /Users/ajay-admin/sally/apps/docs
DOCS_MODE=public pnpm build
```

Check that the build succeeds. If using IgnorePlugin, verify that `developer-guide` and `contributing` pages are not in the output.

**Step 3: Commit**

```bash
git add apps/docs/next.config.mjs
git commit -m "feat: exclude internal docs from public build"
```

---

### Task 4: Convert docs homepage to conditional TSX

**Files:**
- Delete: `apps/docs/pages/index.mdx`
- Create: `apps/docs/pages/index.tsx`

**Step 1: Create the new index.tsx**

Delete `apps/docs/pages/index.mdx` and create `apps/docs/pages/index.tsx`:

```tsx
import { FeatureCard } from "@/components/FeatureCard"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const isPublic = process.env.DOCS_MODE === 'public'

export default function DocsHomePage() {
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
```

**Important Nextra note:** Nextra 3 expects pages to be `.mdx` files by default. A `.tsx` page in the `pages/` directory should work as a regular Next.js page, but verify that:
1. The page renders with the Nextra layout (sidebar, header, etc.)
2. If it doesn't, you may need to wrap the content in Nextra's layout manually or keep it as `.mdx` with a component import

**Alternative approach if TSX doesn't work with Nextra layout:**

Keep `index.mdx` but import a component:

```mdx
---
title: SALLY Developer Portal
description: Build on the intelligent fleet operations platform
---

import { DocsHome } from "@/components/DocsHome"

<DocsHome />
```

And create `apps/docs/components/DocsHome.tsx` with the conditional logic above.

**Step 2: Verify in internal mode**

Run: `cd /Users/ajay-admin/sally && pnpm --filter docs dev`

Open `http://localhost:3001`. Verify:
- Both "For API Consumers" and "For Developers" cards visible
- "Developer Setup" hero button visible
- "Built with" tech stack bar visible

**Step 3: Verify in public mode**

Set `DOCS_MODE=public` in `apps/docs/.env` temporarily.

Restart dev server. Verify:
- Only "For API Consumers" card visible (full width, no grid)
- "Developer Setup" hero button hidden
- "Built with" tech stack bar hidden

Revert `DOCS_MODE` back to `internal`.

**Step 4: Commit**

```bash
git add apps/docs/pages/index.tsx
git rm apps/docs/pages/index.mdx  # if replaced
git commit -m "feat: conditional docs homepage based on DOCS_MODE"
```

---

### Task 5: Add "Back to SALLY" link in docs header

**Files:**
- Modify: `apps/docs/theme.config.tsx`

**Step 1: Update theme.config.tsx**

Replace the entire content of `apps/docs/theme.config.tsx` with:

```tsx
import { useConfig } from 'nextra-theme-docs';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const config = {
  // Logo in minimal navbar
  logo: <span className="font-bold">SALLY Developer Portal</span>,

  // Project links
  project: {
    link: 'https://github.com/ajaynarang/sally'
  },
  docsRepositoryBase: 'https://github.com/ajaynarang/sally/tree/main/apps/docs',

  // Black, white, and gray color scheme
  primaryHue: 0,
  primarySaturation: 0,

  // Force light mode only -- no light/dark toggle
  darkMode: false,
  nextThemes: {
    defaultTheme: 'light',
    forcedTheme: 'light',
    storageKey: 'sally-theme'
  },

  // Sidebar configuration
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true
  },

  // Table of Contents configuration
  toc: {
    float: true,
    title: 'On This Page'
  },

  // Extra content in navbar — "Back to SALLY" link
  navbar: {
    extraContent: (
      <a
        href={APP_URL}
        className="nx-text-sm nx-text-gray-500 hover:nx-text-gray-900 nx-transition-colors nx-flex nx-items-center nx-gap-1"
      >
        &larr; Back to SALLY
      </a>
    )
  },

  // Footer
  footer: {
    text: (
      <span>
        {new Date().getFullYear()} &copy; SALLY - Your Fleet Operations Assistant
      </span>
    )
  },

  // Head meta tags
  head: () => {
    const { title } = useConfig();
    return (
      <>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:title" content={title || 'SALLY Developer Portal'} />
        <meta property="og:description" content="API documentation for SALLY Fleet Operations Assistant" />
        <link rel="icon" href="/favicon.ico" />
      </>
    );
  },

  // Disable top-level navigation in navbar (sidebar-only navigation)
  navigation: false,

  // Search configuration
  search: {
    placeholder: 'Search documentation...'
  }
};

export default config;
```

Key changes:
- Added `APP_URL` constant from `NEXT_PUBLIC_APP_URL` env var
- Added `navbar.extraContent` with "Back to SALLY" link
- The link uses Nextra's `nx-` utility classes for styling

**Important Nextra note:** The `navbar.extraContent` API may differ between Nextra versions. If `navbar.extraContent` doesn't work in Nextra 3.3, try these alternatives:

Alternative 1 — Use `logo` to include the link:
```tsx
logo: (
  <div className="flex items-center gap-4">
    <span className="font-bold">SALLY Developer Portal</span>
    <a href={APP_URL} className="text-xs text-gray-500 hover:text-gray-900">
      &larr; Back to SALLY
    </a>
  </div>
),
```

Alternative 2 — Check Nextra 3 docs for the correct API name (could be `navbar.extraContent`, `extraContent`, or a custom component).

**Step 2: Verify**

Run: `cd /Users/ajay-admin/sally && pnpm --filter docs dev`

Open `http://localhost:3001`. Verify:
- "Back to SALLY" link appears in the navbar
- Clicking it navigates to `http://localhost:3000`
- Styling is subtle (gray text, hover to dark)

**Step 3: Commit**

```bash
git add apps/docs/theme.config.tsx
git commit -m "feat: add 'Back to SALLY' link in docs navbar"
```

---

### Task 6: Final verification

**Step 1: Test internal mode (default)**

Ensure `DOCS_MODE=internal` in `apps/docs/.env`.

```bash
cd /Users/ajay-admin/sally && pnpm --filter docs dev
```

Verify:
- [ ] All sidebar sections visible (Getting Started, API Guides, API Reference, API Playground, Developer Guide, Contributing, Resources, Blog)
- [ ] Homepage shows both cards, Developer Setup button, tech stack bar
- [ ] "Back to SALLY" link in navbar works

**Step 2: Test public mode**

Set `DOCS_MODE=public` in `apps/docs/.env`.

Restart dev server. Verify:
- [ ] Sidebar only shows: Getting Started, API Guides, API Reference, API Playground, Product, Resources, Blog
- [ ] Developer Guide and Contributing are NOT in sidebar
- [ ] Homepage shows only API Consumers card (full width)
- [ ] Developer Setup button hidden
- [ ] Tech stack bar hidden
- [ ] "Back to SALLY" link still works

Revert `DOCS_MODE` back to `internal`.

**Step 3: Test static export in public mode**

```bash
cd /Users/ajay-admin/sally/apps/docs
DOCS_MODE=public pnpm build
```

Verify build succeeds.

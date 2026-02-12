# SALLY Developer Portal - Complete Rebuild Design

**Date:** February 5, 2026
**Status:** Design Phase
**Goal:** Build a clean, Apple-like developer portal with proper navigation, dark/light mode, and comprehensive content

---

## Current Problems

1. **Broken Dark Mode** - Theme switching doesn't work properly, colors are broken
2. **Poor Navigation** - Everything dumped into route-planning, no clear structure
3. **Missing Content** - Placeholder pages with no actual documentation
4. **Broken Layouts** - Hydration errors, nested HTML issues
5. **No API Organization** - All APIs shown together without logical grouping

---

## Design Philosophy: Apple Developer Portal Approach

### Core Principles

1. **Clean & Minimal** - White space, clear typography, focused content
2. **Easy Navigation** - Clear hierarchy, intuitive sections
3. **Dark/Light Mode** - Seamless switching, proper color tokens
4. **Progressive Disclosure** - Start simple, provide depth on demand
5. **Visual Polish** - Smooth animations, consistent spacing, professional feel

---

## Information Architecture

### 1. Home Page (/)
**Purpose:** First impression, quick navigation to key sections

**Content:**
- Hero section with SALLY overview
- 4-6 feature cards (HOS Compliance, Route Optimization, etc.)
- Quick start CTAs (Get API Key, View Docs, Try Playground)
- Status indicator (Staging/Production)

**Design:**
- Large hero with gradient background
- Feature grid (2x2 on desktop, 1 column on mobile)
- Prominent CTA buttons
- Clean footer with links

---

### 2. Getting Started (/getting-started)

**Structure:**
```
/getting-started
  /introduction          # What is SALLY, core concepts
  /quickstart           # 5-minute setup guide
  /authentication       # How API auth works
  /api-keys             # Managing keys
  /first-route          # Create your first route (hands-on)
```

**Content Focus:**
- Step-by-step tutorials
- Code examples in multiple languages
- Success/error handling patterns
- Common pitfalls and solutions

---

### 3. Guides (/guides)

**Structure:**
```
/guides
  /overview                    # Guide index

  /route-planning
    /understanding-hos         # HOS compliance basics
    /creating-routes          # Route planning guide
    /stop-optimization        # Stop sequence optimization
    /rest-stops               # REST optimization
    /fuel-stops               # Fuel stop insertion
    /route-updates            # Dynamic updates

  /monitoring
    /overview                 # Monitoring system intro
    /alert-types              # 14 trigger types explained
    /handling-alerts          # Best practices

  /integration
    /webhook-setup            # Setting up webhooks
    /error-handling           # Error handling patterns
    /rate-limiting            # Managing rate limits
    /testing                  # Testing strategies
```

**Content Style:**
- Problem → Solution format
- Real-world examples
- Best practices sections
- Troubleshooting guides

---

### 4. API Reference (/api-reference)

**Structure:**
```
/api-reference
  /overview                # API overview, base URL, auth

  /routes
    /plan-route            # POST /routes/plan
    /update-route          # POST /routes/update
    /get-route             # GET /routes/{id}
    /get-monitoring        # GET /routes/{id}/monitoring

  /alerts
    /list-alerts           # GET /alerts
    /acknowledge-alert     # POST /alerts/{id}/acknowledge
    /resolve-alert         # POST /alerts/{id}/resolve

  /hos
    /validate-hos          # POST /hos/validate

  /optimization
    /recommend-rest        # POST /rest/recommend
    /find-fuel-stops       # POST /fuel/find-stops

  /webhooks
    /configure-webhooks    # Webhook endpoints
```

**Design:**
- Interactive API playground (Scalar) embedded
- Request/response examples
- Parameter descriptions
- Error code reference

---

### 5. Architecture (/architecture)

**Structure:**
```
/architecture
  /overview                  # System overview
  /c4-diagrams
    /context                 # C4 Level 1: System Context
    /containers              # C4 Level 2: Containers
    /components              # C4 Level 3: Components
  /data-flow                 # How data flows through system
  /monitoring-system         # Continuous monitoring architecture
  /rest-optimization         # REST engine architecture
  /scaling                   # Horizontal scaling approach
```

**Content:**
- C4 diagrams (use existing from `.docs/technical/architecture/`)
- Sequence diagrams for key flows
- Technology stack explanations
- Design decisions and trade-offs

---

### 6. Blog (/blog)

**Initial Posts:**
1. **"Introducing SALLY: HOS-Compliant Route Planning"**
   - Product vision
   - Why we built it
   - Key capabilities

2. **"How SALLY Optimizes Rest Stops"**
   - REST optimization algorithm
   - Trade-offs between rest vs dock time
   - Real-world examples

3. **"Building Reliable Monitoring Systems"**
   - 14 trigger types explained
   - Proactive vs reactive monitoring
   - Alert fatigue prevention

**Structure:**
```
/blog
  /index                     # Blog index with cards
  /2026-02-05-introducing-sally
  /2026-02-05-rest-optimization
  /2026-02-05-monitoring-system
```

---

### 7. Resources (/resources)

**Structure:**
```
/resources
  /support                   # How to get help
  /changelog                 # API version history
  /status                    # System status page
  /sdks                      # Client libraries (future)
  /examples                  # Example projects (future)
  /faq                       # Common questions
```

---

## Theme System (Dark/Light Mode)

### Color Tokens

**Light Mode:**
```css
--background: 0 0% 100%           /* White */
--foreground: 0 0% 3.9%           /* Near black */
--card: 0 0% 100%                 /* White */
--muted: 0 0% 96.1%               /* Light gray */
--border: 0 0% 89.8%              /* Border gray */
--primary: 0 0% 9%                /* Black */
```

**Dark Mode:**
```css
--background: 0 0% 3.9%           /* Near black */
--foreground: 0 0% 98%            /* Near white */
--card: 0 0% 3.9%                 /* Near black */
--muted: 0 0% 14.9%               /* Dark gray */
--border: 0 0% 14.9%              /* Border dark */
--primary: 0 0% 98%               /* White */
```

### Implementation
- Use CSS variables for all colors
- Next-themes for theme switching
- Persist preference in localStorage
- Smooth transitions on theme change
- System preference detection

---

## Component Library

### Custom Components Needed

1. **FeatureCard** - Homepage feature cards
2. **CodeBlock** - Syntax-highlighted code examples
3. **APIEndpoint** - API endpoint documentation
4. **Callout** - Info/warning/error callouts (already exists)
5. **Tabs** - For multi-language examples
6. **Card** - Content cards (from Shadcn)
7. **Badge** - Status badges (from Shadcn)
8. **Button** - CTAs (from Shadcn)

### Reuse from apps/web
- Import Shadcn components directly
- Keep consistent design language
- Share Tailwind config

---

## Navigation System

### Layout Style: Full-Width Modern with Sidebar-Only Navigation

**Top Navigation Bar (Fixed, Full Width, Minimal)**
- Logo + Project Name (left): "🚛 SALLY Developer Portal"
- Search bar (center/right): Full-width search with kbd shortcuts
- Theme toggle (right): ☀️/🌙 smooth transition
- GitHub link (right): Icon only
- Height: 64px, backdrop blur, sticky on scroll

**Purpose:** Clean, minimal top bar - just branding, search, and utilities

**Content Area (Full Width)**
```
┌─────────────────────────────────────────────────────────────┐
│  Left Sidebar    │    Main Content Area    │  Right TOC     │
│  (240px fixed)   │    (flex-grow, max-w)   │  (240px fixed) │
│                  │                          │                │
│  - Collapsible   │  - Full bleed on mobile │  - On this page│
│  - Sections      │  - Centered on desktop  │  - Jump links  │
│  - Active state  │  - Max width: 1200px    │  - Auto-hide   │
│                  │                          │                │
└─────────────────────────────────────────────────────────────┘
```

**Layout Modes:**

1. **Three-Column (Desktop > 1440px)**
   - Left sidebar: 240px (navigation)
   - Main content: flex-grow (max 1200px centered)
   - Right sidebar: 240px (table of contents)

2. **Two-Column (Tablet 768px - 1440px)**
   - Left sidebar: 240px (navigation)
   - Main content: flex-grow (full width)
   - Right sidebar: Hidden

3. **Single Column (Mobile < 768px)**
   - All sidebars hidden (hamburger menu)
   - Content: Full width with padding
   - Floating TOC button (bottom right)

### Sidebar Design (Left) - ALL NAVIGATION HERE

**Structure:**
```
📘 Getting Started
  ▸ Introduction
  ▸ Quickstart
  ▸ Authentication
  ▸ API Keys
  ▸ First Route

📖 Guides
  ▾ Route Planning
    • Understanding HOS
    • Creating Routes
    • Stop Optimization
    • Rest Stops
    • Fuel Stops
    • Route Updates
  ▸ Monitoring
    • Overview
    • Alert Types
    • Handling Alerts
  ▸ Integration
    • Webhook Setup
    • Error Handling
    • Rate Limiting
    • Testing

📡 API Reference
  ▸ Overview
  ▾ Routes
    • Plan Route
    • Update Route
    • Get Route
    • Get Monitoring
  ▸ Alerts
  ▸ HOS
  ▸ Optimization
  ▸ Webhooks

🏗️ Architecture
  ▸ Overview
  ▸ C4 Diagrams
  ▸ Data Flow
  ▸ Monitoring System
  ▸ REST Optimization

📝 Blog
  ▸ All Posts
  ▸ Introducing SALLY
  ▸ REST Optimization
  ▸ Monitoring System

🔧 Resources
  ▸ Support
  ▸ Changelog
  ▸ FAQ
  ▸ Status
```

**Visual Design:**
- Fixed position, full height
- Top-level sections: Emoji + Bold text
- Collapsible with ▸/▾ arrows
- Active page: Bold + blue border-left (4px)
- Hover: Subtle background (gray-100/gray-800)
- Category spacing: py-2 between sections
- Link spacing: py-1.5, pl-6 for nested items
- Smooth expand/collapse animations (200ms)
- Width: 280px (slightly wider for hierarchy)

### Table of Contents (Right)
- Shows H2 and H3 headings
- Sticky positioning
- Active section highlights as you scroll
- Smooth scroll on click
- Hidden on tablet/mobile

### Mobile Navigation
- Hamburger menu (top left, replaces sidebar)
- Full-screen slide-in overlay
- Same navigation structure
- Smooth slide animation
- Close button (top right)

---

## Content Strategy

### Phase 1: Core Documentation (This Sprint)
1. ✅ Fix theme system completely
2. ✅ Create all guide pages with real content from `.docs`
3. ✅ Build architecture pages with C4 diagrams
4. ✅ Write 3 blog posts
5. ✅ Complete resources section

### Phase 2: API Reference (Next Sprint)
1. Complete all API endpoint pages
2. Add code examples for each endpoint
3. Test Scalar playground integration
4. Add webhook documentation

### Phase 3: Polish (Final Sprint)
1. Add search functionality
2. Add syntax highlighting
3. Optimize performance
4. Add analytics
5. Deploy to production

---

## Technical Implementation

### Nextra Configuration for Full-Width Layout

**theme.config.tsx:**
```tsx
export default {
  // Layout
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true
  },

  // Full-width content
  main: {
    maxWidth: '1200px',  // Max content width
    padding: '0 2rem'     // Side padding
  },

  // TOC
  toc: {
    float: true,          // Floating TOC
    title: 'On This Page',
    headingComponent: ({ children }) => <>{children}</>,
    backToTop: true
  },

  // Navbar
  navbar: {
    logo: <Logo />,
    extraContent: <ThemeToggle />
  },

  // Dark mode
  darkMode: true,
  nextThemes: {
    defaultTheme: 'dark',
    storageKey: 'sally-theme'
  }
}
```

**Custom CSS (globals.css):**
```css
/* Full-width layout override */
.nextra-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* Sidebar styling */
.nextra-sidebar-container {
  width: 240px;
  border-right: 1px solid var(--border);
}

/* TOC styling */
.nextra-toc {
  width: 240px;
  border-left: 1px solid var(--border);
}

/* Responsive: Hide TOC on tablet */
@media (max-width: 1440px) {
  .nextra-toc {
    display: none;
  }
}

/* Responsive: Hide sidebar on mobile */
@media (max-width: 768px) {
  .nextra-sidebar-container {
    display: none;
  }
}
```

### File Structure
```
apps/docs/
├── pages/
│   ├── index.mdx                    # Homepage
│   ├── _app.tsx                     # App wrapper
│   ├── _meta.ts                     # Top-level nav
│   │
│   ├── getting-started/
│   │   ├── _meta.ts
│   │   ├── introduction.mdx
│   │   ├── quickstart.mdx
│   │   ├── authentication.mdx
│   │   ├── api-keys.mdx
│   │   └── first-route.mdx
│   │
│   ├── guides/
│   │   ├── _meta.ts
│   │   ├── index.mdx
│   │   ├── route-planning/
│   │   │   ├── _meta.ts
│   │   │   ├── understanding-hos.mdx
│   │   │   ├── creating-routes.mdx
│   │   │   └── ...
│   │   ├── monitoring/
│   │   └── integration/
│   │
│   ├── api-reference/
│   │   ├── _meta.ts
│   │   ├── overview.mdx
│   │   └── ... (organized by resource)
│   │
│   ├── architecture/
│   │   ├── _meta.ts
│   │   ├── overview.mdx
│   │   └── c4-diagrams/
│   │
│   ├── blog/
│   │   ├── _meta.ts
│   │   ├── index.mdx
│   │   └── [post-slug].mdx
│   │
│   └── resources/
│       ├── _meta.ts
│       └── ...
│
├── components/
│   ├── FeatureCard.tsx
│   ├── CodeBlock.tsx
│   ├── APIEndpoint.tsx
│   ├── Callout.tsx
│   └── ...
│
├── styles/
│   └── globals.css                  # Theme variables
│
├── theme.config.tsx                 # Nextra theme config
└── next.config.mjs                  # Next.js config
```

---

## Next Steps

1. **Fix Theme System** - Ensure dark/light mode works perfectly
2. **Content Migration** - Pull content from `.docs` into MDX files
3. **Component Building** - Create reusable components
4. **Navigation Setup** - Configure _meta.ts files properly
5. **Testing** - Verify all pages render correctly

---

## Success Criteria

✅ Dark/light mode works flawlessly
✅ All navigation links work
✅ No hydration errors
✅ Mobile responsive
✅ Clean, Apple-like aesthetic
✅ Real content (no "Coming Soon")
✅ Fast build times
✅ SEO optimized

---

## Questions for User

Before implementation, confirm:

1. **Content Priorities** - Which guides are most important? (Route Planning? Monitoring? Integration?)
2. **Blog Tone** - Technical deep-dives or product-focused announcements?
3. **Architecture Depth** - How detailed should C4 diagrams be?
4. **Branding** - Any specific colors, logos, or design elements to incorporate?


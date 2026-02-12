# SALLY Developer Portal - Final Layout (Sidebar-Only Navigation)

## Desktop View (> 1440px) - Clean & Minimal

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  🚛 SALLY Developer Portal          [Search documentation...]    ☀️/🌙  GitHub      │
│  (minimal top bar - just branding, search, utilities)                                │
└──────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ┌────────────────┐ ┌──────────────────────────────────────┐ ┌──────────────────┐   │
│ │                │ │                                      │ │                  │   │
│ │ SIDEBAR        │ │   MAIN CONTENT                       │ │  ON THIS PAGE    │   │
│ │ (280px)        │ │   (max 1200px, centered)             │ │  (240px)         │   │
│ │                │ │                                      │ │                  │   │
│ │ 📘 Getting St. │ │   # Understanding HOS Compliance     │ │  - Overview      │   │
│ │   ▸ Intro      │ │                                      │ │  - Rules         │   │
│ │   ▸ Quickstart │ │   The Federal Motor Carrier Safety   │ │  - Examples      │   │
│ │   ▸ Auth       │ │   Administration (FMCSA) defines...  │ │  - Violations    │   │
│ │   ▸ API Keys   │ │                                      │ │                  │   │
│ │   ▸ First Rte  │ │   ## Driving Time Limits             │ │  (sticky)        │   │
│ │                │ │                                      │ │  (auto-scroll)   │   │
│ │ 📖 Guides      │ │   ```javascript                      │ │                  │   │
│ │   ▾ Route Plan │ │   const hos = {                      │ │                  │   │
│ │ ┃   • HOS      │ │     driving: 11,  // hours           │ │                  │   │
│ │ ┃   • Routes   │ │     onDuty: 14    // hours           │ │                  │   │
│ │ ┃   • Stops    │ │   }                                  │ │                  │   │
│ │ ┃   • Rest     │ │   ```                                │ │                  │   │
│ │ ┃   • Fuel     │ │                                      │ │                  │   │
│ │ ┃   • Updates  │ │   ## Break Requirements              │ │                  │   │
│ │   ▸ Monitor    │ │                                      │ │                  │   │
│ │   ▸ Integrate  │ │   Drivers must take a 30-minute...   │ │                  │   │
│ │                │ │                                      │ │                  │   │
│ │ 📡 API Ref     │ │                                      │ │                  │   │
│ │   ▸ Overview   │ │                                      │ │                  │   │
│ │   ▸ Routes     │ │                                      │ │                  │   │
│ │   ▸ Alerts     │ │                                      │ │                  │   │
│ │                │ │                                      │ │                  │   │
│ │ 🏗️ Architect  │ │                                      │ │                  │   │
│ │ 📝 Blog        │ │                                      │ │                  │   │
│ │ 🔧 Resources   │ │                                      │ │                  │   │
│ │                │ │                                      │ │                  │   │
│ └────────────────┘ └──────────────────────────────────────┘ └──────────────────┘   │
│    ALL NAVIGATION       FOCUSED CONTENT                        QUICK JUMP           │
│    IN ONE PLACE         AREA                                   LINKS                │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

## Key Visual Elements

### Top Bar (64px height)
```
┌──────────────────────────────────────────────────────────────┐
│  🚛 SALLY Developer Portal     [🔍 Search...]    ☀️  🐙       │
│  ↑                             ↑                ↑   ↑        │
│  Logo + Name                   Search          Theme GitHub  │
│  (hover: subtle)               (⌘K shortcut)   Toggle Icon   │
└──────────────────────────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-background/80` with backdrop-blur-lg
- Border bottom: `border-border` (1px)
- Padding: `px-6 py-3`
- Sticky positioning on scroll
- Shadow on scroll: subtle

### Left Sidebar (280px width)

```
┌─────────────────────────────┐
│                             │
│  📘 Getting Started         │  ← Section Header (bold, py-3)
│    ▸ Introduction           │  ← Collapsed subsection
│    ▸ Quickstart             │
│    ▸ Authentication         │
│    ▸ API Keys               │
│    ▸ First Route            │
│                             │  ← py-2 spacing
│  📖 Guides                  │
│    ▾ Route Planning         │  ← Expanded subsection
│  ┃   • Understanding HOS    │  ← Active page (blue bar)
│  ┃   • Creating Routes      │
│  ┃   • Stop Optimization    │
│  ┃   • Rest Stops           │
│  ┃   • Fuel Stops           │
│  ┃   • Route Updates        │
│    ▸ Monitoring             │
│      • Overview             │
│      • Alert Types          │
│      • Handling Alerts      │
│    ▸ Integration            │
│                             │
│  📡 API Reference           │
│    ▸ Overview               │
│    ▾ Routes                 │
│      • Plan Route           │
│      • Update Route         │
│      • Get Route            │
│      • Get Monitoring       │
│    ▸ Alerts                 │
│    ▸ HOS                    │
│    ▸ Optimization           │
│                             │
│  🏗️ Architecture            │
│  📝 Blog                    │
│  🔧 Resources               │
│                             │
└─────────────────────────────┘
```

**Styling:**
- Section headers: `text-base font-semibold py-3`
- Subsection toggles: `text-sm py-1.5 pl-4`
- Links: `text-sm py-1.5 pl-8`
- Active link: `font-medium + border-l-4 border-blue-500`
- Hover: `bg-gray-100 dark:bg-gray-800`
- Icons: Emoji for top-level, • for items
- Arrows: ▸ (collapsed) / ▾ (expanded)

### Main Content Area (max 1200px)

```
┌─────────────────────────────────────────┐
│                                         │
│  # Page Title                           │  ← h1: text-4xl
│  (mt-8, mb-4)                           │
│                                         │
│  Brief intro paragraph...               │  ← Lead text
│                                         │
│  ## Section Title                       │  ← h2: text-2xl
│                                         │
│  Content with generous spacing...       │
│                                         │
│  ```javascript                          │  ← Code blocks
│  // Syntax highlighted                  │     (full width)
│  ```                                    │
│                                         │
│  <Callout type="info">                  │  ← Custom components
│    Important information                │
│  </Callout>                             │
│                                         │
│  ### Subsection                         │  ← h3: text-xl
│                                         │
│  More content...                        │
│                                         │
└─────────────────────────────────────────┘
```

**Spacing:**
- Headings: `mt-10 mb-4`
- Paragraphs: `mb-4`
- Code blocks: `my-6`
- Lists: `my-4`
- Line height: `leading-7`

### Right TOC (240px width)

```
┌──────────────────────┐
│                      │
│  ON THIS PAGE        │  ← Small caps, gray
│                      │
│  Overview            │  ← Active (blue)
│  Rules               │
│  Examples            │
│  Violations          │
│  Best Practices      │
│                      │
│  (sticky)            │
│  (scroll spy)        │
│                      │
└──────────────────────┘
```

**Styling:**
- Header: `text-xs uppercase tracking-wide text-gray-500`
- Links: `text-sm py-1`
- Active: `text-blue-600 dark:text-blue-400 font-medium`
- Hover: `text-gray-900 dark:text-gray-100`
- Border-left on active

## Mobile View (< 768px)

```
┌──────────────────────────────────┐
│  ≡  SALLY           🔍  ☀️  🐙   │  ← Hamburger, minimal
└──────────────────────────────────┘
│                                  │
│  # Page Title                    │
│                                  │
│  Content flows full width        │
│  with proper padding...          │
│                                  │
│  ```javascript                   │
│  // Code blocks                  │
│  // scroll horizontally          │
│  ```                             │
│                                  │
│                                  │
│              ┌──────┐            │
│              │  ↑   │            │  ← Floating TOC
│              │  📋  │            │     button
│              └──────┘            │
│                                  │
└──────────────────────────────────┘
```

### Mobile Menu (Full Screen Overlay)

```
┌──────────────────────────────────┐
│  ✕  Navigation          🔍       │
└──────────────────────────────────┘
│ ┌────────────────────────────┐   │
│ │                            │   │
│ │  📘 Getting Started        │   │
│ │    ▸ Introduction          │   │
│ │    ▸ Quickstart            │   │
│ │    ▸ Authentication        │   │
│ │                            │   │
│ │  📖 Guides                 │   │
│ │    ▾ Route Planning        │   │
│ │  ┃   • Understanding HOS   │   │  ← Same structure
│ │  ┃   • Creating Routes     │   │     as desktop
│ │  ┃   • Stops               │   │
│ │                            │   │
│ │  📡 API Reference          │   │
│ │  🏗️ Architecture           │   │
│ │  📝 Blog                   │   │
│ │  🔧 Resources              │   │
│ │                            │   │
│ │  [Full scrollable]         │   │
│ │                            │   │
│ └────────────────────────────┘   │
└──────────────────────────────────┘
```

---

## Design Benefits

✅ **Clean Top Bar** - Just essentials (branding, search, utilities)
✅ **All Navigation Together** - No mental model split
✅ **Clear Hierarchy** - Emojis + indentation + arrows
✅ **Consistent Mobile** - Same nav structure, just in overlay
✅ **More Search Space** - Prominent search bar
✅ **Modern & Minimal** - Like GitHub Docs, Linear, Notion
✅ **Easy to Scan** - Visual hierarchy with emojis and spacing

---

## Color Tokens (Dark Mode Ready)

```css
/* Top Bar */
--navbar-bg: rgba(var(--background), 0.8)
--navbar-border: var(--border)

/* Sidebar */
--sidebar-bg: var(--background)
--sidebar-border: var(--border)
--sidebar-hover: var(--muted)
--sidebar-active-border: #3b82f6  /* blue-500 */
--sidebar-active-text: var(--foreground)

/* Content */
--content-bg: var(--background)
--content-text: var(--foreground)
--code-bg: var(--muted)

/* All tokens defined in both light/dark */
```


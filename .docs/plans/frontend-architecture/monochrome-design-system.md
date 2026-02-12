# Monochrome Design System

**Status:** Implemented
**Last validated:** 2026-02-12
**Source plans:** `_archive/2026-02-02-monochrome-design-system.md`

---

## Overview

SALLY uses a strictly monochrome (grayscale) design system. All CSS color variables use 0% saturation. The only exception is the `destructive` color (red) used for error states and destructive actions.

---

## Design Principles

1. **True grayscale only** -- all UI elements use black, white, and gray shades
2. **Semantic color tokens** -- components reference semantic variables, not raw colors
3. **Dark/light mode** -- both themes defined with inverted grayscale values
4. **Status indicators** -- red, yellow, green, blue allowed only for status badges and alerts with dark mode variants
5. **No accent colors** -- the design intentionally removes secondary, accent, and popover color tokens found in default Shadcn themes

---

## CSS Variables (Validated Against `apps/web/src/app/globals.css`)

### Light Mode

```css
:root {
  --background: 0 0% 100%;        /* White */
  --foreground: 0 0% 9%;          /* Near black */
  --card: 0 0% 100%;              /* White */
  --card-foreground: 0 0% 9%;     /* Near black */
  --primary: 0 0% 9%;             /* Black (main actions) */
  --primary-foreground: 0 0% 98%; /* White text on primary */
  --muted: 0 0% 96%;              /* Subtle gray background */
  --muted-foreground: 0 0% 45%;   /* Gray text */
  --border: 0 0% 90%;             /* Border gray */
  --input: 0 0% 90%;              /* Input border */
  --ring: 0 0% 9%;                /* Focus ring */
  --destructive: 0 84.2% 60.2%;   /* Red (only colored token) */
  --destructive-foreground: 0 0% 98%;
  --radius: 0.5rem;
}
```

### Dark Mode

```css
.dark {
  --background: 0 0% 9%;          /* Near black */
  --foreground: 0 0% 98%;         /* Near white */
  --card: 0 0% 15%;               /* Dark gray */
  --card-foreground: 0 0% 98%;    /* White text */
  --primary: 0 0% 98%;            /* White (inverted) */
  --primary-foreground: 0 0% 9%;  /* Black text on primary */
  --muted: 0 0% 15%;              /* Subtle dark background */
  --muted-foreground: 0 0% 65%;   /* Light gray text */
  --border: 0 0% 25%;             /* Dark border */
  --input: 0 0% 25%;              /* Dark input border */
  --ring: 0 0% 83%;               /* Light focus ring */
  --destructive: 0 62.8% 30.6%;   /* Dark red */
  --destructive-foreground: 0 0% 98%;
}
```

### Key Observations

- Every non-destructive token has **0% saturation** (true grayscale)
- `--primary` inverts between modes: black in light, white in dark
- `--secondary` and `--accent` tokens from default Shadcn were removed
- `--popover` and `--popover-foreground` tokens were removed

---

## Color Usage Rules

### Backgrounds

| Token | Use |
|-------|-----|
| `bg-background` | Main page background |
| `bg-card` | Card/panel backgrounds |
| `bg-muted` | Subtle section backgrounds, code blocks |
| `bg-primary` | Primary buttons, inverted sections |

### Text

| Token | Use |
|-------|-----|
| `text-foreground` | Primary body text |
| `text-muted-foreground` | Secondary/helper text, labels |
| `text-primary-foreground` | Text on primary background |

### Borders

| Token | Use |
|-------|-----|
| `border-border` | Standard borders (cards, dividers) |
| `border-input` | Input field borders |

### Interactive States

| Pattern | Use |
|---------|-----|
| `hover:bg-muted` | Hover state for list items, buttons |
| `hover:bg-gray-100 dark:hover:bg-gray-800` | Explicit hover where semantic tokens are insufficient |

### Forbidden Patterns

- `bg-white` (standalone, without dark variant)
- `text-gray-900` (standalone, without dark variant)
- `border-gray-200` (standalone, without dark variant)
- Any non-gray color (blue, green, purple, etc.) except for status indicators

---

## Shadcn Button Variants

The monochrome design simplifies button variants:

| Variant | Light Mode | Dark Mode |
|---------|-----------|-----------|
| `default` | Black bg, white text | White bg, black text |
| `outline` | Transparent, gray border | Transparent, gray border |
| `ghost` | Transparent, no border | Transparent, no border |
| `destructive` | Red bg, white text | Dark red bg, white text |

The `secondary` and `link` variants from default Shadcn were removed or mapped to `muted` styling.

---

## Badge Variants

- `default` -- primary colors (black/white adaptive)
- `outline` -- transparent with border
- `destructive` -- red for errors/warnings

The `secondary` badge variant was replaced with muted styling.

---

## Implementation Scope

- 30+ files migrated to use monochrome tokens
- `globals.css` updated with grayscale-only variables
- All Shadcn component overrides updated
- Landing page components use semantic tokens
- Dashboard components use semantic tokens

---

## Validation Against Current Code

| Claim | Status |
|-------|--------|
| `globals.css` uses 0% saturation for all non-destructive tokens | Confirmed |
| No `--secondary` token in globals.css | Confirmed (removed) |
| No `--accent` token in globals.css | Confirmed (removed) |
| `--primary` inverts between light/dark | Confirmed (9% light, 98% dark) |
| `--destructive` is the only colored token | Confirmed |
| `--card` uses 15% lightness in dark mode | Confirmed |

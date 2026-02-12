# Coding Guidelines

**Status:** Approved, partially automated
**Last validated:** 2026-02-12
**Source plans:** `_archive/2026-02-05-coding-guidelines-design.md`

---

## Overview

Comprehensive coding standards for the SALLY project covering both frontend (Next.js/TypeScript) and backend (NestJS/TypeScript). These guidelines are enforced by convention and partially by tooling. Full automation (ESLint rules, Husky hooks, CI blocking) is designed but not yet implemented.

---

## 12 Design Decisions

### 1. File Naming: Strict Kebab-Case

All files use `kebab-case` naming: `use-auth.ts`, `login-form.tsx`, `route-planning.service.ts`.

**Exceptions:**
- Config files: `package.json`, `tsconfig.json`
- Next.js special files: `page.tsx`, `layout.tsx`, `route.ts`

### 2. Import Strategy: Always Absolute

All imports use `@/` alias. No relative imports (`../../../`).

```typescript
// Correct
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth';

// Incorrect
import { Button } from '../../../components/ui/button';
```

### 3. UI Components: Always Shadcn

Never use plain HTML elements for UI controls:

| HTML Element | Shadcn Replacement |
|-------------|-------------------|
| `<button>` | `<Button>` |
| `<input>` | `<Input>` |
| `<select>` | `<Select>` |
| `<table>` | `<Table>` |
| `<label>` | `<Label>` |
| Custom modal | `<Dialog>` |
| Custom dropdown | `<DropdownMenu>` |

### 4. Dark Theme: Mandatory

All components must support dark theme. Use semantic tokens or explicit dark variants:

```tsx
// Correct
<div className="bg-background text-foreground">
<div className="bg-white dark:bg-gray-900">

// Incorrect
<div className="bg-white text-gray-900">
```

### 5. Responsive Design: Mobile-First

All components responsive at all breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### 6. Project Structure: Flat Feature Modules

```
features/<domain>/
  index.ts           # Barrel exports
  types.ts           # Domain types
  <domain>-api.ts    # API client
  store.ts           # Zustand store
  hooks/             # Custom hooks
  components/        # Domain UI components
```

### 7. State Management: Feature-Scoped Zustand

Each feature has its own Zustand store with custom hook wrappers. No global monolithic store.

### 8. API Layer: Feature-Aligned Modules

Each feature has its own API module (`<domain>-api.ts`) mirroring backend endpoints.

### 9. Error Handling: Centralized with Typed Errors

Custom error classes with centralized handling. Global error boundaries in layout components.

### 10. Testing: Minimal Approach

Test only critical paths and complex logic. No minimum coverage requirements. Focus on high-value tests.

### 11. TypeScript: Strict Mode

Strict TypeScript with no `any` types. `Promise<any>` returns are explicitly forbidden.

### 12. Automation: Enforce with Tooling

**Designed but not yet implemented:**
- ESLint: file naming rules, import order, no-relative-imports
- Prettier: code formatting
- Husky: pre-commit hooks (auto-fix)
- CI/CD: block merges on violations

---

## Code Review Checklist

Before committing UI code:

- [ ] All interactive elements use Shadcn components
- [ ] No plain HTML `<button>`, `<input>`, `<select>`
- [ ] No hardcoded light-only colors without dark variants
- [ ] Semantic color tokens used
- [ ] Responsive classes for all breakpoints
- [ ] Tested in both light and dark themes
- [ ] Tested on mobile, tablet, and desktop
- [ ] Only black/white/gray colors (except status indicators)

---

## Automation Status

| Tool | Status |
|------|--------|
| ESLint rules for file naming | Designed, not yet built |
| ESLint rule for no-relative-imports | Designed, not yet built |
| Prettier configuration | Designed, not yet built |
| Husky pre-commit hooks | Designed, not yet built |
| CI/CD merge blocking | Designed, not yet built |
| `.vscode/settings.json` | Designed, not yet built |
| `.vscode/extensions.json` | Designed, not yet built |

---

## Implementation Artifacts Created

- `.docs/technical/coding-guidelines.md` -- comprehensive reference guide
- `.docs/technical/automation-setup.md` -- tooling configuration spec
- CLAUDE.md -- AI context updated with UI development standards

---

## Migration Tasks (Remaining)

1. Install ESLint plugins for file naming enforcement
2. Create `.eslintrc.json` configurations (frontend and backend)
3. Create `.prettierrc` and `.prettierignore`
4. Initialize Husky with pre-commit hooks
5. Rename any remaining non-kebab-case files
6. Verify all imports use absolute paths
7. Add CI/CD pipeline step for lint enforcement

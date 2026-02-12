# Coding Guidelines System Design

**Date:** February 5, 2026
**Status:** Approved
**Author:** AI Assistant + User Collaboration

---

## Executive Summary

This document describes the design for a comprehensive coding guidelines system for the SALLY project, covering both frontend (Next.js/TypeScript) and backend (NestJS/TypeScript) development with automated enforcement.

---

## Goals

1. **Consistency:** Ensure all code follows the same conventions across the entire codebase
2. **Quality:** Maintain high code quality through automated checks
3. **Onboarding:** Make it easy for new developers to understand and follow standards
4. **Automation:** Minimize manual enforcement through tooling

---

## Design Decisions

### 1. File Naming: Strict Kebab-Case

**Decision:** All files use kebab-case naming (e.g., `use-auth.ts`, `login-form.tsx`)

**Rationale:**
- Consistent across the entire codebase
- No confusion about naming conventions
- Works well with URL-based routing in Next.js
- Prevents case-sensitivity issues across operating systems

**Exceptions:**
- Config files keep conventional names (`package.json`, `tsconfig.json`)
- Next.js special files (`page.tsx`, `layout.tsx`, `route.ts`)

### 2. Import Strategy: Always Absolute

**Decision:** Always use absolute imports with `@/` alias. Never use relative imports.

**Rationale:**
- Easier refactoring (moving files doesn't break imports)
- Clearer context (know exactly where imports come from)
- Prevents deep relative path hell (`../../../../`)
- Easier to search codebase for usage

**Enforcement:** ESLint rule to block relative imports

### 3. UI Components: Always Shadcn

**Decision:** Always use Shadcn UI components instead of plain HTML elements.

**Rationale:**
- Consistent design system
- Built-in accessibility
- Dark theme support
- Responsive design
- TypeScript support
- Prevents duplicate styling code

**Critical Rule:** Never use `<button>`, `<input>`, `<select>` - always use `<Button>`, `<Input>`, `<Select>`

### 4. Dark Theme: Mandatory

**Decision:** All UI components must support dark theme.

**Approach:**
- Use semantic color tokens (`bg-background`, `text-foreground`)
- OR use explicit dark variants (`bg-white dark:bg-gray-900`)
- Never use standalone light colors without dark counterparts

**Rationale:**
- Modern UX expectation
- Reduces eye strain for users
- Professional appearance

### 5. Responsive Design: Mobile-First

**Decision:** All components must be responsive across all breakpoints.

**Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Rationale:**
- Mobile-first approach ensures mobile usability
- Desktop users get enhanced experience
- Professional expectation for modern apps

### 6. Project Structure: Flat Feature Modules

**Decision:** Use flat feature structure (not deeply nested)

```
features/domain/feature-name/
├── index.ts (barrel exports)
├── types.ts
├── feature-name-api.ts
├── store.ts
├── hooks/
└── components/
```

**Rationale:**
- Easy to navigate
- Clear file organization
- Scales well
- Consistent across features

### 7. State Management: Feature-Scoped Zustand

**Decision:** Each feature has its own Zustand store with custom hook wrappers.

**Rationale:**
- Encapsulation
- Clear ownership
- Easy testing
- No prop drilling

### 8. API Layer: Feature-Aligned Modules

**Decision:** Each feature has its own API module mirroring backend endpoints.

**Rationale:**
- Co-location with feature code
- Type-safe API calls
- Easy to find and maintain

### 9. Error Handling: Centralized with Typed Errors

**Decision:** Custom error classes with centralized handling.

**Rationale:**
- Consistent error responses
- Type-safe error handling
- Global error boundaries
- Better debugging

### 10. Testing: Minimal Approach

**Decision:** Only test critical paths and complex logic. No minimum coverage requirements.

**Rationale:**
- Focus on high-value tests
- Reduce maintenance burden
- Faster development
- Still catches critical bugs

### 11. TypeScript: Strict Mode

**Decision:** Strict TypeScript with no `any` types.

**Rationale:**
- Catch bugs at compile time
- Better IDE support
- Self-documenting code
- Prevents runtime errors

### 12. Automation: Enforce with Tooling

**Decision:** Use ESLint, Prettier, Husky for automated enforcement.

**Tools:**
- **ESLint:** File naming, import order, TypeScript rules
- **Prettier:** Code formatting
- **Husky:** Pre-commit hooks (auto-fix)
- **CI/CD:** Block merges on violations

**Rationale:**
- Removes human error
- Immediate feedback
- No code review debates about style
- Consistency guaranteed

---

## Implementation Artifacts

### 1. Documentation

**`.docs/technical/coding-guidelines.md`** - Comprehensive reference guide
- Complete coding standards
- Examples and anti-patterns
- Quick reference checklists

**`.docs/technical/automation-setup.md`** - Tooling configuration
- ESLint configuration
- Prettier setup
- Husky pre-commit hooks
- CI/CD pipeline

**`/Users/ajay-admin/sally/.claude/memory.md`** - AI memory integration
- Quick reference for AI assistants
- Critical rules summary
- Links to full guidelines

### 2. Configuration Files (To Be Created)

- `.eslintrc.json` (frontend and backend)
- `.prettierrc` (root)
- `.prettierignore` (root)
- `package.json` with lint-staged config
- `.vscode/settings.json`
- `.vscode/extensions.json`
- `.github/workflows/ci.yml`
- `.husky/pre-commit`

### 3. Migration Tasks (To Be Done)

1. Install all required packages
2. Create configuration files
3. Initialize Husky
4. Rename existing files to kebab-case
5. Update imports to absolute paths
6. Fix existing code to pass linters
7. Test automation setup

---

## Benefits

1. **Consistency:** All code looks like it was written by one person
2. **Quality:** Automated checks prevent common mistakes
3. **Speed:** Developers spend less time on style decisions
4. **Onboarding:** New developers have clear guidelines
5. **Maintenance:** Easier to understand and modify code
6. **Collaboration:** No debates about code style
7. **AI Integration:** AI assistants (like Claude) can reference guidelines

---

## Trade-offs

### What We're Gaining
- Strict consistency
- Automated enforcement
- Clear patterns
- Better maintainability

### What We're Accepting
- Initial migration effort (renaming files, updating imports)
- Learning curve for new patterns (Shadcn, Zustand)
- Some flexibility lost (strict rules)
- Tooling complexity (ESLint, Prettier, Husky)

### What We're NOT Doing
- Comprehensive documentation requirements (too time-consuming)
- High test coverage requirements (not pragmatic)
- Backend-specific patterns that differ from frontend (maintaining consistency)

---

## Success Criteria

✅ All files follow kebab-case naming
✅ All imports use absolute `@/` paths
✅ All UI uses Shadcn components
✅ All components support dark theme
✅ All components are responsive
✅ ESLint passes on all code
✅ Prettier formats all code consistently
✅ Pre-commit hooks auto-fix issues
✅ CI/CD blocks merges on violations
✅ New developers can reference guidelines easily

---

## Next Steps

1. **✅ DONE:** Create coding guidelines document
2. **✅ DONE:** Create automation setup document
3. **✅ DONE:** Update project memory file
4. **TODO:** Install required packages
5. **TODO:** Create configuration files
6. **TODO:** Initialize Husky hooks
7. **TODO:** Migrate existing code to new standards
8. **TODO:** Test automation setup
9. **TODO:** Document migration process

---

## Alternatives Considered

### Alternative 1: PascalCase for Components
- **Considered:** Using PascalCase for React components (e.g., `LoginForm.tsx`)
- **Rejected:** Chose consistency over React convention. Strict kebab-case is easier to enforce and remember.

### Alternative 2: Relative Imports Within Features
- **Considered:** Using relative imports within the same feature directory
- **Rejected:** Absolute imports are more refactorable and clearer. ESLint can enforce this automatically.

### Alternative 3: Comprehensive Testing
- **Considered:** 90%+ test coverage with comprehensive unit tests
- **Rejected:** Too time-consuming. Minimal testing focused on critical paths is more pragmatic.

### Alternative 4: Separate Frontend/Backend Guidelines
- **Considered:** Different conventions for frontend vs backend
- **Rejected:** Consistency across the stack is more valuable. Developers work on both.

---

## References

- **Full Guidelines:** `.docs/technical/coding-guidelines.md`
- **Automation Setup:** `.docs/technical/automation-setup.md`
- **Project Memory:** `/Users/ajay-admin/sally/.claude/memory.md`
- **Shadcn UI:** https://ui.shadcn.com/
- **ESLint:** https://eslint.org/
- **Prettier:** https://prettier.io/
- **Zustand:** https://zustand-demo.pmnd.rs/

---

**Approved By:** User
**Design Validated:** February 5, 2026
**Ready for Implementation:** Yes

# npm → pnpm Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the SALLY monorepo from npm to pnpm as the package manager, updating all config, CI/CD, Dockerfiles, scripts, and documentation.

**Architecture:** Replace npm workspaces with pnpm workspaces (pnpm-workspace.yaml), update .npmrc for pnpm compatibility, regenerate lockfile, and update all references across ~35 files.

**Tech Stack:** pnpm 9.x, Turborepo, Node.js 20+

---

## Task 1: Install pnpm and Create Workspace Config

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json` (root)
- Modify: `.npmrc`
- Delete: `package-lock.json` (already deleted)

**Step 1: Install pnpm globally (if not already installed)**

```bash
npm install -g pnpm@9
pnpm --version
```
Expected: pnpm 9.x.x

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Update root package.json**

Remove the `"workspaces"` field (pnpm uses pnpm-workspace.yaml instead).
Update `"packageManager"` and `"engines"`:

```json
{
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

Remove from root package.json:
- `"workspaces": ["apps/*", "packages/*"]`
- `"npm": ">=10.0.0"` from engines

Update scripts that reference `npm run` in sub-packages:
- `"backend:db:push": "cd apps/backend && pnpm run db:push"`
- `"backend:seed": "cd apps/backend && pnpm run db:seed"`
- `"backend:prisma:generate": "cd apps/backend && pnpm run prisma:generate"`
- `"backend:prisma:studio": "cd apps/backend && pnpm run prisma:studio"`

**Step 4: Update .npmrc for pnpm**

Replace contents with:
```ini
# Ensure React is properly deduplicated across workspaces
# This prevents multiple React instances during SSR
shamefully-hoist=true
strict-peer-dependencies=false
```

Note: `shamefully-hoist=true` is the pnpm equivalent of npm's flat node_modules — needed for Next.js and NestJS compatibility.

**Step 5: Remove old node_modules and install with pnpm**

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

Expected: Creates `pnpm-lock.yaml` and installs all dependencies.

**Step 6: Verify all apps build**

```bash
pnpm run build
```

Expected: All 3 apps (backend, web, docs) build successfully.

**Step 7: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc
git add -u  # stages deletions (package-lock.json, old node_modules markers)
git commit -m "chore: migrate from npm to pnpm as package manager"
```

---

## Task 2: Update CI/CD and Deployment Config

**Files:**
- Modify: `.github/workflows/deploy-docs.yml`
- Modify: `vercel.json`
- Modify: `.gitignore`

**Step 1: Update GitHub Actions workflow**

File: `.github/workflows/deploy-docs.yml`

Replace the build job steps:

```yaml
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build docs
        working-directory: apps/docs
        env:
          GITHUB_PAGES: 'true'
        run: pnpm run build
```

**Step 2: Update vercel.json**

```json
{
  "installCommand": "cd ../.. && npx pnpm install --frozen-lockfile",
  "buildCommand": "pnpm run sync-openapi && next build"
}
```

Note: Use `npx pnpm` on Vercel since pnpm may not be pre-installed. Alternatively, Vercel auto-detects pnpm from `packageManager` field — in which case just:

```json
{
  "buildCommand": "pnpm run sync-openapi && next build"
}
```

**Step 3: Update .gitignore**

Add `pnpm-debug.log*` next to existing `npm-debug.log*` line.

**Step 4: Commit**

```bash
git add .github/workflows/deploy-docs.yml vercel.json .gitignore
git commit -m "chore: update CI/CD and deployment config for pnpm"
```

---

## Task 3: Update Dockerfiles

**Files:**
- Modify: `apps/web/Dockerfile`
- Modify: `apps/backend/Dockerfile`
- Modify: `docker-compose.yml` (if npm references exist)

**Step 1: Update apps/web/Dockerfile**

Replace all `npm install` → `pnpm install` and `npm run` → `pnpm run`.
Add pnpm installation in each stage:

```dockerfile
# Development stage
FROM node:20-alpine AS development

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /workspace

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/web ./apps/web

WORKDIR /workspace/apps/web

EXPOSE 3000

CMD ["pnpm", "run", "dev"]

# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web

WORKDIR /workspace/apps/web
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "server.js"]
```

**Step 2: Update apps/backend/Dockerfile**

Replace npm commands with pnpm equivalents:

```dockerfile
# Dependencies stage
FROM node:20-alpine AS deps
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9 --activate

ARG CACHEBUST=1

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install --frozen-lockfile

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9 --activate

ARG DATABASE_URL

COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/backend/node_modules ./apps/backend/node_modules

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages ./packages
COPY apps/backend ./apps/backend

WORKDIR /workspace/apps/backend
RUN pnpm exec prisma generate
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache wget postgresql-client

COPY --from=builder /workspace/apps/backend/package.json ./
COPY --from=builder /workspace/apps/backend/dist ./dist
COPY --from=builder /workspace/apps/backend/prisma ./prisma
COPY --from=builder /workspace/apps/backend/prisma.config.ts ./prisma.config.ts
COPY --from=builder /workspace/apps/backend/scripts/apply-migration.sh ./apply-migration.sh

RUN chmod +x ./apply-migration.sh

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/apps/backend/node_modules ./node_modules_backend
RUN cp -rf /app/node_modules_backend/* /app/node_modules/ 2>/dev/null || true && \
    rm -rf /app/node_modules_backend

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8000/api/v1/health || exit 1

EXPOSE 8000

CMD sh -c "./apply-migration.sh && node dist/main"
```

**Step 3: Update docker-compose.yml**

Check for any `npm` references in commented or active commands and replace with `pnpm`.

**Step 4: Commit**

```bash
git add apps/web/Dockerfile apps/backend/Dockerfile docker-compose.yml
git commit -m "chore: update Dockerfiles for pnpm"
```

---

## Task 4: Update Install Script

**Files:**
- Modify: `scripts/install.sh`

**Step 1: Update install.sh**

Replace all `npm install` with `pnpm install`. Key changes:

- Step 1: `npm install --legacy-peer-deps` → `pnpm install`
- Step 3: `npm install --legacy-peer-deps` in apps/web → remove (pnpm installs everything from root)
- Also remove the `cd apps/web && npm install` step since pnpm workspace installs all from root

**Step 2: Commit**

```bash
git add scripts/install.sh
git commit -m "chore: update install script for pnpm"
```

---

## Task 5: Update apps/docs Build Script

**Files:**
- Modify: `apps/docs/package.json`

**Step 1: Update the build script**

Change:
```json
"build": "npm run sync-openapi && next build"
```
To:
```json
"build": "pnpm run sync-openapi && next build"
```

**Step 2: Commit**

```bash
git add apps/docs/package.json
git commit -m "chore: update docs build script for pnpm"
```

---

## Task 6: Update Root Documentation (README.md, CLAUDE.md)

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Step 1: Update README.md**

Replace all `npm` commands:
- `npm run docker:up` → `pnpm run docker:up`
- `npm install` → `pnpm install`
- `npm install --workspaces` → remove (pnpm does this automatically)
- `npm run dev` → `pnpm run dev`
- `npm run backend:dev` → `pnpm run backend:dev`
- `npm run frontend:dev` → `pnpm run frontend:dev`
- `npm run test` → `pnpm run test`
- `npm run test:e2e` → `pnpm run test:e2e`

In Prerequisites section, replace:
- Remove npm from prerequisites
- Add: `pnpm: npm install -g pnpm` or `corepack enable`

In "With Turborepo" section:
```bash
pnpm install               # Install all dependencies
pnpm run dev               # Run both backend and frontend
```

**Step 2: Update CLAUDE.md**

In the Technology Stack section, change:
- "npm workspaces" references → "pnpm workspaces"

In engines/prerequisites sections, update npm references to pnpm.

**Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update root documentation for pnpm migration"
```

---

## Task 7: Update apps/docs Developer Guide Pages

These are the highest-impact documentation files (the actual Nextra docs site).

**Files:**
- Modify: `apps/docs/pages/developer-guide/environment-setup.mdx` (~83 npm refs)
- Modify: `apps/docs/pages/developer-guide/common-tasks.mdx` (~44 npm refs)
- Modify: `apps/docs/pages/developer-guide/index.mdx`
- Modify: `apps/docs/pages/developer-guide/project-structure.mdx`
- Modify: `apps/docs/pages/developer-guide/backend/database-prisma.mdx`
- Modify: `apps/docs/pages/developer-guide/backend/testing.mdx`

**Step 1: Global replacements in each file**

For all files above, apply these replacements:
- `npm install` → `pnpm install`
- `npm ci` → `pnpm install --frozen-lockfile`
- `npm run` → `pnpm run`
- `npm test` → `pnpm test`
- `npx ` → `pnpm exec ` (for tool execution) or `pnpm dlx ` (for one-off packages)
- `npx prisma` → `pnpm exec prisma`
- `npx shadcn` → `pnpm dlx shadcn`
- References to "npm workspaces" → "pnpm workspaces"
- References to "package-lock.json" → "pnpm-lock.yaml"

**Step 2: Update environment-setup.mdx prerequisites**

Change the package manager prerequisite from npm to pnpm:
```
- **pnpm** - Fast, disk-efficient package manager (`npm install -g pnpm` or `corepack enable`)
```

**Step 3: Commit**

```bash
git add apps/docs/pages/developer-guide/
git commit -m "docs: update developer guide pages for pnpm"
```

---

## Task 8: Update apps/docs Architecture & API Pages

**Files:**
- Modify: `apps/docs/pages/architecture/index.mdx`
- Modify: `apps/docs/pages/architecture/adrs/001-monorepo-turborepo.mdx`
- Modify: `apps/docs/pages/architecture/adrs/006-shadcn-dark-theme.mdx`
- Modify: `apps/docs/pages/architecture/adrs/index.mdx`
- Modify: `apps/docs/pages/api-guides/alerts-monitoring/real-time-events.mdx`
- Modify: `apps/docs/pages/product/index.mdx`
- Modify: `apps/docs/pages/getting-started/quickstart.mdx` (if npm refs exist)
- Modify: `apps/docs/pages/contributing/code-standards.mdx` (if npm refs exist)

**Step 1: Apply same global replacements as Task 7**

Same rules: `npm install` → `pnpm install`, `npm run` → `pnpm run`, etc.

**Step 2: Special handling for ADR 001**

The ADR about choosing Turborepo + npm workspaces should be updated to reflect the migration:
- Update the decision to say "pnpm workspaces"
- Add a brief note: "Migrated from npm to pnpm in February 2026 for better monorepo dependency management"

**Step 3: Commit**

```bash
git add apps/docs/pages/architecture/ apps/docs/pages/api-guides/ apps/docs/pages/product/ apps/docs/pages/getting-started/ apps/docs/pages/contributing/
git commit -m "docs: update architecture and API guide pages for pnpm"
```

---

## Task 9: Update .docs/technical Documentation

**Files:**
- Modify: `.docs/technical/SETUP.md`
- Modify: `.docs/technical/DEPLOY.md`
- Modify: `.docs/technical/QUICK_REFERENCE.md`
- Modify: `.docs/technical/BACKEND_DEPLOYMENT.md`
- Modify: `.docs/technical/GOOGLE_MAPS_SETUP.md`
- Modify: `.docs/technical/CLEANUP_SUMMARY.md`
- Modify: `.docs/technical/DOCKER_OPTIMIZATIONS.md`
- Modify: `.docs/technical/OWNER_ROLE_TYPESCRIPT_FIX.md`
- Modify: `.docs/technical/INTEGRATIONS_PHASE2_PLAN.md`
- Modify: `.docs/technical/OPENAPI_FIX_CHECKLIST.md`
- Modify: `.docs/technical/automation-setup.md`
- Modify: `.docs/technical/testing/INTEGRATION_TESTING_SUMMARY.md`
- Modify: `.docs/technical/setup/QUICK_START.md`
- Modify: `.docs/technical/setup/QUICKSTART.md`
- Modify: `.docs/technical/setup/GOOGLE_MAPS_QUICKSTART.md`

**Step 1: Apply same global replacements across all files**

Same rules as Task 7.

**Step 2: Special attention to DOCKER_OPTIMIZATIONS.md**

This file has extensive npm Docker integration patterns. Update all Docker-related npm commands to pnpm equivalents, including the corepack setup pattern.

**Step 3: Commit**

```bash
git add .docs/technical/
git commit -m "docs: update technical documentation for pnpm"
```

---

## Task 10: Update App-Specific Docs and Final Cleanup

**Files:**
- Modify: `apps/backend/QUICK_START.md`
- Modify: `apps/backend/test/README.md`
- Modify: `apps/backend/package.json` (npx → pnpm exec in scripts)
- Delete: `apps/docs/.babelrc` (SWC bypass — test if still needed with pnpm)

**Step 1: Update apps/backend docs**

Replace npm commands in both files with pnpm equivalents.

**Step 2: Update apps/backend/package.json**

Change line 30: `"db:cleanup": "npx ts-node --transpile-only scripts/cleanup-for-testing.ts"` → `"db:cleanup": "pnpm exec ts-node --transpile-only scripts/cleanup-for-testing.ts"`

**Step 3: Remove .babelrc if SWC works with pnpm**

Test building docs without .babelrc:
```bash
cd apps/docs
rm -f .babelrc
pnpm run build
```

If build succeeds → delete .babelrc permanently.
If build fails → keep .babelrc and move on.

**Step 4: Final verification**

```bash
# From root
pnpm run build        # All apps build
pnpm run test         # All tests pass
pnpm run lint         # Linting passes
```

**Step 5: Commit**

```bash
git add apps/backend/ apps/docs/
git commit -m "docs: update app-specific docs and cleanup for pnpm migration"
```

---

## Task 11: Final Commit — Update DOCUMENTATION.md and Verify

**Files:**
- Modify: `DOCUMENTATION.md` (if npm references exist)
- Verify: No remaining npm references anywhere

**Step 1: Search for any remaining npm references**

```bash
grep -r "npm install\|npm run\|npm ci\|npm test\|npx " --include="*.md" --include="*.mdx" --include="*.yml" --include="*.yaml" --include="*.json" --include="*.sh" . | grep -v node_modules | grep -v .worktrees | grep -v pnpm
```

Fix any remaining references found.

**Step 2: Final commit**

```bash
git add -A
git commit -m "chore: complete npm to pnpm migration"
```

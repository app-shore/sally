# npm to pnpm Migration

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-10-npm-to-pnpm-migration.md`

---

## 1. Overview

The SALLY monorepo was migrated from npm to pnpm as the package manager. This migration replaced npm workspaces with pnpm workspaces, updated all configuration, CI/CD, Dockerfiles, and scripts.

---

## 2. Validation Against Code

### Confirmed Present

| File | Status | Evidence |
|------|--------|----------|
| `pnpm-workspace.yaml` | ✅ Present | Contains `packages: ["apps/*", "packages/*"]` |
| `pnpm-lock.yaml` | ✅ Present | 692KB lockfile |
| `package.json` `packageManager` field | ✅ Present | `"packageManager": "pnpm@9.15.0"` |
| `package.json` scripts use `pnpm` | ✅ Confirmed | `backend:db:push`, `backend:seed`, etc. all use `pnpm run` |
| `package.json` no `workspaces` field | ✅ Confirmed | Removed (pnpm uses pnpm-workspace.yaml instead) |

### Confirmed Removed

| Item | Status |
|------|--------|
| `package-lock.json` | ✅ Removed |
| `workspaces` field in root package.json | ✅ Removed |

---

## 3. What Changed

### Root Configuration
- Created `pnpm-workspace.yaml` defining `apps/*` and `packages/*` workspace paths
- Updated root `package.json`:
  - Added `"packageManager": "pnpm@9.15.0"`
  - Removed `"workspaces"` field
  - Updated scripts from `npm run` to `pnpm run`
  - Removed `"npm": ">=10.0.0"` from engines

### .npmrc
Updated for pnpm compatibility:
```ini
shamefully-hoist=true
strict-peer-dependencies=false
```

`shamefully-hoist=true` is the pnpm equivalent of npm's flat `node_modules` -- required for Next.js and NestJS compatibility.

### CI/CD
- GitHub Actions workflow updated to use `pnpm/action-setup@v4`
- Build commands changed from `npm run` to `pnpm run`
- Install commands changed from `npm install` to `pnpm install --frozen-lockfile`

### Dockerfiles
- Both `apps/web/Dockerfile` and `apps/backend/Dockerfile` updated
- Added `corepack enable && corepack prepare pnpm@9 --activate` in build stages
- Changed `npm install` to `pnpm install --frozen-lockfile`
- Changed `npm run build` to `pnpm run build`
- COPY statements include `pnpm-workspace.yaml` and `pnpm-lock.yaml`

### Documentation
- README.md updated: all `npm` references changed to `pnpm`
- CLAUDE.md references pnpm as package manager

---

## 4. Key Design Decisions

1. **pnpm 9.x** chosen for compatibility with Node.js 20+ and Turborepo
2. **shamefully-hoist=true** required for NestJS and Next.js compatibility (strict pnpm mode breaks some packages)
3. **strict-peer-dependencies=false** prevents build failures from mismatched peer deps
4. **corepack** used in Docker instead of global npm install for pnpm

---

## 5. Current State

pnpm is fully operational as the package manager. All workspace commands, builds, and CI/CD pipelines use pnpm.

**Verified commands:**
- `pnpm install` -- installs all workspace dependencies
- `pnpm run dev` -- runs turbo dev for all apps
- `pnpm run build` -- builds all apps via Turborepo
- `pnpm run backend:seed` -- seeds backend database

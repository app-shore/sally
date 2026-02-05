# External Developer Portal Cleanup

**Date:** February 5, 2026
**Status:** Approved
**Context:** Reorganize docs app to focus on external API integration, remove internal architecture content

## Problem Statement

The SALLY developer portal currently shows internal architecture documentation (system design, data flow, tech stack) alongside API reference. This content is more relevant for internal developers and creates confusion for external developers who just need API integration guidance.

## Goals

1. Focus public docs portal on external developer needs (API integration)
2. Remove internal architecture content from public portal
3. Maintain clean separation: external docs vs internal docs
4. Keep architecture docs accessible to internal team via `.docs/technical/`

## Design

### Navigation Structure Changes

**Remove:**
- `🏗️ Architecture` section (entire folder)
- Architecture quick link from homepage

**Keep:**
- `📘 Getting Started` - Quickstart, understanding HOS basics
- `📖 Guides` - Integration guides, best practices
- `📡 API Reference` - All API endpoints
- `📝 Blog` - Product updates, introducing SALLY
- `🔧 Resources` - Support, FAQ, changelog

### Homepage Updates

**Remove:**
- Architecture quick link card (lines 120-128 in `index.mdx`)

**Keep:**
- Hero section with CTAs
- Core Features grid
- Quick Links: Quickstart, API Reference, Guides

### Architecture Content Migration

**Files to remove from docs app:**
- `apps/docs/pages/architecture/` (entire directory)
  - `_meta.ts`
  - `index.mdx`
  - `overview.mdx`
  - `system-design.mdx`
  - `data-flow.mdx`
  - `tech-stack.mdx`

**Where content is preserved:**
- `.docs/technical/architecture/` - C4 diagrams, system design
- `.docs/technical/QUICK_REFERENCE.md` - Tech stack overview
- `.docs/specs/blueprint.md` - Product architecture

**Internal dev access:**
- Repository `.docs/technical/` directory
- `DOCUMENTATION.md` index file
- Optional future: GitHub Pages for internal docs

## Implementation Steps

1. **Update navigation** (`apps/docs/pages/_meta.ts`)
   - Remove "architecture" section entry

2. **Update homepage** (`apps/docs/pages/index.mdx`)
   - Remove Architecture quick link card (lines 120-128)

3. **Delete architecture directory**
   - Remove `apps/docs/pages/architecture/` and all contents

4. **Update cross-references**
   - Search for links to `/architecture` pages
   - Update or remove broken links

5. **Test portal**
   - Verify navigation works
   - Check all links functional
   - Confirm clean build

## Rationale

**Industry standard practice:**
- Most companies separate public API docs from internal architecture docs
- External developers don't need internal system design details
- Simpler maintenance with separate documentation systems
- No auth complexity for public docs

**Benefits:**
- Clearer focus for external developers
- Reduced confusion about what's relevant
- Easier to maintain (single audience per docs system)
- Architecture docs still accessible to internal team

## Success Criteria

- [ ] Public portal shows only API integration content
- [ ] No broken links in remaining docs
- [ ] Clean build with no errors
- [ ] Internal architecture docs remain in `.docs/technical/`
- [ ] Navigation is clear and focused

## Notes

- No content is deleted permanently - architecture docs remain in `.docs/technical/`
- Future option: Set up separate internal docs portal if needed
- This aligns with standard industry practices (Stripe, Twilio, etc.)

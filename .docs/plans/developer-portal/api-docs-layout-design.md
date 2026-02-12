# Three-Column API Documentation Layout Design

> **Status:** 🔲 Designed, not yet built | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-05-api-docs-three-column-layout.md`

---

## 1. Overview

This plan proposed a Stripe-style 3-column API documentation layout that auto-generates content from the OpenAPI JSON spec. It was designed as a replacement for the Scalar-based API playground approach.

**Current status:** This design was NOT implemented. The portal uses Scalar (`ScalarApiReference.tsx` component) for the API playground instead of a custom 3-column layout.

---

## 2. Proposed Architecture

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Endpoint Navigation  │  Documentation Panel  │  Code Panel  │
│  (Left, 240px)        │  (Center, flex-grow)   │  (Right, 400px)│
│                       │                        │               │
│  Category: Routes     │  POST /routes/plan     │  curl example │
│  - Plan Route         │                        │  Node.js      │
│  - Update Route       │  Description           │  Python       │
│  - Get Route          │  Parameters            │               │
│                       │  Request Body          │  Response     │
│  Category: Alerts     │  Responses             │  example      │
│  - List Alerts        │                        │               │
│  - Acknowledge        │                        │               │
└──────────────────────────────────────────────────────────────┘
```

### Components (Designed)

| Component | Purpose | Status |
|-----------|---------|--------|
| `lib/openapi-parser.ts` | Parse OpenAPI JSON into structured endpoints | Not built |
| `lib/types/openapi.ts` | TypeScript types for parsed OpenAPI | Not built |
| `components/ApiNav.tsx` | Left panel: endpoint navigation grouped by category | Not built |
| `components/ApiDoc.tsx` | Center panel: endpoint documentation | Not built |
| `components/ApiDoc/ParameterTable.tsx` | Parameter table with type info | Not built |
| `components/ApiDoc/ResponseTable.tsx` | Response table with status codes | Not built |
| `components/ApiDoc/SchemaRenderer.tsx` | JSON schema tree renderer | Not built |
| `components/CodeExample.tsx` | Right panel: code examples in multiple languages | Not built |

### Key Design Decisions

1. **Auto-generated from OpenAPI** -- single `openapi.json` file drives all content
2. **Single dynamic page** -- `pages/api-reference/endpoint/[id].tsx` handles all endpoints
3. **Clean dark theme integration** -- designed to work with Nextra's theme system
4. **Method badges** -- GET (blue), POST (green), PUT (yellow), DELETE (red) with dark mode variants

---

## 3. OpenAPI Parser Design

```typescript
export interface ParsedEndpoint {
  id: string;          // Unique ID for routing
  name: string;        // Display name
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;        // API path
  summary: string;
  description: string;
  category: string;    // Group name (from OpenAPI tags)
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  tags: string[];
}

export interface ParsedOpenAPI {
  endpoints: ParsedEndpoint[];
  categories: string[];
  baseUrl: string;
  version: string;
  title: string;
}
```

Functions:
- `parseOpenAPI(jsonPath)` -- parses the spec into structured data
- `groupEndpointsByCategory(endpoints)` -- groups by tag for navigation

---

## 4. Why It Was Not Implemented

The Scalar API playground (`ScalarApiReference.tsx`) provides similar functionality:
- Interactive request builder
- OpenAPI 3.0 support
- Dark mode support
- Code generation

The custom 3-column approach offered more design control but required significant development effort. Scalar was likely chosen as a pragmatic alternative that provides the core API documentation experience out of the box.

---

## 5. Future Consideration

If the Scalar approach has limitations (dark theme conflicts were noted in the rebuild plan), this design could be revisited. The OpenAPI parser and component architecture are well-specified and ready for implementation.

Key advantages of the custom approach:
- Full control over dark theme integration
- Better integration with Nextra navigation
- Custom code example generation
- No external dependency on Scalar

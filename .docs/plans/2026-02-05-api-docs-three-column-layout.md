# Custom 3-Column API Documentation Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Stripe-style 3-column API documentation layout with auto-generated content from OpenAPI JSON.

**Architecture:** Parse `/openapi.json` to auto-generate endpoint navigation (left), documentation (center), and interactive code examples (right). Replace Scalar-based approach with custom React components that integrate seamlessly with Nextra's dark theme.

**Tech Stack:** Next.js 15, React, TypeScript, Nextra, OpenAPI 3.0, Tailwind CSS, Shadcn UI

---

## Overview

Current problem:
- Scalar API Explorer has dark theme conflicts
- Hidden in tabs, not discoverable
- Not scalable (manual .mdx files for each endpoint)

New approach:
- Auto-generate endpoint list from OpenAPI JSON
- 3-column layout: Endpoints (left) | Docs (center) | Code (right)
- Clean integration with Nextra dark theme
- Single dynamic page handles all endpoints

---

## Task 1: Create OpenAPI Parser Utility

**Files:**
- Create: `apps/docs/lib/openapi-parser.ts`
- Create: `apps/docs/lib/types/openapi.ts`

**Step 1: Create TypeScript types for parsed OpenAPI**

File: `apps/docs/lib/types/openapi.ts`

```typescript
export interface ParsedEndpoint {
  id: string // Unique ID for routing
  name: string // Display name (e.g., "Plan Route")
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string // API path (e.g., "/api/v1/routes/plan")
  summary: string
  description: string
  category: string // Group name (e.g., "Routes", "Alerts")
  parameters: Parameter[]
  requestBody?: RequestBody
  responses: Record<string, Response>
  tags: string[]
}

export interface Parameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  description: string
  required: boolean
  schema: Schema
}

export interface RequestBody {
  description: string
  required: boolean
  content: Record<string, { schema: Schema }>
}

export interface Response {
  description: string
  content?: Record<string, { schema: Schema }>
}

export interface Schema {
  type: string
  properties?: Record<string, Schema>
  items?: Schema
  required?: string[]
  example?: any
  description?: string
}

export interface ParsedOpenAPI {
  endpoints: ParsedEndpoint[]
  categories: string[]
  baseUrl: string
  version: string
  title: string
}
```

Expected: Types compile without errors

**Step 2: Write OpenAPI parser function**

File: `apps/docs/lib/openapi-parser.ts`

```typescript
import type { ParsedOpenAPI, ParsedEndpoint } from './types/openapi'

export async function parseOpenAPI(jsonPath: string = '/openapi.json'): Promise<ParsedOpenAPI> {
  const response = await fetch(jsonPath)
  const spec = await response.json()

  const endpoints: ParsedEndpoint[] = []
  const categoriesSet = new Set<string>()

  // Parse each path
  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem as any)) {
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue

      const category = operation.tags?.[0] || 'Other'
      categoriesSet.add(category)

      const endpoint: ParsedEndpoint = {
        id: `${method}-${path}`.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase() as any,
        path,
        summary: operation.summary || '',
        description: operation.description || '',
        category,
        parameters: operation.parameters || [],
        requestBody: operation.requestBody,
        responses: operation.responses || {},
        tags: operation.tags || []
      }

      endpoints.push(endpoint)
    }
  }

  return {
    endpoints,
    categories: Array.from(categoriesSet).sort(),
    baseUrl: spec.servers?.[0]?.url || '',
    version: spec.info?.version || '',
    title: spec.info?.title || 'API Reference'
  }
}

export function groupEndpointsByCategory(endpoints: ParsedEndpoint[]): Record<string, ParsedEndpoint[]> {
  return endpoints.reduce((acc, endpoint) => {
    if (!acc[endpoint.category]) {
      acc[endpoint.category] = []
    }
    acc[endpoint.category].push(endpoint)
    return acc
  }, {} as Record<string, ParsedEndpoint[]>)
}
```

**Step 3: Test parser with actual OpenAPI file**

Run: `cd apps/docs && npx tsx -e "import { parseOpenAPI } from './lib/openapi-parser'; parseOpenAPI('public/openapi.json').then(r => console.log('Parsed:', r.endpoints.length, 'endpoints'))"`

Expected: Output shows number of parsed endpoints (should be 20+)

**Step 4: Commit**

```bash
git add apps/docs/lib/openapi-parser.ts apps/docs/lib/types/openapi.ts
git commit -m "feat(docs): add OpenAPI parser utility

Parse OpenAPI JSON to extract endpoints, categories, parameters, and schemas.
Foundation for auto-generated API documentation.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create API Endpoint Navigation Component

**Files:**
- Create: `apps/docs/components/ApiNav.tsx`

**Step 1: Create endpoint navigation component**

File: `apps/docs/components/ApiNav.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { parseOpenAPI, groupEndpointsByCategory } from '@/lib/openapi-parser'
import type { ParsedEndpoint } from '@/lib/types/openapi'

interface ApiNavProps {
  activeEndpointId?: string
}

export function ApiNav({ activeEndpointId }: ApiNavProps) {
  const [grouped, setGrouped] = useState<Record<string, ParsedEndpoint[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    parseOpenAPI('/openapi.json')
      .then(result => {
        setGrouped(groupEndpointsByCategory(result.endpoints))
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to parse OpenAPI:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading endpoints...</div>
  }

  return (
    <nav className="space-y-4">
      {Object.entries(grouped).map(([category, endpoints]) => (
        <div key={category}>
          <h3 className="mb-2 px-2 text-sm font-semibold text-foreground">
            {category}
          </h3>
          <ul className="space-y-1">
            {endpoints.map(endpoint => (
              <li key={endpoint.id}>
                <Link
                  href={`/api-reference/endpoint/${endpoint.id}`}
                  className={`
                    block rounded-md px-2 py-1.5 text-sm transition-colors
                    ${activeEndpointId === endpoint.id
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }
                  `}
                >
                  <span className={`
                    mr-2 inline-block w-12 text-xs font-mono
                    ${endpoint.method === 'GET' && 'text-blue-600 dark:text-blue-400'}
                    ${endpoint.method === 'POST' && 'text-green-600 dark:text-green-400'}
                    ${endpoint.method === 'PUT' && 'text-yellow-600 dark:text-yellow-400'}
                    ${endpoint.method === 'DELETE' && 'text-red-600 dark:text-red-400'}
                  `}>
                    {endpoint.method}
                  </span>
                  {endpoint.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
```

**Step 2: Test component renders**

Create test file: `apps/docs/pages/test-api-nav.tsx`

```tsx
import { ApiNav } from '@/components/ApiNav'

export default function TestApiNav() {
  return (
    <div className="p-8">
      <ApiNav />
    </div>
  )
}
```

Run: `npm run dev` and visit `http://localhost:3001/test-api-nav`

Expected: See endpoint list grouped by category (Routes, Alerts, etc.)

**Step 3: Commit**

```bash
git add apps/docs/components/ApiNav.tsx
git commit -m "feat(docs): add API endpoint navigation component

Auto-generates endpoint list from OpenAPI JSON grouped by category.
Displays method badges (GET, POST, etc.) with semantic colors.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create API Documentation Component

**Files:**
- Create: `apps/docs/components/ApiDoc.tsx`
- Create: `apps/docs/components/ApiDoc/ParameterTable.tsx`
- Create: `apps/docs/components/ApiDoc/ResponseTable.tsx`
- Create: `apps/docs/components/ApiDoc/SchemaRenderer.tsx`

**Step 1: Create ParameterTable component**

File: `apps/docs/components/ApiDoc/ParameterTable.tsx`

```typescript
import type { Parameter } from '@/lib/types/openapi'

interface ParameterTableProps {
  parameters: Parameter[]
}

export function ParameterTable({ parameters }: ParameterTableProps) {
  if (!parameters || parameters.length === 0) {
    return <p className="text-sm text-muted-foreground">No parameters</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 text-left font-medium text-foreground">Name</th>
            <th className="pb-2 text-left font-medium text-foreground">Type</th>
            <th className="pb-2 text-left font-medium text-foreground">In</th>
            <th className="pb-2 text-left font-medium text-foreground">Required</th>
            <th className="pb-2 text-left font-medium text-foreground">Description</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param, idx) => (
            <tr key={idx} className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">{param.name}</td>
              <td className="py-2 font-mono text-xs text-muted-foreground">
                {param.schema?.type || 'any'}
              </td>
              <td className="py-2 text-xs text-muted-foreground">{param.in}</td>
              <td className="py-2 text-xs">
                {param.required ? (
                  <span className="text-red-600 dark:text-red-400">Yes</span>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )}
              </td>
              <td className="py-2 text-xs text-muted-foreground">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 2: Create SchemaRenderer component**

File: `apps/docs/components/ApiDoc/SchemaRenderer.tsx`

```typescript
import type { Schema } from '@/lib/types/openapi'

interface SchemaRendererProps {
  schema: Schema
  level?: number
}

export function SchemaRenderer({ schema, level = 0 }: SchemaRendererProps) {
  const indent = '  '.repeat(level)

  if (schema.type === 'object' && schema.properties) {
    return (
      <div className="font-mono text-xs">
        {Object.entries(schema.properties).map(([key, propSchema]) => (
          <div key={key} className="py-1">
            <span className="text-muted-foreground">{indent}</span>
            <span className="text-blue-600 dark:text-blue-400">{key}</span>
            <span className="text-muted-foreground">: </span>
            <span className="text-green-600 dark:text-green-400">{propSchema.type}</span>
            {schema.required?.includes(key) && (
              <span className="ml-2 text-xs text-red-600 dark:text-red-400">(required)</span>
            )}
            {propSchema.description && (
              <span className="ml-2 text-muted-foreground">// {propSchema.description}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (schema.type === 'array' && schema.items) {
    return (
      <div className="font-mono text-xs text-muted-foreground">
        Array of {schema.items.type}
      </div>
    )
  }

  return (
    <div className="font-mono text-xs text-green-600 dark:text-green-400">
      {schema.type}
    </div>
  )
}
```

**Step 3: Create main ApiDoc component**

File: `apps/docs/components/ApiDoc.tsx`

```typescript
'use client'

import { Badge } from '@/components/ui/badge'
import { ParameterTable } from './ApiDoc/ParameterTable'
import { SchemaRenderer } from './ApiDoc/SchemaRenderer'
import type { ParsedEndpoint } from '@/lib/types/openapi'

interface ApiDocProps {
  endpoint: ParsedEndpoint
}

export function ApiDoc({ endpoint }: ApiDocProps) {
  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'POST': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'PUT': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'DELETE': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const requestBodySchema = endpoint.requestBody?.content?.['application/json']?.schema
  const successResponse = endpoint.responses['200'] || endpoint.responses['201']
  const responseSchema = successResponse?.content?.['application/json']?.schema

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge className={getMethodColor(endpoint.method)}>
            {endpoint.method}
          </Badge>
          <code className="text-sm font-mono text-foreground">{endpoint.path}</code>
        </div>
        <h1 className="mb-4 text-3xl font-bold text-foreground">{endpoint.name}</h1>
        <p className="text-base text-muted-foreground">{endpoint.description}</p>
      </div>

      {/* Parameters */}
      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Parameters</h2>
          <ParameterTable parameters={endpoint.parameters} />
        </div>
      )}

      {/* Request Body */}
      {requestBodySchema && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Request Body</h2>
          {endpoint.requestBody?.description && (
            <p className="mb-4 text-sm text-muted-foreground">
              {endpoint.requestBody.description}
            </p>
          )}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <SchemaRenderer schema={requestBodySchema} />
          </div>
        </div>
      )}

      {/* Response */}
      {responseSchema && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Response</h2>
          {successResponse?.description && (
            <p className="mb-4 text-sm text-muted-foreground">
              {successResponse.description}
            </p>
          )}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <SchemaRenderer schema={responseSchema} />
          </div>
        </div>
      )}

      {/* Error Responses */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-foreground">Error Codes</h2>
        <div className="space-y-2">
          {Object.entries(endpoint.responses)
            .filter(([code]) => code !== '200' && code !== '201')
            .map(([code, response]) => (
              <div key={code} className="flex gap-4 rounded-md border border-border p-3">
                <code className="font-mono text-sm font-semibold text-foreground">{code}</code>
                <span className="text-sm text-muted-foreground">{response.description}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Test documentation component**

Update `apps/docs/pages/test-api-nav.tsx`:

```tsx
import { ApiNav } from '@/components/ApiNav'
import { ApiDoc } from '@/components/ApiDoc'
import { parseOpenAPI } from '@/lib/openapi-parser'
import { useEffect, useState } from 'react'

export default function TestApiDoc() {
  const [endpoint, setEndpoint] = useState(null)

  useEffect(() => {
    parseOpenAPI('/openapi.json').then(result => {
      setEndpoint(result.endpoints[0]) // Test with first endpoint
    })
  }, [])

  if (!endpoint) return <div>Loading...</div>

  return (
    <div className="grid grid-cols-[280px_1fr] gap-8 p-8">
      <ApiNav />
      <ApiDoc endpoint={endpoint} />
    </div>
  )
}
```

Run: Visit `http://localhost:3001/test-api-nav`

Expected: See endpoint navigation on left, documentation on right

**Step 5: Commit**

```bash
git add apps/docs/components/ApiDoc.tsx apps/docs/components/ApiDoc/
git commit -m "feat(docs): add API documentation component

Auto-renders endpoint documentation from OpenAPI schema:
- Parameter tables with types and descriptions
- Request/response body schemas
- Error code reference
- Dark theme support with semantic tokens

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create Code Examples Panel Component

**Files:**
- Create: `apps/docs/components/ApiCodePanel.tsx`
- Create: `apps/docs/lib/code-generator.ts`

**Step 1: Create code generator utility**

File: `apps/docs/lib/code-generator.ts`

```typescript
import type { ParsedEndpoint } from './types/openapi'

export function generateCurlExample(endpoint: ParsedEndpoint, baseUrl: string): string {
  const url = `${baseUrl}${endpoint.path.replace(/\{([^}]+)\}/g, (_, name) => `{${name}}`)}`

  let curl = `curl -X ${endpoint.method} '${url}' \\\n`
  curl += `  -H 'Authorization: Bearer $SALLY_API_KEY' \\\n`
  curl += `  -H 'Content-Type: application/json'`

  if (endpoint.requestBody && endpoint.method !== 'GET') {
    const example = endpoint.requestBody.content?.['application/json']?.schema?.example
    if (example) {
      curl += ` \\\n  -d '${JSON.stringify(example, null, 2).replace(/\n/g, '\n  ')}'`
    }
  }

  return curl
}

export function generateJavaScriptExample(endpoint: ParsedEndpoint, baseUrl: string): string {
  const url = `${baseUrl}${endpoint.path.replace(/\{([^}]+)\}/g, (_, name) => `\${${name}}`)}`

  let code = `const response = await fetch('${url}', {\n`
  code += `  method: '${endpoint.method}',\n`
  code += `  headers: {\n`
  code += `    'Authorization': \`Bearer \${process.env.SALLY_API_KEY}\`,\n`
  code += `    'Content-Type': 'application/json'\n`
  code += `  }`

  if (endpoint.requestBody && endpoint.method !== 'GET') {
    const example = endpoint.requestBody.content?.['application/json']?.schema?.example
    if (example) {
      code += `,\n  body: JSON.stringify(${JSON.stringify(example, null, 2).replace(/\n/g, '\n    ')})`
    }
  }

  code += `\n})\n\nconst data = await response.json()\nconsole.log(data)`

  return code
}

export function generatePythonExample(endpoint: ParsedEndpoint, baseUrl: string): string {
  const url = `${baseUrl}${endpoint.path.replace(/\{([^}]+)\}/g, (_, name) => `{${name}}`)}`

  let code = `import requests\nimport os\n\n`
  code += `url = "${url}"\n`
  code += `headers = {\n`
  code += `    "Authorization": f"Bearer {os.environ['SALLY_API_KEY']}",\n`
  code += `    "Content-Type": "application/json"\n`
  code += `}\n`

  if (endpoint.requestBody && endpoint.method !== 'GET') {
    const example = endpoint.requestBody.content?.['application/json']?.schema?.example
    if (example) {
      code += `\ndata = ${JSON.stringify(example, null, 2).replace(/\n/g, '\n    ')}\n`
      code += `\nresponse = requests.${endpoint.method.toLowerCase()}(url, headers=headers, json=data)`
    } else {
      code += `\nresponse = requests.${endpoint.method.toLowerCase()}(url, headers=headers)`
    }
  } else {
    code += `\nresponse = requests.${endpoint.method.toLowerCase()}(url, headers=headers)`
  }

  code += `\nprint(response.json())`

  return code
}
```

**Step 2: Create code panel component**

File: `apps/docs/components/ApiCodePanel.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { generateCurlExample, generateJavaScriptExample, generatePythonExample } from '@/lib/code-generator'
import type { ParsedEndpoint } from '@/lib/types/openapi'

interface ApiCodePanelProps {
  endpoint: ParsedEndpoint
  baseUrl: string
}

export function ApiCodePanel({ endpoint, baseUrl }: ApiCodePanelProps) {
  const [language, setLanguage] = useState<'curl' | 'javascript' | 'python'>('curl')
  const [copied, setCopied] = useState(false)

  const code = {
    curl: generateCurlExample(endpoint, baseUrl),
    javascript: generateJavaScriptExample(endpoint, baseUrl),
    python: generatePythonExample(endpoint, baseUrl)
  }[language]

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="sticky top-4 space-y-4">
      {/* Language Tabs */}
      <Tabs value={language} onValueChange={(v) => setLanguage(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="curl" className="flex-1">cURL</TabsTrigger>
          <TabsTrigger value="javascript" className="flex-1">JavaScript</TabsTrigger>
          <TabsTrigger value="python" className="flex-1">Python</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Code Block */}
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-xs font-mono">
          <code className="text-foreground">{code}</code>
        </pre>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="absolute right-2 top-2"
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      {/* Response Preview */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Expected Response</h3>
        <div className="rounded-lg border border-border bg-muted p-4">
          <pre className="overflow-x-auto text-xs font-mono text-muted-foreground">
            <code>
              {JSON.stringify(
                endpoint.responses['200']?.content?.['application/json']?.schema?.example ||
                { status: 'success', message: 'Response data' },
                null,
                2
              )}
            </code>
          </pre>
        </div>
      </div>

      {/* Try It Button (Future Enhancement) */}
      <Button className="w-full" variant="default" disabled>
        Try it (Coming Soon)
      </Button>
    </div>
  )
}
```

**Step 3: Install missing Shadcn components**

Run: `cd apps/docs && npx shadcn@latest add tabs`

Expected: Tabs component installed

**Step 4: Commit**

```bash
git add apps/docs/components/ApiCodePanel.tsx apps/docs/lib/code-generator.ts
git commit -m "feat(docs): add code examples panel component

Auto-generates code examples in cURL, JavaScript, and Python.
Includes copy button and expected response preview.
Sticky positioning for right panel.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create Dynamic API Reference Page

**Files:**
- Create: `apps/docs/pages/api-reference/endpoint/[id].tsx`
- Modify: `apps/docs/pages/api-reference/overview.mdx`

**Step 1: Create dynamic endpoint page**

File: `apps/docs/pages/api-reference/endpoint/[id].tsx`

```typescript
import { GetStaticPaths, GetStaticProps } from 'next'
import { parseOpenAPI } from '@/lib/openapi-parser'
import { ApiNav } from '@/components/ApiNav'
import { ApiDoc } from '@/components/ApiDoc'
import { ApiCodePanel } from '@/components/ApiCodePanel'
import type { ParsedEndpoint } from '@/lib/types/openapi'

interface EndpointPageProps {
  endpoint: ParsedEndpoint
  baseUrl: string
}

export default function EndpointPage({ endpoint, baseUrl }: EndpointPageProps) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr_400px]">
      {/* Left: Endpoint Navigation */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <ApiNav activeEndpointId={endpoint.id} />
        </div>
      </aside>

      {/* Center: Documentation */}
      <main className="min-w-0">
        <ApiDoc endpoint={endpoint} />
      </main>

      {/* Right: Code Examples */}
      <aside className="hidden xl:block">
        <ApiCodePanel endpoint={endpoint} baseUrl={baseUrl} />
      </aside>
    </div>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const result = await parseOpenAPI('public/openapi.json')

  const paths = result.endpoints.map(endpoint => ({
    params: { id: endpoint.id }
  }))

  return { paths, fallback: false }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const result = await parseOpenAPI('public/openapi.json')
  const endpoint = result.endpoints.find(e => e.id === params?.id)

  if (!endpoint) {
    return { notFound: true }
  }

  return {
    props: {
      endpoint,
      baseUrl: result.baseUrl
    }
  }
}
```

**Step 2: Update API reference overview to link to endpoints**

File: `apps/docs/pages/api-reference/overview.mdx` (update at end)

```mdx
## Explore Endpoints

<EndpointLinks />
```

Create: `apps/docs/components/EndpointLinks.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { parseOpenAPI, groupEndpointsByCategory } from '@/lib/openapi-parser'
import type { ParsedEndpoint } from '@/lib/types/openapi'

export function EndpointLinks() {
  const [grouped, setGrouped] = useState<Record<string, ParsedEndpoint[]>>({})

  useEffect(() => {
    parseOpenAPI('/openapi.json').then(result => {
      setGrouped(groupEndpointsByCategory(result.endpoints))
    })
  }, [])

  return (
    <div className="not-prose grid gap-6 md:grid-cols-2">
      {Object.entries(grouped).map(([category, endpoints]) => (
        <div key={category} className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-lg font-semibold text-foreground">{category}</h3>
          <ul className="space-y-2">
            {endpoints.map(endpoint => (
              <li key={endpoint.id}>
                <Link
                  href={`/api-reference/endpoint/${endpoint.id}`}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {endpoint.method} {endpoint.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Test the dynamic page**

Run: `npm run dev`

Visit: `http://localhost:3001/api-reference/endpoint/post-api-v1-routes-plan`

Expected: See 3-column layout with navigation, docs, and code examples

**Step 4: Commit**

```bash
git add apps/docs/pages/api-reference/endpoint/ apps/docs/components/EndpointLinks.tsx apps/docs/pages/api-reference/overview.mdx
git commit -m "feat(docs): create dynamic API endpoint pages

3-column layout with auto-generated content:
- Left: Endpoint navigation (280px)
- Center: Documentation (flexible)
- Right: Code examples (400px)

Static generation from OpenAPI JSON at build time.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Remove Old Scalar-Based Pages

**Files:**
- Delete: `apps/docs/pages/api-reference/routes/*.mdx`
- Delete: `apps/docs/pages/api-reference/alerts/*.mdx`
- Delete: `apps/docs/pages/api-reference/hos/*.mdx`
- Delete: `apps/docs/pages/api-reference/optimization/*.mdx`
- Delete: `apps/docs/pages/api-reference/webhooks/*.mdx`
- Delete: `apps/docs/components/ApiReference.tsx`
- Modify: `apps/docs/pages/api-reference/_meta.ts`

**Step 1: Remove old resource directories**

Run:
```bash
cd apps/docs/pages/api-reference
rm -rf routes alerts hos optimization webhooks
```

Expected: Directories removed

**Step 2: Update API reference navigation**

File: `apps/docs/pages/api-reference/_meta.ts`

```typescript
export default {
  overview: 'Overview',
  authentication: 'Authentication',
  'external-mock': 'External Mock APIs'
}
```

**Step 3: Remove Scalar component**

Run: `rm apps/docs/components/ApiReference.tsx`

Expected: File removed

**Step 4: Update overview page**

File: `apps/docs/pages/api-reference/overview.mdx` (remove Scalar import at top)

Remove line:
```mdx
import { ApiReference } from '@/components/ApiReference'
```

**Step 5: Test build**

Run: `npm run build`

Expected: Build succeeds, static pages generated for all endpoints

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(docs): remove Scalar-based API reference pages

Replace with auto-generated dynamic pages from OpenAPI JSON.
Remove manual .mdx files for each endpoint.
Remove Scalar component and dependencies.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Mobile-Responsive Navigation

**Files:**
- Modify: `apps/docs/pages/api-reference/endpoint/[id].tsx`
- Create: `apps/docs/components/MobileApiNav.tsx`

**Step 1: Create mobile navigation drawer**

File: `apps/docs/components/MobileApiNav.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ApiNav } from './ApiNav'

interface MobileApiNavProps {
  activeEndpointId?: string
}

export function MobileApiNav({ activeEndpointId }: MobileApiNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden mb-4">
          Browse Endpoints
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px]">
        <div className="mt-4">
          <ApiNav activeEndpointId={activeEndpointId} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 2: Install Sheet component**

Run: `npx shadcn@latest add sheet`

Expected: Sheet component installed

**Step 3: Add mobile nav to endpoint page**

File: `apps/docs/pages/api-reference/endpoint/[id].tsx` (update)

```typescript
import { MobileApiNav } from '@/components/MobileApiNav'

export default function EndpointPage({ endpoint, baseUrl }: EndpointPageProps) {
  return (
    <div>
      {/* Mobile Navigation */}
      <MobileApiNav activeEndpointId={endpoint.id} />

      {/* Desktop 3-Column Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr_400px]">
        {/* ... rest of layout ... */}
      </div>
    </div>
  )
}
```

**Step 4: Test mobile view**

Run: `npm run dev`

Resize browser to mobile width (<768px)

Expected: See "Browse Endpoints" button, clicking opens drawer with navigation

**Step 5: Commit**

```bash
git add apps/docs/components/MobileApiNav.tsx apps/docs/pages/api-reference/endpoint/[id].tsx
git commit -m "feat(docs): add mobile-responsive API navigation

Sheet drawer for endpoint navigation on mobile/tablet.
3-column layout collapses on small screens.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Search and Filtering

**Files:**
- Create: `apps/docs/components/ApiSearch.tsx`
- Modify: `apps/docs/components/ApiNav.tsx`

**Step 1: Create search component**

File: `apps/docs/components/ApiSearch.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface ApiSearchProps {
  onSearch: (query: string) => void
}

export function ApiSearch({ onSearch }: ApiSearchProps) {
  const [query, setQuery] = useState('')

  const handleChange = (value: string) => {
    setQuery(value)
    onSearch(value.toLowerCase())
  }

  return (
    <div className="mb-4">
      <Input
        type="search"
        placeholder="Search endpoints..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full"
      />
    </div>
  )
}
```

**Step 2: Add search to ApiNav component**

File: `apps/docs/components/ApiNav.tsx` (update)

```typescript
import { ApiSearch } from './ApiSearch'

export function ApiNav({ activeEndpointId }: ApiNavProps) {
  const [grouped, setGrouped] = useState<Record<string, ParsedEndpoint[]>>({})
  const [filtered, setFiltered] = useState<Record<string, ParsedEndpoint[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    parseOpenAPI('/openapi.json')
      .then(result => {
        const g = groupEndpointsByCategory(result.endpoints)
        setGrouped(g)
        setFiltered(g)
        setLoading(false)
      })
  }, [])

  const handleSearch = (query: string) => {
    if (!query) {
      setFiltered(grouped)
      return
    }

    const filtered: Record<string, ParsedEndpoint[]> = {}

    Object.entries(grouped).forEach(([category, endpoints]) => {
      const matches = endpoints.filter(endpoint =>
        endpoint.name.toLowerCase().includes(query) ||
        endpoint.path.toLowerCase().includes(query) ||
        endpoint.method.toLowerCase().includes(query)
      )
      if (matches.length > 0) {
        filtered[category] = matches
      }
    })

    setFiltered(filtered)
  }

  if (loading) return <div>Loading...</div>

  return (
    <nav className="space-y-4">
      <ApiSearch onSearch={handleSearch} />
      {Object.entries(filtered).map(([category, endpoints]) => (
        // ... existing rendering code ...
      ))}
    </nav>
  )
}
```

**Step 3: Test search**

Visit endpoint page, type "route" in search

Expected: Only shows endpoints matching "route"

**Step 4: Commit**

```bash
git add apps/docs/components/ApiSearch.tsx apps/docs/components/ApiNav.tsx
git commit -m "feat(docs): add endpoint search and filtering

Search endpoints by name, path, or HTTP method.
Real-time filtering in navigation sidebar.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Update Root API Reference Navigation

**Files:**
- Modify: `apps/docs/pages/api-reference/index.mdx`

**Step 1: Update index page to feature new endpoint pages**

File: `apps/docs/pages/api-reference/index.mdx`

```mdx
---
title: API Reference
description: Complete reference for SALLY REST API
---

import { EndpointLinks } from '@/components/EndpointLinks'

# API Reference

Welcome to the SALLY API reference documentation. Our API is organized around REST principles with predictable resource-oriented URLs, standard HTTP response codes, and JSON responses.

## Getting Started

Before using the API:
1. [Create an API key](/getting-started/api-keys)
2. [Authenticate your requests](/api-reference/authentication)
3. [Plan your first route](/getting-started/first-route)

## Base URL

```
https://sally-api.apps.appshore.in/api/v1
```

## Endpoints by Category

Browse all available endpoints below, or use the navigation to explore by category.

<EndpointLinks />

## Need Help?

- [View Getting Started Guide](/getting-started/introduction)
- [Read API Integration Guides](/guides)
- [Get Support](/resources/support)
```

**Step 2: Test index page**

Visit: `http://localhost:3001/api-reference`

Expected: See updated index with endpoint links

**Step 3: Commit**

```bash
git add apps/docs/pages/api-reference/index.mdx
git commit -m "docs(api): update API reference index page

Feature new auto-generated endpoint pages.
Add endpoint links component for easy browsing.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Production Build and Testing

**Files:**
- None (testing only)

**Step 1: Run production build**

Run: `cd apps/docs && npm run build`

Expected: Build succeeds, generates static pages for all endpoints

Check output:
```
○  /api-reference/endpoint/[id] (ISR) 158 ms
   ├ /api-reference/endpoint/get-api-v1-alerts
   ├ /api-reference/endpoint/post-api-v1-routes-plan
   └ [+18 more paths]
```

**Step 2: Test production server**

Run: `npm run start`

Visit multiple endpoint pages

Expected: All pages load quickly, no hydration errors

**Step 3: Test mobile responsiveness**

Resize browser to 375px width

Expected: Mobile nav works, code panel hidden, docs readable

**Step 4: Test dark/light mode**

Toggle theme

Expected: All components look good in both themes, no contrast issues

**Step 5: Verify search works**

Search for "alert" in navigation

Expected: Shows only alert-related endpoints

**Step 6: Check accessibility**

Run Lighthouse audit

Expected: Accessibility score > 90

**Step 7: Final commit**

```bash
git add .
git commit -m "chore(docs): verify production build for API reference

Tested:
- Static generation of all endpoint pages
- Mobile responsiveness
- Dark/light theme support
- Search functionality
- Production build performance

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria

- ✅ All endpoints auto-generated from OpenAPI JSON
- ✅ 3-column layout: Navigation (280px) | Docs (flex) | Code (400px)
- ✅ Code examples in cURL, JavaScript, Python
- ✅ Mobile-responsive with drawer navigation
- ✅ Search and filter endpoints
- ✅ Dark/light theme support
- ✅ No Scalar dependencies
- ✅ Fast static generation
- ✅ Clean, Stripe-like UI

---

## Plan Complete

**Total Tasks:** 10
**Estimated Time:** 6-8 hours
**Files Created:** ~15
**Files Modified:** ~5
**Files Deleted:** ~20 (old Scalar pages)

Plan saved to: `.docs/plans/2026-02-05-api-docs-three-column-layout.md`

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**

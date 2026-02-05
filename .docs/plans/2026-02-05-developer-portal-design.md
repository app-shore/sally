# SALLY Developer Portal - Design Document

**Date:** February 5, 2026
**Status:** Approved
**Target Domain:** `docs.sally.appshore.in`
**API Domain:** `https://sally-api.apps.appshore.in`

---

## Executive Summary

This document outlines the design for SALLY's developer portal - a comprehensive documentation site that will expose our APIs to external developers, enable future API monetization, and provide an interactive "try it" experience similar to Stripe, Twilio, and other best-in-class API platforms.

**Key Features:**
- Interactive API playground with live testing
- API key management system (staging keys initially)
- Auto-generated code examples (cURL, Node.js, Python)
- Comprehensive guides, tutorials, and architecture docs
- Blog for product updates and engineering posts
- Matches SALLY design system (black/white/gray, dark mode)

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Architecture](#architecture)
3. [Content Structure](#content-structure)
4. [API Key Management System](#api-key-management-system)
5. [Interactive API Playground](#interactive-api-playground)
6. [Design System Integration](#design-system-integration)
7. [Deployment & Automation](#deployment-automation)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Best Practices](#best-practices)
10. [Future Enhancements](#future-enhancements)

---

## Technology Stack

### Core Framework: Nextra

**Why Nextra over alternatives:**
- Built on Next.js 15 (matches existing `apps/web/` stack)
- Shares TypeScript, React, and Tailwind CSS with monorepo
- Exceptional MDX support (Markdown + React components)
- Zero-config SSG (Static Site Generation) for fast performance
- Can embed custom React components for interactivity
- Built-in search with Flexsearch
- Active community and Vercel backing

**Alternatives Considered:**
- Docusaurus (React-based but different ecosystem)
- GitBook (SaaS, not self-hosted)
- Mintlify (open source option but less flexible)
- VitePress (Vue-based, doesn't match our React stack)

### Interactive API Component: Scalar

**Why Scalar:**
- Modern, beautiful UI with dark mode support
- Full OpenAPI 3.0/3.1 support (works with our Swagger setup)
- Interactive request builder with code generation
- Can be embedded as a React component in Nextra
- Self-hosted (no external dependencies)
- Most powerful "Try It" feature of any documentation tool
- Open source and actively maintained

**Integration:**
```tsx
import { ApiReferenceReact } from '@scalar/api-reference-react';

<ApiReferenceReact
  configuration={{
    spec: { url: 'https://sally-api.apps.appshore.in/api/openapi.json' }
  }}
/>
```

### Supporting Technologies

- **TypeScript** - Type safety across docs site
- **Tailwind CSS** - Shared design system with `apps/web/`
- **Shadcn/ui** - Reuse components from `apps/web/`
- **Flexsearch** - Built-in search (Nextra default)
- **MDX** - Markdown with embedded React components
- **Prisma** - API key management database schema

---

## Architecture

### Monorepo Structure

```
sally/ (monorepo root)
├── apps/
│   ├── backend/          # Existing NestJS API
│   ├── backend-py/       # Existing Python API
│   ├── web/             # Existing web app (with developer dashboard)
│   └── docs/            # NEW: Developer portal (Nextra)
│       ├── pages/       # MDX documentation files
│       │   ├── getting-started/
│       │   ├── guides/
│       │   ├── api-reference/
│       │   ├── architecture/
│       │   ├── blog/
│       │   └── resources/
│       ├── components/  # Custom React components
│       │   ├── ApiReference.tsx      # Scalar wrapper
│       │   ├── ApiKeyDisplay.tsx     # Copy key component
│       │   ├── Callout.tsx           # Info boxes
│       │   └── EndpointCard.tsx      # Quick reference
│       ├── public/
│       │   ├── openapi.json          # Synced from backend
│       │   ├── images/
│       │   └── diagrams/
│       ├── scripts/
│       │   └── sync-openapi.js       # Auto-sync OpenAPI spec
│       ├── styles/
│       │   └── globals.css           # Shared design tokens
│       ├── theme.config.tsx          # Nextra configuration
│       ├── next.config.js
│       ├── tailwind.config.ts
│       └── package.json
```

### Deployment URLs

- **Developer Portal:** `https://docs.sally.appshore.in`
- **Backend API:** `https://sally-api.apps.appshore.in/api/v1`
- **OpenAPI Spec:** `https://sally-api.apps.appshore.in/api/openapi.json`
- **Main Web App:** (existing URL with developer dashboard)

### Data Flow

```
Developer → docs.sally.appshore.in
    ↓
Fetches: sally-api.apps.appshore.in/api/openapi.json
    ↓
Scalar renders interactive playground
    ↓
Developer enters API key (sk_staging_...)
    ↓
Makes request → sally-api.apps.appshore.in/api/v1/*
    ↓
Backend validates API key → Returns response
```

---

## Content Structure

### Navigation Hierarchy

```
📘 Getting Started
  ├─ Introduction
  ├─ Quickstart
  ├─ Authentication
  └─ API Keys Setup

📖 Guides
  ├─ Route Planning
  │   ├─ Creating Your First Route
  │   ├─ Understanding HOS Compliance
  │   └─ Dynamic Route Updates
  ├─ Monitoring & Alerts
  │   ├─ Setting Up Monitoring
  │   ├─ Alert Types & Actions
  │   └─ Webhook Integration
  └─ Integrations
      ├─ TMS Integration
      ├─ ELD Integration
      └─ Telematics Integration

📡 API Reference
  ├─ Authentication
  ├─ Route Planning
  │   ├─ POST /routes/plan
  │   ├─ POST /routes/update
  │   └─ GET /routes/{plan_id}
  ├─ Monitoring
  │   └─ GET /routes/{plan_id}/monitoring
  ├─ Alerts
  │   ├─ GET /alerts
  │   ├─ POST /alerts/{id}/acknowledge
  │   └─ POST /alerts/{id}/resolve
  └─ External Mock APIs
      ├─ GET /external/hos/{driver_id}
      ├─ GET /external/fuel-prices
      └─ GET /external/weather

🏗️ Architecture
  ├─ System Overview
  ├─ Core Services
  ├─ Data Models
  └─ HOS Rule Engine

📝 Blog
  ├─ Product Updates
  ├─ Engineering Posts
  └─ Best Practices

🔧 Resources
  ├─ Status Page
  ├─ Changelog
  ├─ Support
  └─ Terms & Pricing
```

### Layout Components

**Left Sidebar:**
- Hierarchical navigation (3 levels deep)
- Collapsible sections
- Active page highlighting
- Search trigger (Cmd+K)

**Center Panel:**
- Full-width content area (max 800px for readability)
- Breadcrumb navigation
- MDX content with embedded components
- Code blocks with syntax highlighting
- Interactive API playground (Scalar)

**Right Sidebar:**
- Table of contents (auto-generated from H2/H3)
- "On this page" navigation
- Theme toggle (light/dark)
- Smooth scroll to sections

---

## API Key Management System

### Database Schema

```prisma
// Add to apps/backend/prisma/schema.prisma

model ApiKey {
  id            String   @id @default(uuid())
  key           String   @unique // sk_staging_...
  name          String   // Developer's label for the key
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Usage tracking
  lastUsedAt    DateTime?
  requestCount  Int      @default(0)

  // Rate limiting (for future monetization)
  rateLimit     Int      @default(1000) // requests per hour

  // Status
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  expiresAt     DateTime? // Optional expiry
  revokedAt     DateTime?

  @@index([userId])
  @@index([key])
  @@map("api_keys")
}
```

### API Key Service

```typescript
// apps/backend/src/domains/platform/api-keys/api-keys.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { nanoid } from 'nanoid';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async generateKey(userId: string, name: string) {
    // Format: sk_staging_32chars (production will use sk_live_)
    const prefix = 'sk_staging_';
    const randomPart = nanoid(32);
    const key = prefix + randomPart;

    return this.prisma.apiKey.create({
      data: { key, name, userId, isActive: true }
    });
  }

  async validateKey(key: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key },
      include: { user: true }
    });

    if (!apiKey || !apiKey.isActive || apiKey.revokedAt) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update usage stats
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 }
      }
    });

    return apiKey;
  }

  async revokeKey(keyId: string, userId: string) {
    return this.prisma.apiKey.update({
      where: { id: keyId, userId },
      data: { revokedAt: new Date(), isActive: false }
    });
  }

  async listKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }
}
```

### Authentication Guard

```typescript
// apps/backend/src/domains/platform/api-keys/api-key.guard.ts

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('API key required');
    }

    const key = authHeader.substring(7);
    const apiKey = await this.apiKeysService.validateKey(key);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Attach to request for use in controllers
    request.apiKey = apiKey;
    request.user = apiKey.user;

    return true;
  }
}
```

### Developer Dashboard

**Location:** `apps/web/src/app/dashboard/api-keys/page.tsx`

**Features:**
- List all API keys (staging only for now)
- "Generate API Key" button
  - Modal with name input
  - Shows key once (copy to clipboard)
  - Warning: "Save this key, you won't see it again"
- Key list with:
  - Name (editable)
  - Key (masked: `sk_staging_abc...xyz`)
  - Created date
  - Last used date
  - Request count
  - Actions: Copy, Revoke
- Usage statistics per key
- Note: "Currently staging only. Production keys coming soon."

**UI Components:**
```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// See implementation in Phase 1
```

---

## Interactive API Playground

### OpenAPI Spec Configuration

```typescript
// apps/backend/src/main.ts (enhanced)

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

const swaggerConfig = new DocumentBuilder()
  .setTitle('SALLY API')
  .setDescription('Fleet Operations Assistant API')
  .setVersion('1.0.0')
  .addBearerAuth({
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'API Key',
    description: 'Enter your API key (sk_staging_...)'
  })
  .addServer('https://sally-api.apps.appshore.in/api/v1', 'Staging')
  .addServer('http://localhost:8000/api/v1', 'Local Development')
  .addTag('Authentication', 'JWT-based authentication with multi-tenancy')
  .addTag('Route Planning', 'Create and manage optimized routes')
  .addTag('Monitoring', 'Monitor active routes in real-time')
  .addTag('Alerts', 'Dispatcher alerts and notifications')
  .addTag('External Mock APIs', 'Mock external API endpoints for testing')
  .build();

const document = SwaggerModule.createDocument(app, swaggerConfig);

// Serve OpenAPI spec at /api/openapi.json for docs site
app.use('/api/openapi.json', (req, res) => {
  res.json(document);
});

// Also write to file for reference
fs.writeFileSync(
  path.join(__dirname, '../../openapi.json'),
  JSON.stringify(document, null, 2)
);

SwaggerModule.setup('api', app, document);
```

### Scalar Integration Component

```tsx
// apps/docs/components/ApiReference.tsx

'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

interface ApiReferenceProps {
  endpoint?: string;
  method?: string;
  tag?: string;
  showPlayground?: boolean;
}

export function ApiReference({
  endpoint,
  method,
  tag,
  showPlayground = true
}: ApiReferenceProps) {
  return (
    <div className="not-prose my-8">
      <ApiReferenceReact
        configuration={{
          spec: {
            url: 'https://sally-api.apps.appshore.in/api/openapi.json'
          },
          theme: 'default',
          darkMode: true,
          layout: 'modern',
          defaultHttpClient: {
            targetKey: 'node',
            clientKey: 'fetch'
          },
          // Pre-filter to specific endpoint if provided
          ...(tag && { showTag: tag }),
          authentication: {
            preferredSecurityScheme: 'bearer',
            http: {
              bearer: {
                token: 'sk_staging_YOUR_KEY_HERE'
              }
            }
          }
        }}
      />
    </div>
  );
}
```

### Code Generation

Scalar automatically generates code examples in:
- **cURL** - Universal command-line tool
- **Node.js (fetch)** - Modern JavaScript
- **Node.js (axios)** - Popular HTTP client
- **Python (requests)** - Standard Python library
- **Python (http.client)** - Built-in library
- **PHP (cURL)** - PHP standard
- **Go (net/http)** - Go standard library
- **Ruby (net/http)** - Ruby standard library

**Example Generated Code:**

```bash
# cURL
curl -X POST https://sally-api.apps.appshore.in/api/v1/routes/plan \
  -H "Authorization: Bearer sk_staging_abc123" \
  -H "Content-Type: application/json" \
  -d '{"driver_id": "DRV001", "stops": [...]}'
```

```javascript
// Node.js (fetch)
const response = await fetch('https://sally-api.apps.appshore.in/api/v1/routes/plan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_staging_abc123',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ driver_id: 'DRV001', stops: [...] })
});
const data = await response.json();
```

```python
# Python (requests)
import requests

response = requests.post(
  'https://sally-api.apps.appshore.in/api/v1/routes/plan',
  headers={'Authorization': 'Bearer sk_staging_abc123'},
  json={'driver_id': 'DRV001', 'stops': [...]}
)
data = response.json()
```

### Request/Response Flow

1. **Developer enters API key** in Scalar playground
2. **Selects endpoint** from sidebar (e.g., POST /routes/plan)
3. **Fills in request body** with JSON schema validation
4. **Clicks "Send Request"**
5. **Scalar makes real request** to staging API
6. **Response displayed** with:
   - Status code (200, 400, 500)
   - Response time (ms)
   - Headers
   - JSON body with syntax highlighting
7. **Copy button** for response
8. **Code examples** auto-update with actual values

---

## Design System Integration

### Shared Design Tokens

```typescript
// apps/docs/theme.config.tsx

import { useConfig } from 'nextra-theme-docs';

const config = {
  logo: <span className="font-bold">SALLY Developer Portal</span>,
  project: {
    link: 'https://github.com/your-org/sally'
  },
  docsRepositoryBase: 'https://github.com/your-org/sally/tree/main/apps/docs',

  // Use SALLY color scheme (black/white/gray)
  primaryHue: 0,
  primarySaturation: 0,

  // Dark mode by default
  darkMode: true,
  nextThemes: {
    defaultTheme: 'dark'
  },

  footer: {
    text: (
      <span>
        {new Date().getFullYear()} © SALLY - Your Fleet Operations Assistant
      </span>
    )
  },

  head: () => {
    const { title } = useConfig();
    return (
      <>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:title" content={title || 'SALLY Developer Portal'} />
        <meta property="og:description" content="API documentation for SALLY Fleet Operations Assistant" />
        <link rel="icon" href="/favicon.ico" />
      </>
    );
  },

  // Custom navigation
  navigation: {
    prev: true,
    next: true
  },

  // Search configuration
  search: {
    placeholder: 'Search documentation...'
  }
};

export default config;
```

### Tailwind Configuration

```typescript
// apps/docs/tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx,md,mdx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './theme.config.tsx',
    // Import Shadcn components from apps/web
    '../web/src/components/ui/**/*.{js,jsx,ts,tsx}'
  ],

  theme: {
    extend: {
      colors: {
        // Semantic tokens (matches apps/web/src/app/globals.css)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
      }
    }
  },

  plugins: [require('tailwindcss-animate')],
  darkMode: 'class'
};

export default config;
```

### Global Styles

```css
/* apps/docs/styles/globals.css */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode (same as apps/web/) */
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
  }

  .dark {
    /* Dark mode (same as apps/web/) */
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
  }
}

/* Code block styling */
pre {
  @apply bg-muted border border-border rounded-lg p-4 overflow-x-auto;
}

code {
  @apply bg-muted px-1.5 py-0.5 rounded text-sm font-mono;
}

/* Nextra-specific overrides */
.nextra-content {
  @apply text-foreground;
}

.nextra-sidebar {
  @apply bg-background border-r border-border;
}
```

### Reusable Components

```tsx
// apps/docs/components/ApiKeyDisplay.tsx

import { Button } from '@sally/web/src/components/ui/button';
import { Badge } from '@sally/web/src/components/ui/badge';
import { Card, CardContent } from '@sally/web/src/components/ui/card';
import { useState } from 'react';

export function ApiKeyDisplay({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="not-prose my-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <code className="text-sm bg-muted px-2 py-1 rounded flex-1 overflow-x-auto">
            {apiKey}
          </code>
          <Button onClick={handleCopy} size="sm">
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <Badge variant="secondary" className="mt-2">
          Staging Key
        </Badge>
      </CardContent>
    </Card>
  );
}
```

```tsx
// apps/docs/components/Callout.tsx

import { Card, CardContent } from '@sally/web/src/components/ui/card';
import { AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface CalloutProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  children: React.ReactNode;
}

export function Callout({ type = 'info', children }: CalloutProps) {
  const icons = {
    info: <Info className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    success: <CheckCircle className="h-5 w-5" />
  };

  const colors = {
    info: 'border-blue-500 dark:border-blue-400',
    warning: 'border-yellow-500 dark:border-yellow-400',
    error: 'border-red-500 dark:border-red-400',
    success: 'border-green-500 dark:border-green-400'
  };

  return (
    <Card className={`not-prose my-6 border-l-4 ${colors[type]}`}>
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <div className="mt-0.5">{icons[type]}</div>
          <div className="flex-1">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Deployment & Automation

### Next.js Configuration

```javascript
// apps/docs/next.config.js

const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true,
  flexsearch: {
    codeblocks: true
  }
});

module.exports = withNextra({
  output: 'export', // Static export for hosting
  images: {
    unoptimized: true // Required for static export
  },
  basePath: '', // No base path needed for subdomain
  trailingSlash: true,

  experimental: {
    optimizeCss: true
  },

  async redirects() {
    return [
      {
        source: '/api-reference',
        destination: '/api-reference/index',
        permanent: true
      }
    ];
  }
});
```

### Package Scripts

```json
// apps/docs/package.json

{
  "name": "@sally/docs",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "export": "next build && next export",
    "prebuild": "npm run sync-openapi",
    "sync-openapi": "node scripts/sync-openapi.js",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.1.0",
    "nextra": "^3.0.0",
    "nextra-theme-docs": "^3.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@sally/web": "*",
    "@scalar/api-reference-react": "^0.3.0",
    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "^1.0.7"
  }
}
```

### OpenAPI Sync Script

```javascript
// apps/docs/scripts/sync-openapi.js

const fs = require('fs');
const path = require('path');
const https = require('https');

const OPENAPI_URL = 'https://sally-api.apps.appshore.in/api/openapi.json';
const OUTPUT_PATH = path.join(__dirname, '../public/openapi.json');

async function syncOpenAPI() {
  console.log('🔄 Syncing OpenAPI spec from backend...');

  return new Promise((resolve, reject) => {
    https.get(OPENAPI_URL, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const spec = JSON.parse(data);
          fs.writeFileSync(OUTPUT_PATH, JSON.stringify(spec, null, 2));
          console.log('✅ OpenAPI spec synced successfully!');
          console.log(`   Endpoints: ${Object.keys(spec.paths || {}).length}`);
          resolve();
        } catch (error) {
          console.error('❌ Failed to parse OpenAPI spec:', error.message);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ Failed to fetch OpenAPI spec:', error.message);
      reject(error);
    });
  });
}

syncOpenAPI();
```

### Turborepo Configuration

```json
// turbo.json (update root monorepo config)

{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "out/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "@sally/docs#build": {
      "dependsOn": ["@sally/docs#sync-openapi"],
      "outputs": [".next/**", "out/**"]
    },
    "@sally/docs#sync-openapi": {
      "cache": false
    }
  }
}
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy-docs.yml

name: Deploy Documentation

on:
  push:
    branches: [main]
    paths:
      - 'apps/docs/**'
      - 'apps/backend/src/**/*.ts' # Rebuild if API changes
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Sync OpenAPI spec
        run: npm run sync-openapi --workspace=@sally/docs

      - name: Build docs site
        run: npm run build --workspace=@sally/docs

      - name: Deploy to hosting
        run: |
          # Add your deployment command here
          # Examples:
          # - Vercel: vercel deploy --prod
          # - Netlify: netlify deploy --prod
          # - AWS S3: aws s3 sync ./apps/docs/out s3://docs-bucket
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

### Deployment Options

**Option 1: Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from apps/docs/
cd apps/docs
vercel --prod

# Configure custom domain in Vercel dashboard:
# docs.sally.appshore.in → CNAME to vercel
```

**Option 2: Static Hosting (Netlify, AWS S3, etc.)**
```bash
# Build static site
cd apps/docs
npm run build
# Output in: apps/docs/out/

# Deploy 'out' directory to any static host
# Configure DNS: docs.sally.appshore.in
```

**Option 3: Docker**
```dockerfile
# apps/docs/Dockerfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json ./
COPY apps/docs ./apps/docs
RUN npm ci
RUN npm run sync-openapi --workspace=@sally/docs
RUN npm run build --workspace=@sally/docs

FROM nginx:alpine
COPY --from=builder /app/apps/docs/out /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Local dev environment running, API keys working, OpenAPI spec syncing

**Tasks:**
1. ✅ Setup Nextra in monorepo
   - Create `apps/docs/` directory
   - Install dependencies: `nextra`, `nextra-theme-docs`, `@scalar/api-reference-react`
   - Configure `next.config.js` and `theme.config.tsx`
   - Setup Tailwind with shared design tokens from `apps/web/`

2. ✅ API Key Management System
   - Add Prisma schema for `ApiKey` model
   - Run migration: `npx prisma migrate dev --name add_api_keys`
   - Create `apps/backend/src/domains/platform/api-keys/` module
   - Implement `ApiKeysService` (generate, validate, revoke, list)
   - Create `ApiKeyGuard` for authentication
   - Add endpoints: POST /api-keys, GET /api-keys, DELETE /api-keys/:id

3. ✅ Developer Dashboard UI
   - Create `apps/web/src/app/dashboard/api-keys/page.tsx`
   - Build key generation modal
   - Build key list with usage stats
   - Add copy/revoke actions
   - Show "staging only" notice

4. ✅ OpenAPI Enhancement
   - Update `apps/backend/src/main.ts` Swagger config
   - Add servers (staging, local)
   - Add bearer auth schema
   - Serve spec at `/api/openapi.json`
   - Create sync script in `apps/docs/scripts/sync-openapi.js`
   - Test spec validity with Swagger UI

5. ✅ Basic Content Structure
   - Create navigation hierarchy with `_meta.json` files
   - Write homepage (`pages/index.mdx`)
   - Write introduction (`pages/getting-started/introduction.mdx`)
   - Setup 404 page

**Deliverable:** Can run `npm run dev` in `apps/docs/`, see basic navigation, API keys working in dashboard

---

### Phase 2: Core Documentation (Week 3-4)

**Goal:** Complete API reference with interactive playground, getting started guide

**Tasks:**
1. ✅ Getting Started Section
   - Write `pages/getting-started/quickstart.mdx`
   - Write `pages/getting-started/authentication.mdx`
   - Write `pages/getting-started/api-keys.mdx`
   - Add code examples for first API call

2. ✅ API Reference Pages
   - Create `components/ApiReference.tsx` (Scalar wrapper)
   - Create `pages/api-reference/index.mdx` (overview)
   - Create `pages/api-reference/authentication.mdx`
   - Create `pages/api-reference/route-planning.mdx` with Scalar
   - Create `pages/api-reference/monitoring.mdx` with Scalar
   - Create `pages/api-reference/alerts.mdx` with Scalar
   - Create `pages/api-reference/external-mock.mdx` with Scalar
   - Test all endpoints in playground

3. ✅ Custom Components
   - Build `components/Callout.tsx` (info/warning/error/success boxes)
   - Build `components/ApiKeyDisplay.tsx` (copy key component)
   - Build `components/EndpointCard.tsx` (quick reference cards)
   - Build `components/CodeBlock.tsx` (enhanced syntax highlighting)

4. ✅ Search Configuration
   - Configure Flexsearch indexing in `next.config.js`
   - Test search across all content
   - Add keyboard shortcut (Cmd+K)

**Deliverable:** Developers can browse API reference, test endpoints in playground, copy working code

---

### Phase 3: Guides & Architecture (Week 5-6)

**Goal:** Complete guides and architecture documentation

**Tasks:**
1. ✅ Route Planning Guides
   - Write `pages/guides/route-planning/creating-first-route.mdx`
   - Write `pages/guides/route-planning/hos-compliance.mdx`
   - Write `pages/guides/route-planning/dynamic-updates.mdx`
   - Add diagrams and examples

2. ✅ Monitoring & Alerts Guides
   - Write `pages/guides/monitoring-alerts/setup-monitoring.mdx`
   - Write `pages/guides/monitoring-alerts/alert-types.mdx`
   - Write `pages/guides/monitoring-alerts/webhooks.mdx` (future feature)

3. ✅ Integration Guides
   - Write `pages/guides/integrations/tms-integration.mdx`
   - Write `pages/guides/integrations/eld-integration.mdx`
   - Write `pages/guides/integrations/telematics.mdx`

4. ✅ Architecture Section
   - Write `pages/architecture/system-overview.mdx`
   - Write `pages/architecture/core-services.mdx`
   - Write `pages/architecture/data-models.mdx`
   - Write `pages/architecture/hos-engine.mdx`
   - Add architecture diagrams from `.docs/technical/architecture/`

5. ✅ Visual Assets
   - Create/import architecture diagrams
   - Add sequence diagrams for key flows
   - Screenshot API playground examples
   - Add illustrations for concepts

**Deliverable:** Complete technical documentation, developers understand architecture

---

### Phase 4: Blog & Polish (Week 7-8)

**Goal:** Blog system, resources section, SEO optimization

**Tasks:**
1. ✅ Blog System
   - Setup blog index at `pages/blog/index.mdx`
   - Create blog post template
   - Write launch posts:
     - "Introducing SALLY Developer Portal"
     - "How HOS-Compliant Route Planning Works"
     - "Building with SALLY APIs"
   - Add RSS feed generation

2. ✅ Resources Section
   - Create `pages/resources/changelog.mdx` (link to GitHub releases)
   - Create `pages/resources/support.mdx` (contact, Discord, GitHub)
   - Create `pages/resources/terms-pricing.mdx` (placeholder)

3. ✅ SEO & Performance
   - Add meta tags to all pages (title, description)
   - Setup OpenGraph images
   - Optimize image loading (next/image)
   - Add sitemap.xml generation
   - Test Core Web Vitals (Lighthouse)
   - Ensure Lighthouse score > 95

4. ✅ Testing & QA
   - Cross-browser testing (Chrome, Firefox, Safari, Edge)
   - Mobile responsiveness check (375px, 768px, 1440px)
   - Dark/light theme testing
   - API playground testing with real staging keys
   - Link checking (no 404s)
   - Code example validation (all copy-pasteable)

**Deliverable:** Production-ready developer portal, all content complete

---

### Phase 5: Deployment & Launch (Week 9)

**Goal:** Live developer portal at `docs.sally.appshore.in`

**Tasks:**
1. ✅ Deployment Setup
   - Choose hosting (Vercel recommended)
   - Configure `docs.sally.appshore.in` DNS
   - Setup SSL certificate (auto with Vercel)
   - Configure CI/CD pipeline (GitHub Actions)
   - Test deployment process

2. ✅ Monitoring & Analytics
   - Add analytics (Plausible or PostHog)
   - Setup error tracking (Sentry)
   - Add uptime monitoring (UptimeRobot or similar)
   - Create status page (optional)

3. ✅ Launch Preparation
   - Final content review
   - Test all interactive components
   - Verify OpenAPI sync working in production
   - Test API key flow end-to-end
   - Load testing (simulate 100 concurrent users)

4. ✅ Soft Launch
   - Internal team testing (3-5 days)
   - Beta user feedback (5-10 developers)
   - Fix critical issues
   - Public launch announcement (blog post, social media)

**Deliverable:** Live developer portal accessible to external developers

---

## Best Practices

### Documentation Writing

**Start with "Why"**
```mdx
<!-- ✅ GOOD -->
# Creating Your First Route

SALLY's route planning API solves a common trucking problem: drivers need
routes that comply with HOS regulations, not just the shortest path. This
guide shows you how to create your first HOS-compliant route.

<!-- ❌ BAD -->
# Creating Your First Route

Use POST /routes/plan to create a route.
```

**Show Working Examples**
```mdx
<!-- ✅ GOOD -->
```bash
# Complete, working example
curl -X POST https://sally-api.apps.appshore.in/api/v1/routes/plan \
  -H "Authorization: Bearer sk_staging_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "DRV001",
    "vehicle_id": "VEH001",
    "stops": [
      {"location": "Los Angeles, CA", "type": "origin"},
      {"location": "Phoenix, AZ", "type": "delivery"}
    ]
  }'
```

<!-- ❌ BAD -->
```bash
# Incomplete snippet
POST /routes/plan
# ... some fields
```
```

**Progressive Disclosure**
- Start simple (minimal example)
- Link to advanced topics
- Don't overwhelm on first page
- Use "Next: [Advanced Topic]" pattern

**Visual Hierarchy**
- Use H2 for major sections
- Use H3 for subsections
- Use callouts for important notes
- Use code blocks generously
- Add diagrams for complex flows

**Keep Current**
- Set calendar reminders for quarterly reviews
- Monitor user questions (what's unclear?)
- Track most-viewed pages for improvement
- Update examples when APIs change

---

### API Reference Standards

**Document Everything**
```mdx
## POST /routes/plan

Create an optimized route plan with HOS compliance validation.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| driver_id | string | Yes | ID of the driver (must have HOS data) |
| vehicle_id | string | Yes | ID of the vehicle |
| stops | array | Yes | Array of stops (min 2: origin + destination) |

### Response

**Success (200)**
```json
{
  "plan_id": "plan_abc123",
  "status": "optimized",
  "segments": [...],
  "total_distance_miles": 450,
  "total_duration_hours": 12.5,
  "hos_compliant": true
}
```

**Error (400) - Invalid Request**
```json
{
  "error": "validation_error",
  "message": "Driver DRV001 not found"
}
```

**Error (401) - Unauthorized**
```json
{
  "error": "unauthorized",
  "message": "Invalid API key"
}
```
```

**Explain Rate Limits**
```mdx
### Rate Limits

Staging keys: 1,000 requests/hour
Production keys: 10,000 requests/hour (coming soon)

Rate limit headers:
- X-RateLimit-Limit: 1000
- X-RateLimit-Remaining: 950
- X-RateLimit-Reset: 1612345678

When exceeded: 429 Too Many Requests
```

**Show Pagination**
```mdx
### Pagination

Results are paginated with 50 items per page.

Query parameters:
- page: Page number (default: 1)
- limit: Items per page (max: 100, default: 50)

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```
```

---

### Content Maintenance

**Quarterly Review Checklist**
- [ ] Test all code examples (still work?)
- [ ] Check links (no 404s?)
- [ ] Review screenshots (still accurate?)
- [ ] Update version numbers
- [ ] Review error messages (still current?)
- [ ] Check for new API endpoints to document

**User Feedback Loop**
- Add "Was this helpful?" widget on each page
- Monitor support questions (what's confusing?)
- Track search queries (what are people looking for?)
- Analyze page analytics (where do people drop off?)

**Content Improvement Process**
1. Identify pain point (support question, low satisfaction score)
2. Research what's unclear
3. Update documentation
4. Deploy change
5. Monitor impact (satisfaction score improved?)

---

### Performance Targets

**Core Web Vitals**
- **LCP (Largest Contentful Paint):** < 1.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

**Other Metrics**
- **First Contentful Paint:** < 1.0s
- **Time to Interactive:** < 3.0s
- **Lighthouse Score:** > 95
- **Search Response:** < 100ms
- **Page Size:** < 500KB (excluding images)

**Optimization Techniques**
- Static site generation (Nextra default)
- Image optimization (next/image)
- Code splitting (automatic with Next.js)
- CDN hosting (Vercel Edge Network)
- Prefetching (automatic with Next.js Link)

---

## Future Enhancements

### Phase 6: Advanced Features (Post-Launch)

**SDK Documentation**
- Generate SDKs for Node.js and Python
- Document SDK installation and usage
- Provide SDK examples in guides
- Add SDK to code generation options

**Interactive Tutorials**
- Step-by-step guided tutorials
- Interactive code editor (CodeSandbox embed)
- Progress tracking
- Certification system

**API Versioning**
- Document v2, v3 APIs as they're released
- Version switcher in navigation
- Migration guides
- Deprecation notices

**Webhooks**
- Document webhook events
- Webhook testing tool
- Signature verification guide
- Example webhook handlers

---

### Phase 7: Community Features (6-12 months)

**Community Forum**
- Discourse or GitHub Discussions integration
- Developer Q&A
- Feature requests
- Community examples

**User-Submitted Examples**
- GitHub repo for community contributions
- Showcase page for integrations
- "Built with SALLY" gallery

**Developer Showcase**
- Highlight innovative use cases
- Interview customers
- Case studies

**Office Hours**
- Weekly developer Q&A sessions
- Screen sharing for debugging
- Direct access to engineering team

---

### Phase 8: Developer Experience (12+ months)

**Postman Collection**
- Auto-generate from OpenAPI spec
- One-click import to Postman
- Environment templates

**Insomnia Support**
- Export collection for Insomnia
- Pre-configured workspaces

**CLI Tool**
- `sally-cli` for common tasks
- Route planning from command line
- Local testing tools

**VS Code Extension**
- API autocomplete
- Inline documentation
- Snippet library

**Testing Sandbox Improvements**
- More realistic mock data
- Scenario templates
- Load testing tools

---

## Summary of Key Decisions

### Technology Stack
✅ **Nextra** - Next.js-based docs framework
✅ **Scalar** - Interactive API playground
✅ **API Keys** - `sk_staging_` prefix (production: `sk_live_`)
✅ **Monorepo** - Integration at `apps/docs/`

### Deployment
✅ **Domain:** `docs.sally.appshore.in`
✅ **API:** `https://sally-api.apps.appshore.in/api/v1`
✅ **Hosting:** Static site (Vercel recommended)
✅ **CI/CD:** GitHub Actions with OpenAPI auto-sync

### Design
✅ **Match SALLY web app design system**
✅ **Reuse Shadcn components from `apps/web/`**
✅ **Dark mode by default**
✅ **Black/white/gray color palette only**

### Content
✅ **Getting Started + Guides + API Reference + Architecture + Blog + Resources**
✅ **Progressive disclosure** (simple → advanced)
✅ **Interactive playground on all endpoints**
✅ **Code examples:** cURL, Node.js, Python

### API Keys
✅ **Staging only initially** (`sk_staging_`)
✅ **Generated in developer dashboard** (`apps/web/`)
✅ **Usage tracking** (foundation for monetization)
✅ **Rate limiting ready** (1000 req/hour default)

---

## Next Steps

1. **Review this design document** with team
2. **Get approval** from stakeholders
3. **Create implementation plan** (detailed task breakdown)
4. **Setup git worktree** for isolated development
5. **Begin Phase 1** (Foundation)

---

## Research Sources

- [13 Best OpenAPI Documentation Tools for 2026 - Treblle](https://treblle.com/blog/best-openapi-documentation-tools)
- [7 API Documentation Tools for 2026 - Document360](https://document360.com/blog/api-documentation-tools/)
- [Best API Documentation Tools in 2026: A Deep Dive Comparison - Ferndesk](https://ferndesk.com/blog/best-api-documentation-tools)
- [Top 10 API Documentation Tools (2026)](https://www.levo.ai/resources/blogs/top-10-api-documentation-tools-2025)
- [The 5 Best API Docs Tools in 2025](https://apisyouwonthate.com/blog/top-5-best-api-docs-tools/)
- [Top 5 Free AI Tools for Technical Writing and API Docs [2026] | Second Talent](https://www.secondtalent.com/resources/free-ai-tools-for-technical-writing-and-api-docs/)
- [12 Best API Documentation Software and Tools for 2026](https://clickhelp.com/clickhelp-technical-writing-blog/12-best-api-documentation-software-and-tools/)
- [6 Best API Documentation Tools | Dreamfactory](https://blog.dreamfactory.com/5-best-api-documentation-tools)
- [API Documentation: Best Tools and Practices](https://beeceptor.com/docs/concepts/api-documentation-tools/)
- [The 5 Best API Docs Tools in 2025 · Bump.sh](https://bump.sh/blog/top-5-api-docs-tools-in-2025/)

---

**Document Version:** 1.0
**Last Updated:** February 5, 2026
**Author:** SALLY Engineering Team
**Reviewers:** [To be added]
**Approved By:** [To be added]

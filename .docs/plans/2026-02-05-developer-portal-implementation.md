# SALLY Developer Portal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive developer portal at `docs.sally.appshore.in` with interactive API playground, API key management, and documentation.

**Architecture:** Nextra-based Next.js static site in monorepo (`apps/docs/`) with Scalar for API playground. API key management system in NestJS backend with Prisma. Reuses Shadcn components from `apps/web/`.

**Tech Stack:** Nextra 3.x, Next.js 15, Scalar API Reference, TypeScript, Tailwind CSS, Prisma (backend), NestJS (backend)

---

## Phase 1: Foundation & API Key Management

### Task 1: Setup Nextra Project Structure

**Files:**
- Create: `apps/docs/package.json`
- Create: `apps/docs/next.config.js`
- Create: `apps/docs/tsconfig.json`
- Create: `apps/docs/theme.config.tsx`
- Create: `apps/docs/.gitignore`

**Step 1: Create package.json**

Create file at `apps/docs/package.json`:

```json
{
  "name": "@sally/docs",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "export": "next build",
    "prebuild": "npm run sync-openapi",
    "sync-openapi": "node scripts/sync-openapi.js",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "15.1.3",
    "nextra": "^3.0.0",
    "nextra-theme-docs": "^3.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@scalar/api-reference-react": "^0.3.0",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "lucide-react": "^0.468.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "typescript": "^5"
  }
}
```

**Step 2: Create Next.js config**

Create file at `apps/docs/next.config.js`:

```javascript
const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true,
  flexsearch: {
    codeblocks: true
  }
});

module.exports = withNextra({
  output: 'export',
  images: {
    unoptimized: true
  },
  basePath: '',
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

**Step 3: Create TypeScript config**

Create file at `apps/docs/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@sally/web/*": ["../web/src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create theme config**

Create file at `apps/docs/theme.config.tsx`:

```tsx
import { useConfig } from 'nextra-theme-docs';

const config = {
  logo: <span className="font-bold">SALLY Developer Portal</span>,
  project: {
    link: 'https://github.com/your-org/sally'
  },
  docsRepositoryBase: 'https://github.com/your-org/sally/tree/main/apps/docs',

  primaryHue: 0,
  primarySaturation: 0,

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

  navigation: {
    prev: true,
    next: true
  },

  search: {
    placeholder: 'Search documentation...'
  }
};

export default config;
```

**Step 5: Create .gitignore**

Create file at `apps/docs/.gitignore`:

```
# Dependencies
node_modules

# Next.js
.next
out
.turbo

# TypeScript
*.tsbuildinfo

# Environment
.env*.local

# IDE
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
```

**Step 6: Install dependencies**

Run from monorepo root:
```bash
npm install --workspace=@sally/docs
```

Expected: Dependencies installed successfully

**Step 7: Commit**

```bash
git add apps/docs/
git commit -m "feat(docs): initialize Nextra project structure"
```

---

### Task 2: Setup Tailwind CSS with Shared Design System

**Files:**
- Create: `apps/docs/tailwind.config.ts`
- Create: `apps/docs/postcss.config.js`
- Create: `apps/docs/styles/globals.css`

**Step 1: Create Tailwind config**

Create file at `apps/docs/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx,md,mdx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './theme.config.tsx',
    '../web/src/components/ui/**/*.{js,jsx,ts,tsx}'
  ],

  theme: {
    extend: {
      colors: {
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
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        ring: 'hsl(var(--ring))'
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    }
  },

  plugins: [require('tailwindcss-animate')],
  darkMode: 'class'
};

export default config;
```

**Step 2: Create PostCSS config**

Create file at `apps/docs/postcss.config.js`:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 3: Create global styles**

Create file at `apps/docs/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
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
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }

  .dark {
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
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --ring: 0 0% 83.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* Code block styling */
pre {
  @apply bg-muted border border-border rounded-lg p-4 overflow-x-auto my-4;
}

code {
  @apply bg-muted px-1.5 py-0.5 rounded text-sm font-mono;
}

pre code {
  @apply bg-transparent p-0;
}

/* Nextra-specific overrides */
.nextra-content {
  @apply text-foreground;
}

.nextra-sidebar {
  @apply bg-background border-r border-border;
}

/* Not-prose utility for embedded components */
.not-prose {
  all: revert;
}
```

**Step 4: Commit**

```bash
git add apps/docs/tailwind.config.ts apps/docs/postcss.config.js apps/docs/styles/
git commit -m "feat(docs): setup Tailwind CSS with shared design tokens"
```

---

### Task 3: Add API Key Model to Prisma Schema

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Add ApiKey model to schema**

Add to `apps/backend/prisma/schema.prisma` after the User model:

```prisma
model ApiKey {
  id            String    @id @default(uuid())
  key           String    @unique @db.VarChar(64)
  name          String    @db.VarChar(255)
  userId        String    @map("user_id")
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Usage tracking
  lastUsedAt    DateTime? @map("last_used_at")
  requestCount  Int       @default(0) @map("request_count")

  // Rate limiting
  rateLimit     Int       @default(1000) @map("rate_limit")

  // Status
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  expiresAt     DateTime? @map("expires_at")
  revokedAt     DateTime? @map("revoked_at")

  @@index([userId])
  @@index([key])
  @@map("api_keys")
}
```

**Step 2: Add ApiKey relation to User model**

Find the User model in `apps/backend/prisma/schema.prisma` and add this line:

```prisma
model User {
  // ... existing fields ...

  apiKeys       ApiKey[]  // Add this line

  // ... rest of model ...
}
```

**Step 3: Generate Prisma migration**

Run from `apps/backend/`:
```bash
npx prisma migrate dev --name add_api_keys
```

Expected: Migration created successfully, database updated

**Step 4: Generate Prisma Client**

Run from `apps/backend/`:
```bash
npx prisma generate
```

Expected: Prisma Client regenerated with ApiKey model

**Step 5: Commit**

```bash
git add apps/backend/prisma/
git commit -m "feat(backend): add ApiKey model to Prisma schema"
```

---

### Task 4: Create API Keys Service

**Files:**
- Create: `apps/backend/src/domains/platform/api-keys/api-keys.module.ts`
- Create: `apps/backend/src/domains/platform/api-keys/api-keys.service.ts`
- Create: `apps/backend/src/domains/platform/api-keys/api-keys.controller.ts`
- Create: `apps/backend/src/domains/platform/api-keys/dto/create-api-key.dto.ts`
- Create: `apps/backend/src/domains/platform/api-keys/dto/api-key.dto.ts`

**Step 1: Create DTOs**

Create file at `apps/backend/src/domains/platform/api-keys/dto/create-api-key.dto.ts`:

```typescript
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({
    example: 'Production API Key',
    description: 'Human-readable name for the API key'
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
```

Create file at `apps/backend/src/domains/platform/api-keys/dto/api-key.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'sk_staging_abc123...', description: 'API key (only shown once on creation)' })
  key?: string;

  @ApiProperty({ example: 'Production API Key' })
  name: string;

  @ApiProperty({ example: 0 })
  requestCount: number;

  @ApiProperty({ example: '2026-02-05T10:30:00Z', nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-02-05T08:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: null, nullable: true })
  expiresAt: Date | null;
}
```

**Step 2: Create service**

Create file at `apps/backend/src/domains/platform/api-keys/api-keys.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { nanoid } from 'nanoid';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyDto } from './dto/api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateApiKeyDto): Promise<ApiKeyDto> {
    const prefix = 'sk_staging_';
    const randomPart = nanoid(32);
    const key = prefix + randomPart;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        key,
        name: dto.name,
        userId,
        isActive: true
      }
    });

    return {
      id: apiKey.id,
      key: apiKey.key, // Only returned on creation
      name: apiKey.name,
      requestCount: apiKey.requestCount,
      lastUsedAt: apiKey.lastUsedAt,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt
    };
  }

  async findAll(userId: string): Promise<ApiKeyDto[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    return keys.map(key => ({
      id: key.id,
      // Don't return the actual key in list
      name: key.name,
      requestCount: key.requestCount,
      lastUsedAt: key.lastUsedAt,
      isActive: key.isActive,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt
    }));
  }

  async revoke(id: string, userId: string): Promise<void> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId }
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        isActive: false
      }
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

    // Update usage stats asynchronously
    this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 }
      }
    }).catch(err => console.error('Failed to update API key usage:', err));

    return apiKey;
  }
}
```

**Step 3: Create controller**

Create file at `apps/backend/src/domains/platform/api-keys/api-keys.controller.ts`:

```typescript
import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/domains/platform/auth/guards/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyDto } from './dto/api-key.dto';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully', type: ApiKeyDto })
  async create(
    @Request() req,
    @Body() createApiKeyDto: CreateApiKeyDto
  ): Promise<ApiKeyDto> {
    return this.apiKeysService.create(req.user.id, createApiKeyDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys for current user' })
  @ApiResponse({ status: 200, description: 'List of API keys', type: [ApiKeyDto] })
  async findAll(@Request() req): Promise<ApiKeyDto[]> {
    return this.apiKeysService.findAll(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 204, description: 'API key revoked successfully' })
  async revoke(
    @Request() req,
    @Param('id') id: string
  ): Promise<void> {
    return this.apiKeysService.revoke(id, req.user.id);
  }
}
```

**Step 4: Create module**

Create file at `apps/backend/src/domains/platform/api-keys/api-keys.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { PrismaModule } from '@/infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService]
})
export class ApiKeysModule {}
```

**Step 5: Register module in app.module.ts**

Add to `apps/backend/src/app.module.ts` imports array:

```typescript
import { ApiKeysModule } from './domains/platform/api-keys/api-keys.module';

@Module({
  imports: [
    // ... existing imports ...
    ApiKeysModule,
  ],
  // ...
})
```

**Step 6: Test locally**

Run backend:
```bash
cd apps/backend && npm run dev
```

Expected: Server starts without errors, Swagger docs at http://localhost:8000/api include API Keys endpoints

**Step 7: Commit**

```bash
git add apps/backend/src/domains/platform/api-keys/
git add apps/backend/src/app.module.ts
git commit -m "feat(backend): add API keys service and endpoints"
```

---

### Task 5: Create API Key Guard

**Files:**
- Create: `apps/backend/src/domains/platform/api-keys/guards/api-key.guard.ts`
- Create: `apps/backend/src/domains/platform/api-keys/decorators/api-key.decorator.ts`

**Step 1: Create guard**

Create file at `apps/backend/src/domains/platform/api-keys/guards/api-key.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service';

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

**Step 2: Create decorator**

Create file at `apps/backend/src/domains/platform/api-keys/decorators/api-key.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Step 3: Update module exports**

Update `apps/backend/src/domains/platform/api-keys/api-keys.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { PrismaModule } from '@/infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyGuard],
  exports: [ApiKeysService, ApiKeyGuard]
})
export class ApiKeysModule {}
```

**Step 4: Commit**

```bash
git add apps/backend/src/domains/platform/api-keys/guards/
git add apps/backend/src/domains/platform/api-keys/decorators/
git add apps/backend/src/domains/platform/api-keys/api-keys.module.ts
git commit -m "feat(backend): add API key authentication guard"
```

---

### Task 6: Enhance OpenAPI Spec Configuration

**Files:**
- Modify: `apps/backend/src/main.ts`

**Step 1: Update Swagger configuration**

Update the Swagger configuration in `apps/backend/src/main.ts`:

```typescript
// Update the existing swaggerConfig
const swaggerConfig = new DocumentBuilder()
  .setTitle('SALLY API')
  .setDescription('Fleet Operations Assistant API')
  .setVersion('1.0.0')
  .addBearerAuth({
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'API Key',
    description: 'Enter your API key (sk_staging_...)',
    name: 'Authorization',
    in: 'header'
  }, 'api-key')
  .addServer('https://sally-api.apps.appshore.in/api/v1', 'Staging')
  .addServer('http://localhost:8000/api/v1', 'Local Development')
  .addTag('Authentication', 'JWT-based authentication with multi-tenancy')
  .addTag('API Keys', 'API key management for external developers')
  .addTag('Route Planning', 'Create and manage optimized routes')
  .addTag('Monitoring', 'Monitor active routes in real-time')
  .addTag('Alerts', 'Dispatcher alerts and notifications')
  .addTag('HOS Rules', 'Hours of Service compliance validation')
  .addTag('Optimization', 'REST optimization recommendations')
  .addTag('External Mock APIs', 'Mock external API endpoints for testing')
  .build();

const document = SwaggerModule.createDocument(app, swaggerConfig);

// Serve OpenAPI spec at /api/openapi.json for docs site
app.use('/api/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(document);
});

SwaggerModule.setup('api', app, document);
```

**Step 2: Test OpenAPI endpoint**

Start backend and verify:
```bash
curl http://localhost:8000/api/openapi.json | jq '.info.title'
```

Expected: Output shows "SALLY API"

**Step 3: Commit**

```bash
git add apps/backend/src/main.ts
git commit -m "feat(backend): enhance OpenAPI spec for developer portal"
```

---

## Phase 2: Basic Pages & Navigation

### Task 7: Create Basic Page Structure

**Files:**
- Create: `apps/docs/pages/_app.tsx`
- Create: `apps/docs/pages/index.mdx`
- Create: `apps/docs/pages/_meta.json`
- Create: `apps/docs/public/favicon.ico`

**Step 1: Create _app.tsx**

Create file at `apps/docs/pages/_app.tsx`:

```tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
```

**Step 2: Create homepage**

Create file at `apps/docs/pages/index.mdx`:

```mdx
---
title: SALLY Developer Portal
---

# Welcome to SALLY Developer Portal

Build powerful fleet management applications with SALLY's HOS-compliant route planning APIs.

## What is SALLY?

SALLY is your intelligent fleet operations assistant that generates optimized, HOS-compliant routes with automatic rest and fuel stop insertion. Our APIs enable you to:

- 🚚 **Plan optimized routes** with stop sequence optimization
- ⏰ **Ensure HOS compliance** with automatic validation
- 🛑 **Insert rest stops** where regulations require
- ⛽ **Optimize fuel stops** based on price and range
- 🔄 **Update routes dynamically** when conditions change
- 🚨 **Monitor and alert** dispatchers proactively

## Getting Started

<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
  <div className="rounded-lg border border-border p-6">
    <h3 className="text-lg font-semibold mb-2">🚀 Quickstart</h3>
    <p className="text-muted-foreground mb-4">
      Create your first route in 5 minutes
    </p>
    <a href="/getting-started/quickstart" className="text-primary hover:underline">
      Get started →
    </a>
  </div>

  <div className="rounded-lg border border-border p-6">
    <h3 className="text-lg font-semibold mb-2">📡 API Reference</h3>
    <p className="text-muted-foreground mb-4">
      Explore interactive API documentation
    </p>
    <a href="/api-reference" className="text-primary hover:underline">
      View APIs →
    </a>
  </div>

  <div className="rounded-lg border border-border p-6">
    <h3 className="text-lg font-semibold mb-2">📖 Guides</h3>
    <p className="text-muted-foreground mb-4">
      Learn how to integrate SALLY
    </p>
    <a href="/guides" className="text-primary hover:underline">
      Read guides →
    </a>
  </div>

  <div className="rounded-lg border border-border p-6">
    <h3 className="text-lg font-semibold mb-2">🏗️ Architecture</h3>
    <p className="text-muted-foreground mb-4">
      Understand how SALLY works
    </p>
    <a href="/architecture" className="text-primary hover:underline">
      Learn more →
    </a>
  </div>
</div>

## Current Status

We're currently in **staging** phase. API keys with `sk_staging_` prefix are available for testing.

Production API keys coming soon!
```

**Step 3: Create root navigation config**

Create file at `apps/docs/pages/_meta.json`:

```json
{
  "index": {
    "title": "Home",
    "type": "page",
    "display": "hidden"
  },
  "getting-started": {
    "title": "📘 Getting Started",
    "type": "page"
  },
  "guides": {
    "title": "📖 Guides",
    "type": "page"
  },
  "api-reference": {
    "title": "📡 API Reference",
    "type": "page"
  },
  "architecture": {
    "title": "🏗️ Architecture",
    "type": "page"
  },
  "blog": {
    "title": "📝 Blog",
    "type": "page"
  },
  "resources": {
    "title": "🔧 Resources",
    "type": "page"
  }
}
```

**Step 4: Add favicon**

Copy favicon from `apps/web/public/favicon.ico` to `apps/docs/public/favicon.ico` (or create a placeholder)

**Step 5: Test dev server**

Run from `apps/docs/`:
```bash
npm run dev
```

Open http://localhost:3001

Expected: Homepage renders with navigation sidebar

**Step 6: Commit**

```bash
git add apps/docs/pages/ apps/docs/public/
git commit -m "feat(docs): create basic page structure and homepage"
```

---

### Task 8: Create Getting Started Section

**Files:**
- Create: `apps/docs/pages/getting-started/_meta.json`
- Create: `apps/docs/pages/getting-started/introduction.mdx`
- Create: `apps/docs/pages/getting-started/quickstart.mdx`
- Create: `apps/docs/pages/getting-started/authentication.mdx`
- Create: `apps/docs/pages/getting-started/api-keys.mdx`

**Step 1: Create navigation config**

Create file at `apps/docs/pages/getting-started/_meta.json`:

```json
{
  "introduction": "Introduction",
  "quickstart": "Quickstart",
  "authentication": "Authentication",
  "api-keys": "API Keys Setup"
}
```

**Step 2: Create introduction page**

Create file at `apps/docs/pages/getting-started/introduction.mdx`:

```mdx
---
title: Introduction
description: Learn about SALLY's API platform
---

# Introduction

SALLY provides REST APIs for intelligent fleet operations with HOS-compliant route planning.

## What You Can Build

With SALLY APIs, you can:

- **Route Planning Applications** - Build custom dispatching tools with HOS compliance built-in
- **Fleet Management Dashboards** - Monitor routes and receive proactive alerts
- **Mobile Driver Apps** - Provide drivers with optimized routes and rest recommendations
- **TMS Integrations** - Connect your existing TMS with intelligent route planning
- **Analytics Platforms** - Analyze fleet performance and compliance metrics

## Core Capabilities

### Route Planning
Generate optimized routes that respect HOS regulations, automatically insert rest stops, and optimize fuel stops based on price.

### Continuous Monitoring
SALLY monitors active routes 24/7 and detects 14 different trigger types that may require dispatcher intervention.

### Dynamic Updates
Routes automatically update when conditions change - dock delays, traffic, driver rest requests, etc.

### Compliance Validation
Every route is validated for HOS compliance before the driver starts, preventing violations proactively.

## API Architecture

SALLY APIs follow RESTful conventions:
- JSON request/response format
- Standard HTTP methods (GET, POST, PUT, DELETE)
- Consistent error handling
- Bearer token authentication (API keys)

## Rate Limits

- **Staging keys**: 1,000 requests/hour
- **Production keys**: Coming soon

## Next Steps

1. [Quickstart Guide](/getting-started/quickstart) - Create your first route in 5 minutes
2. [Authentication](/getting-started/authentication) - Learn how API authentication works
3. [API Keys Setup](/getting-started/api-keys) - Generate your first API key
```

**Step 3: Create quickstart page**

Create file at `apps/docs/pages/getting-started/quickstart.mdx`:

```mdx
---
title: Quickstart Guide
description: Get started with SALLY API in 5 minutes
---

# Quickstart Guide

Get your first route planned in 5 minutes.

## Prerequisites

- SALLY account (sign up at [sally.appshore.in](https://sally.appshore.in))
- Staging API key (we'll generate one in step 1)

## Step 1: Get Your API Key

1. Sign in to your SALLY dashboard
2. Navigate to **Dashboard → API Keys**
3. Click **"Generate API Key"**
4. Give it a name (e.g., "Test Key")
5. Copy your key - it starts with `sk_staging_`

<div className="rounded-lg border border-yellow-500 dark:border-yellow-400 p-4 my-6">
  <div className="flex gap-3">
    <div className="text-yellow-500 dark:text-yellow-400">⚠️</div>
    <div>
      <strong>Important:</strong> Save your API key securely. You won't be able to see it again.
    </div>
  </div>
</div>

## Step 2: Make Your First Request

Let's plan a simple route from Los Angeles to Phoenix:

```bash
curl -X POST https://sally-api.apps.appshore.in/api/v1/routes/plan \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "DRV001",
    "vehicle_id": "VEH001",
    "stops": [
      {
        "location": "Los Angeles, CA",
        "type": "origin",
        "appointment_time": "2026-02-06T08:00:00Z"
      },
      {
        "location": "Phoenix, AZ",
        "type": "delivery",
        "appointment_time": "2026-02-06T16:00:00Z"
      }
    ]
  }'
```

Replace `YOUR_API_KEY` with your actual key.

## Step 3: Review the Route Plan

The API returns an optimized route with:

```json
{
  "plan_id": "plan_abc123",
  "status": "optimized",
  "segments": [
    {
      "type": "drive",
      "from": "Los Angeles, CA",
      "to": "Phoenix, AZ",
      "distance_miles": 373,
      "duration_hours": 5.5
    }
  ],
  "total_distance_miles": 373,
  "total_duration_hours": 5.5,
  "hos_compliant": true,
  "feasibility": {
    "is_feasible": true,
    "violations": []
  }
}
```

✅ **HOS-compliant segments**
✅ **Rest stops automatically inserted** (if needed)
✅ **Fuel stops optimized for price**
✅ **Compliance validation passed**

## Step 4: Test in the API Playground

Visit our [API Reference](/api-reference/route-planning) to test endpoints interactively in your browser.

## What's Next?

- [Understanding Authentication](/getting-started/authentication) - Learn about API key authentication
- [Route Planning Guide](/guides/route-planning/creating-first-route) - Deep dive into route planning
- [API Reference](/api-reference) - Explore all available endpoints

## Need Help?

- 📧 Email: support@sally.com
- 💬 Discord: [Join our community](https://discord.gg/sally)
- 🐛 GitHub: [Report issues](https://github.com/your-org/sally/issues)
```

**Step 4: Create authentication page**

Create file at `apps/docs/pages/getting-started/authentication.mdx`:

```mdx
---
title: Authentication
description: Learn how API authentication works
---

# Authentication

SALLY uses API keys for authentication. All API requests must include an API key in the Authorization header.

## API Key Format

API keys follow this format:

```
sk_staging_<32_random_characters>
```

Example: `sk_staging_abc123def456ghi789jkl012mno345`

**Production keys** (coming soon) will use:
```
sk_live_<32_random_characters>
```

## Making Authenticated Requests

Include your API key in the `Authorization` header using the `Bearer` scheme:

```bash
curl https://sally-api.apps.appshore.in/api/v1/routes/plan \
  -H "Authorization: Bearer sk_staging_YOUR_KEY" \
  -H "Content-Type: application/json"
```

### JavaScript (fetch)

```javascript
const response = await fetch('https://sally-api.apps.appshore.in/api/v1/routes/plan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_staging_YOUR_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ /* your data */ })
});
```

### Python (requests)

```python
import requests

response = requests.post(
  'https://sally-api.apps.appshore.in/api/v1/routes/plan',
  headers={'Authorization': 'Bearer sk_staging_YOUR_KEY'},
  json={ /* your data */ }
)
```

## Error Responses

### 401 Unauthorized

Returned when:
- API key is missing
- API key is invalid
- API key has been revoked
- API key has expired

```json
{
  "statusCode": 401,
  "message": "Invalid or expired API key",
  "error": "Unauthorized"
}
```

### 429 Too Many Requests

Returned when you exceed the rate limit:

```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Try again in 3600 seconds.",
  "error": "Too Many Requests"
}
```

Response headers include:
- `X-RateLimit-Limit`: Your rate limit (e.g., 1000)
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the limit resets

## Best Practices

### Keep Keys Secret

- Never commit API keys to version control
- Use environment variables
- Rotate keys periodically

```javascript
// ✅ Good
const apiKey = process.env.SALLY_API_KEY;

// ❌ Bad
const apiKey = 'sk_staging_abc123...';
```

### Use Staging for Testing

- Use staging keys (`sk_staging_`) for development and testing
- Switch to production keys (`sk_live_`) only for production workloads

### Monitor Usage

Check your API key usage in the dashboard:
- Request count
- Last used timestamp
- Identify suspicious activity

### Handle Errors Gracefully

Always handle authentication errors:

```javascript
try {
  const response = await fetch(url, { headers });

  if (response.status === 401) {
    console.error('Invalid API key');
    // Notify user, refresh key, etc.
  }

  if (response.status === 429) {
    console.error('Rate limit exceeded');
    // Implement exponential backoff
  }

  const data = await response.json();
} catch (error) {
  console.error('Request failed:', error);
}
```

## Next Steps

- [API Keys Setup](/getting-started/api-keys) - Generate and manage API keys
- [Quickstart Guide](/getting-started/quickstart) - Make your first request
```

**Step 5: Create API keys page**

Create file at `apps/docs/pages/getting-started/api-keys.mdx`:

```mdx
---
title: API Keys Setup
description: Generate and manage your API keys
---

# API Keys Setup

Learn how to generate, use, and manage your SALLY API keys.

## Generating an API Key

1. **Sign in** to your SALLY dashboard at [sally.appshore.in](https://sally.appshore.in)

2. **Navigate** to Dashboard → API Keys

3. **Click** "Generate API Key" button

4. **Name your key** (e.g., "Production Server", "Testing Environment")

5. **Copy the key** - You'll only see it once!

<div className="rounded-lg border border-yellow-500 dark:border-yellow-400 p-4 my-6">
  <div className="flex gap-3">
    <div className="text-yellow-500 dark:text-yellow-400">⚠️</div>
    <div>
      <strong>Security Warning:</strong> API keys are shown only once during creation.
      Store them securely in a password manager or environment variables.
    </div>
  </div>
</div>

## Key Types

### Staging Keys

- Prefix: `sk_staging_`
- Environment: Staging API
- Data: Mock/test data
- Rate Limit: 1,000 requests/hour
- Use for: Development and testing

### Production Keys (Coming Soon)

- Prefix: `sk_live_`
- Environment: Production API
- Data: Real integration data
- Rate Limit: TBD
- Use for: Live applications

## Managing Keys

### View All Keys

The API Keys dashboard shows:
- Key name
- Key prefix (last 4 characters shown)
- Creation date
- Last used timestamp
- Request count
- Active status

### Revoke a Key

To revoke a key:
1. Find the key in your dashboard
2. Click "Revoke"
3. Confirm the action

Revoked keys:
- Stop working immediately
- Cannot be reactivated
- Generate a new key instead

### Rotate Keys

Recommended key rotation schedule:
- **Development**: Every 90 days
- **Production**: Every 30 days
- **After compromise**: Immediately

To rotate:
1. Generate a new key
2. Update your application
3. Test the new key
4. Revoke the old key

## Storage Best Practices

### Environment Variables

Store keys in `.env` files (never commit to git):

```bash
# .env
SALLY_API_KEY=sk_staging_abc123...
```

Add to `.gitignore`:
```
.env
.env.local
```

### Application Configuration

```javascript
// config.js
export const config = {
  sallyApiKey: process.env.SALLY_API_KEY,
  sallyApiUrl: 'https://sally-api.apps.appshore.in/api/v1'
};
```

### CI/CD Secrets

Use your platform's secret management:

**GitHub Actions:**
```yaml
env:
  SALLY_API_KEY: ${{ secrets.SALLY_API_KEY }}
```

**Vercel:**
```bash
vercel env add SALLY_API_KEY
```

## Usage Monitoring

Track your API usage in the dashboard:

- **Request count** - Total requests made with this key
- **Last used** - Timestamp of most recent request
- **Rate limit status** - Remaining requests in current hour

Set up alerts for:
- Approaching rate limits
- Unusual activity patterns
- First use of a new key (verify it's you)

## Security Checklist

- [ ] Keys stored in environment variables
- [ ] `.env` files in `.gitignore`
- [ ] Staging keys for development only
- [ ] Production keys for production only
- [ ] Keys rotated regularly
- [ ] Revoked keys when team members leave
- [ ] Usage monitored for anomalies

## Troubleshooting

### "Invalid or expired API key"

**Possible causes:**
- Key was revoked
- Key expired
- Typo in key
- Wrong environment (staging key on production endpoint)

**Solution:** Generate a new key

### "Rate limit exceeded"

**Possible causes:**
- Too many requests in current hour
- Missing rate limit headers in retry logic

**Solution:**
- Wait for rate limit reset
- Implement exponential backoff
- Upgrade to higher tier (production)

## Next Steps

- [Quickstart Guide](/getting-started/quickstart) - Make your first API call
- [Route Planning Guide](/guides/route-planning) - Build your first integration
- [API Reference](/api-reference) - Explore all endpoints
```

**Step 6: Test pages**

Run dev server and verify all pages render:
```bash
npm run dev
```

Navigate through Getting Started section

Expected: All pages render correctly with navigation

**Step 7: Commit**

```bash
git add apps/docs/pages/getting-started/
git commit -m "feat(docs): create getting started documentation"
```

---

### Task 9: Create Custom Components

**Files:**
- Create: `apps/docs/components/Callout.tsx`
- Create: `apps/docs/components/ApiKeyDisplay.tsx`

**Step 1: Create Callout component**

Create file at `apps/docs/components/Callout.tsx`:

```tsx
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

  const styles = {
    info: 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30',
    warning: 'border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30',
    error: 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-950/30',
    success: 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-950/30'
  };

  return (
    <div className={`not-prose my-6 rounded-lg border-l-4 p-4 ${styles[type]}`}>
      <div className="flex gap-3">
        <div className="mt-0.5">{icons[type]}</div>
        <div className="flex-1 text-sm">{children}</div>
      </div>
    </div>
  );
}
```

**Step 2: Create ApiKeyDisplay component**

Create file at `apps/docs/components/ApiKeyDisplay.tsx`:

```tsx
'use client';

import { useState } from 'react';

interface ApiKeyDisplayProps {
  apiKey: string;
  label?: string;
}

export function ApiKeyDisplay({ apiKey, label = 'Staging Key' }: ApiKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="not-prose my-6 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <code className="flex-1 overflow-x-auto rounded bg-muted px-3 py-2 text-sm font-mono">
          {apiKey}
        </code>
        <button
          onClick={handleCopy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="mt-3">
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
```

**Step 3: Update quickstart to use components**

Update `apps/docs/pages/getting-started/quickstart.mdx` to import and use these components:

```mdx
import { Callout } from '@/components/Callout';
import { ApiKeyDisplay } from '@/components/ApiKeyDisplay';

# Quickstart Guide

...

<Callout type="warning">
  **Important:** Save your API key securely. You won't be able to see it again.
</Callout>

...

<ApiKeyDisplay apiKey="sk_staging_example123456789" label="Example Staging Key" />

...
```

**Step 4: Test components**

Run dev server and view quickstart page:
```bash
npm run dev
```

Expected: Callout and ApiKeyDisplay components render correctly

**Step 5: Commit**

```bash
git add apps/docs/components/
git add apps/docs/pages/getting-started/quickstart.mdx
git commit -m "feat(docs): add custom Callout and ApiKeyDisplay components"
```

---

## Phase 3: OpenAPI Integration & API Playground

### Task 10: Create OpenAPI Sync Script

**Files:**
- Create: `apps/docs/scripts/sync-openapi.js`
- Create: `apps/docs/public/.gitkeep`

**Step 1: Create sync script**

Create file at `apps/docs/scripts/sync-openapi.js`:

```javascript
const fs = require('fs');
const path = require('path');
const https = require('https');

const OPENAPI_URL = process.env.OPENAPI_URL || 'https://sally-api.apps.appshore.in/api/openapi.json';
const OUTPUT_PATH = path.join(__dirname, '../public/openapi.json');

async function syncOpenAPI() {
  console.log('🔄 Syncing OpenAPI spec from backend...');
  console.log(`   URL: ${OPENAPI_URL}`);

  return new Promise((resolve, reject) => {
    const protocol = OPENAPI_URL.startsWith('https') ? https : require('http');

    protocol.get(OPENAPI_URL, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const spec = JSON.parse(data);

          // Validate spec has required fields
          if (!spec.openapi && !spec.swagger) {
            throw new Error('Invalid OpenAPI spec (missing openapi/swagger field)');
          }

          if (!spec.paths) {
            throw new Error('Invalid OpenAPI spec (missing paths)');
          }

          fs.writeFileSync(OUTPUT_PATH, JSON.stringify(spec, null, 2));

          const endpointCount = Object.keys(spec.paths || {}).length;
          console.log('✅ OpenAPI spec synced successfully!');
          console.log(`   Version: ${spec.info?.version || 'unknown'}`);
          console.log(`   Endpoints: ${endpointCount}`);

          resolve();
        } catch (error) {
          console.error('❌ Failed to parse OpenAPI spec:', error.message);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ Failed to fetch OpenAPI spec:', error.message);
      console.error('   Make sure the backend is running or OPENAPI_URL is correct');
      reject(error);
    });
  });
}

// Run if called directly
if (require.main === module) {
  syncOpenAPI()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { syncOpenAPI };
```

**Step 2: Create public directory placeholder**

Create file at `apps/docs/public/.gitkeep`:

```
# This directory will contain the synced OpenAPI spec
```

**Step 3: Add openapi.json to gitignore**

Create/update `apps/docs/.gitignore`:

```
# OpenAPI spec (synced from backend)
public/openapi.json
```

**Step 4: Test sync script locally**

From `apps/docs/`:
```bash
node scripts/sync-openapi.js
```

Expected:
- Script downloads OpenAPI spec
- File created at `public/openapi.json`
- Console shows success message with endpoint count

**Step 5: Verify spec content**

```bash
cat public/openapi.json | jq '.info.title'
```

Expected: Output shows "SALLY API"

**Step 6: Commit**

```bash
git add apps/docs/scripts/ apps/docs/public/.gitkeep apps/docs/.gitignore
git commit -m "feat(docs): add OpenAPI sync script"
```

---

### Task 11: Create API Reference Component with Scalar

**Files:**
- Create: `apps/docs/components/ApiReference.tsx`

**Step 1: Install Scalar package**

From `apps/docs/`:
```bash
npm install @scalar/api-reference-react
```

**Step 2: Create ApiReference component**

Create file at `apps/docs/components/ApiReference.tsx`:

```tsx
'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

interface ApiReferenceProps {
  specUrl?: string;
  tag?: string;
  operation?: string;
}

export function ApiReference({
  specUrl = '/openapi.json',
  tag,
  operation
}: ApiReferenceProps) {
  const configuration = {
    spec: {
      url: specUrl
    },
    theme: 'default',
    darkMode: true,
    layout: 'modern',
    defaultHttpClient: {
      targetKey: 'node',
      clientKey: 'fetch'
    },
    authentication: {
      preferredSecurityScheme: 'api-key',
      http: {
        bearer: {
          token: 'sk_staging_YOUR_KEY_HERE'
        }
      }
    },
    // Filter to specific tag or operation if provided
    ...(tag && { showTag: tag }),
    ...(operation && { showOperation: operation })
  };

  return (
    <div className="not-prose my-8 rounded-lg border border-border overflow-hidden">
      <ApiReferenceReact configuration={configuration} />
    </div>
  );
}
```

**Step 3: Create API reference index page**

Create file at `apps/docs/pages/api-reference/_meta.json`:

```json
{
  "index": "Overview",
  "authentication": "Authentication",
  "route-planning": "Route Planning",
  "monitoring": "Monitoring",
  "alerts": "Alerts",
  "external-mock": "External Mock APIs"
}
```

Create file at `apps/docs/pages/api-reference/index.mdx`:

```mdx
---
title: API Reference
description: Interactive API documentation for SALLY
---

# API Reference

Explore SALLY's REST APIs with interactive examples. Test endpoints directly in your browser.

## Base URL

```
https://sally-api.apps.appshore.in/api/v1
```

## Authentication

All API requests require authentication using an API key in the `Authorization` header:

```bash
Authorization: Bearer sk_staging_YOUR_KEY
```

See [Authentication Guide](/getting-started/authentication) for details.

## API Categories

### Route Planning
Create and manage optimized, HOS-compliant routes with automatic rest and fuel stop insertion.

[View Route Planning APIs →](/api-reference/route-planning)

### Monitoring
Monitor active routes in real-time and receive updates when conditions change.

[View Monitoring APIs →](/api-reference/monitoring)

### Alerts
Manage dispatcher alerts and notifications for proactive fleet management.

[View Alerts APIs →](/api-reference/alerts)

### External Mock APIs
Test endpoints that simulate external integrations (HOS, fuel prices, weather).

[View Mock APIs →](/api-reference/external-mock)

## Response Format

All API responses follow this structure:

### Success Response (200 OK)

```json
{
  "data": {
    // Response data here
  }
}
```

### Error Response (4xx, 5xx)

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## Rate Limits

Rate limits are applied per API key:

- **Staging keys**: 1,000 requests/hour
- **Production keys**: Coming soon

Rate limit headers included in responses:
- `X-RateLimit-Limit`: Total requests allowed per hour
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing API key |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Next Steps

- [Route Planning API](/api-reference/route-planning) - Start with route planning
- [Quickstart Guide](/getting-started/quickstart) - Create your first route
- [API Keys](/getting-started/api-keys) - Manage your API keys
```

**Step 4: Create route planning API page**

Create file at `apps/docs/pages/api-reference/route-planning.mdx`:

```mdx
---
title: Route Planning API
description: Create and manage optimized routes
---

import { ApiReference } from '@/components/ApiReference';

# Route Planning API

Plan HOS-compliant routes with automatic rest and fuel stop insertion.

## Interactive API Explorer

Test the Route Planning APIs directly in your browser. Enter your API key in the authentication section below.

<ApiReference tag="Route Planning" />

## Key Features

- **Stop Sequence Optimization** - TSP algorithm finds optimal stop order
- **HOS Validation** - Ensures route is compliant with FMCSA regulations
- **Automatic Rest Stops** - Inserts rest stops where driver runs out of hours
- **Fuel Stop Optimization** - Adds fuel stops based on range and price
- **Dynamic Updates** - Update routes when conditions change

## Example Use Cases

### Basic Route Planning

Plan a simple route from origin to destination:

```bash
curl -X POST https://sally-api.apps.appshore.in/api/v1/routes/plan \
  -H "Authorization: Bearer sk_staging_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "DRV001",
    "vehicle_id": "VEH001",
    "stops": [
      {
        "location": "Los Angeles, CA",
        "type": "origin"
      },
      {
        "location": "Phoenix, AZ",
        "type": "delivery"
      }
    ]
  }'
```

### Multi-Stop Route

Optimize delivery sequence for multiple stops:

```bash
curl -X POST https://sally-api.apps.appshore.in/api/v1/routes/plan \
  -H "Authorization: Bearer sk_staging_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "DRV001",
    "vehicle_id": "VEH001",
    "stops": [
      {"location": "Los Angeles, CA", "type": "origin"},
      {"location": "Phoenix, AZ", "type": "delivery"},
      {"location": "Tucson, AZ", "type": "delivery"},
      {"location": "El Paso, TX", "type": "destination"}
    ],
    "optimization_goal": "minimize_time"
  }'
```

## Next Steps

- [Route Planning Guide](/guides/route-planning/creating-first-route) - Detailed tutorial
- [Dynamic Updates](/guides/route-planning/dynamic-updates) - Update routes in real-time
- [HOS Compliance](/guides/route-planning/hos-compliance) - Understand compliance validation
```

**Step 5: Test API reference**

Start dev server and backend:
```bash
# Terminal 1: Backend
cd apps/backend && npm run dev

# Terminal 2: Docs
cd apps/docs && npm run dev
```

Navigate to http://localhost:3001/api-reference/route-planning

Expected: Scalar playground loads with SALLY API endpoints

**Step 6: Commit**

```bash
git add apps/docs/components/ApiReference.tsx
git add apps/docs/pages/api-reference/
git commit -m "feat(docs): add Scalar API playground integration"
```

---

## Phase 4: Developer Dashboard Integration

### Task 12: Create API Keys Management UI (Frontend)

**Files:**
- Create: `apps/web/src/app/dashboard/api-keys/page.tsx`
- Create: `apps/web/src/lib/api/api-keys.ts`

**Step 1: Create API client functions**

Create file at `apps/web/src/lib/api/api-keys.ts`:

```typescript
import { apiClient } from './client';

export interface ApiKey {
  id: string;
  key?: string; // Only present on creation
  name: string;
  requestCount: number;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface CreateApiKeyRequest {
  name: string;
}

export async function createApiKey(data: CreateApiKeyRequest): Promise<ApiKey> {
  const response = await apiClient.post('/api-keys', data);
  return response.data;
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const response = await apiClient.get('/api-keys');
  return response.data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiClient.delete(`/api-keys/${id}`);
}
```

**Step 2: Create API Keys page**

Create file at `apps/web/src/app/dashboard/api-keys/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Copy, Key, Trash2 } from 'lucide-react';
import { createApiKey, listApiKeys, revokeApiKey, type ApiKey } from '@/lib/api/api-keys';
import { formatDistanceToNow } from 'date-fns';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      setLoading(true);
      setError(null);
      const data = await listApiKeys();
      setKeys(data);
    } catch (err) {
      setError('Failed to load API keys');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) return;

    try {
      const newKey = await createApiKey({ name: newKeyName });
      setCreatedKey(newKey);
      setNewKeyName('');
      await loadKeys();
    } catch (err) {
      setError('Failed to create API key');
      console.error(err);
    }
  }

  async function handleRevokeKey(id: string) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await revokeApiKey(id);
      await loadKeys();
    } catch (err) {
      setError('Failed to revoke API key');
      console.error(err);
    }
  }

  function handleCopyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function closeCreateDialog() {
    setIsCreateDialogOpen(false);
    setCreatedKey(null);
    setNewKeyName('');
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Keys</h1>
        <p className="text-muted-foreground">
          Manage API keys for external access to SALLY APIs
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Currently showing staging keys only (sk_staging_). Production keys coming soon.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Key className="mr-2 h-4 w-4" />
              Generate API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            {!createdKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>Generate API Key</DialogTitle>
                  <DialogDescription>
                    Create a new API key for accessing SALLY APIs
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Key Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Production Server"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateKey} disabled={!newKeyName.trim()}>
                    Generate
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>API Key Generated</DialogTitle>
                  <DialogDescription>
                    Save this key now. You won't be able to see it again.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono overflow-x-auto">
                      {createdKey.key}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createdKey.key && handleCopyKey(createdKey.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {copiedKey && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Copied to clipboard
                    </p>
                  )}
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Store this key securely. It will only be shown once.
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button onClick={closeCreateDialog}>Done</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {loading ? (
          <>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          </>
        ) : keys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No API keys yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate your first API key to start using SALLY APIs
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Generate API Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          keys.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{key.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevokeKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Requests:</span>
                    <span className="font-medium">{key.requestCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last used:</span>
                    <span className="font-medium">
                      {key.lastUsedAt
                        ? formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })
                        : 'Never'}
                    </span>
                  </div>
                  <div className="pt-2">
                    <Badge variant={key.isActive ? 'default' : 'secondary'}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </Badge>
                    <Badge variant="outline" className="ml-2">
                      Staging
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 3: Add route to navigation**

Update the dashboard navigation in `apps/web/src/components/layout/Sidebar.tsx` (or equivalent) to include:

```tsx
{
  title: 'API Keys',
  href: '/dashboard/api-keys',
  icon: Key
}
```

**Step 4: Test API keys UI**

Start both backend and frontend:
```bash
# Terminal 1: Backend
cd apps/backend && npm run dev

# Terminal 2: Frontend
cd apps/web && npm run dev
```

1. Sign in to dashboard
2. Navigate to API Keys
3. Generate a new key
4. Copy the key
5. Verify it appears in list
6. Test revoke action

Expected: Full CRUD workflow works

**Step 5: Commit**

```bash
git add apps/web/src/app/dashboard/api-keys/
git add apps/web/src/lib/api/api-keys.ts
git commit -m "feat(web): add API keys management UI"
```

---

## Summary & Next Steps

This implementation plan covers **Phase 1 (Foundation & API Key Management)** and **Phase 2 (Basic Pages & Navigation)** and part of **Phase 3 (OpenAPI Integration)**.

**Completed:**
✅ Nextra project setup with Tailwind
✅ API key Prisma schema and migrations
✅ API keys service, controller, and guard (backend)
✅ OpenAPI spec enhancement
✅ Basic documentation pages (Getting Started)
✅ Custom components (Callout, ApiKeyDisplay)
✅ OpenAPI sync script
✅ Scalar API playground integration
✅ API keys management UI (frontend)

**Remaining Tasks for Full Implementation:**
- Complete all API reference pages (monitoring, alerts, external-mock)
- Create guides section (route planning, monitoring, integrations)
- Create architecture section (system overview, core services, etc.)
- Create blog system
- Create resources section (changelog, support, terms)
- Update turbo.json for docs build pipeline
- Setup CI/CD for deployment
- Deploy to Vercel and configure docs.sally.appshore.in

---

## Execution Options

Plan complete and saved to `.docs/plans/2026-02-05-developer-portal-implementation.md`.

**Two execution approaches:**

### 1. Subagent-Driven Development (this session)
- Stay in current session
- I dispatch fresh subagent per task
- Code review between tasks
- Fast iteration with immediate feedback

### 2. Parallel Session (separate)
- Open new Claude Code session
- Use `superpowers:executing-plans` skill
- Batch execution with checkpoints at phase boundaries
- Good for longer, independent execution

**Which approach would you like?**

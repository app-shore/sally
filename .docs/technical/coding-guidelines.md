# SALLY Coding Guidelines

**Version:** 1.0.0
**Last Updated:** February 5, 2026
**Audience:** All developers working on SALLY platform

---

## Table of Contents

1. [File Naming Conventions](#file-naming-conventions)
2. [Project Structure](#project-structure)
3. [Import and Export Patterns](#import-and-export-patterns)
4. [TypeScript Standards](#typescript-standards)
5. [State Management](#state-management)
6. [API Layer Patterns](#api-layer-patterns)
7. [Error Handling](#error-handling)
8. [Testing Standards](#testing-standards)
9. [Component Standards](#component-standards)
10. [Backend Standards](#backend-standards)

---

## File Naming Conventions

### Strict Kebab-Case Rule

**ALL files must use strict kebab-case naming.**

```
✅ CORRECT:
- use-auth.ts (hooks)
- login-form.tsx (components)
- auth-api.ts (API modules)
- user-types.ts (types)
- formatters.ts (utils - single word)
- auth-store.ts (stores)
- use-auth.test.ts (tests)
- route-planning-cockpit.tsx (multi-word components)

❌ INCORRECT:
- useAuth.ts (camelCase)
- LoginForm.tsx (PascalCase)
- auth_api.ts (snake_case)
- user.types.ts (dots in middle)
- RoutePlanningCockpit.tsx (PascalCase)
```

### Directory Naming

**All directories use kebab-case:**

```
✅ CORRECT:
features/platform/auth/
features/routing/route-planning/
shared/components/ui/
domains/fleet/drivers/
infrastructure/database/

❌ INCORRECT:
features/platform/Auth/
features/routing/routePlanning/
shared/components/UI/
```

### Exceptions

The following files keep their conventional names:
- Configuration files: `package.json`, `tsconfig.json`, `.eslintrc.json`
- Documentation: `README.md`, `CHANGELOG.md`
- Next.js special files: `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`
- Environment files: `.env`, `.env.local`

---

## Project Structure

### Frontend Structure (Next.js)

```
apps/web/src/
├── app/                        # Next.js App Router
│   ├── (dashboard)/
│   ├── (super-admin)/
│   └── layout.tsx
├── features/                   # Feature modules
│   ├── platform/              # Platform features
│   │   ├── auth/
│   │   │   ├── index.ts       # Barrel exports
│   │   │   ├── types.ts       # TypeScript types
│   │   │   ├── auth-api.ts    # API client
│   │   │   ├── store.ts       # Zustand store
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.ts
│   │   │   │   ├── use-auth.test.ts
│   │   │   │   └── index.ts
│   │   │   └── components/
│   │   │       ├── login-form.tsx
│   │   │       └── index.ts
│   │   ├── feature-flags/
│   │   ├── onboarding/
│   │   └── users/
│   ├── fleet/                 # Fleet management
│   │   ├── drivers/
│   │   ├── vehicles/
│   │   └── loads/
│   ├── routing/               # Routing & optimization
│   │   ├── route-planning/
│   │   ├── optimization/
│   │   └── hos-compliance/
│   └── operations/            # Operations
│       └── alerts/
├── shared/                    # Shared code
│   ├── components/
│   │   ├── ui/               # Shadcn components
│   │   ├── layout/           # Layout components
│   │   └── common/           # Shared components
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   └── index.ts
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── external.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── cn.ts
│   │   │   ├── formatters.ts
│   │   │   └── validation.ts
│   │   └── validation/
│   │       └── schemas.ts
│   └── config/
│       └── coming-soon-content.ts
└── lib/                       # Legacy (being migrated)
```

### Feature Module Pattern (Flat Structure)

Each feature follows this flat structure:

```
features/domain/feature-name/
├── index.ts                    # Barrel exports (public API)
├── types.ts                    # TypeScript types/interfaces
├── feature-name-api.ts         # API client functions
├── store.ts                    # Zustand store (if needed)
├── hooks/
│   ├── use-feature-name.ts    # Main hook
│   ├── use-feature-name.test.ts
│   └── index.ts
├── components/
│   ├── component-one.tsx
│   ├── component-one.test.tsx  # Co-located tests
│   ├── component-two.tsx
│   └── index.ts
└── README.md                   # Optional feature docs
```

**Key principles:**
- Flat structure (no deep nesting)
- Co-located tests
- Barrel exports for clean imports
- Group by type (hooks/, components/)

### Backend Structure (NestJS)

```
apps/backend/src/
├── app.module.ts
├── main.ts
├── domains/                    # Domain modules
│   ├── fleet/
│   │   ├── drivers/
│   │   │   ├── drivers.module.ts
│   │   │   ├── drivers.controller.ts
│   │   │   ├── drivers.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-driver.dto.ts
│   │   │   │   └── update-driver.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── driver.entity.ts
│   │   │   └── types/
│   │   │       └── driver-types.ts
│   │   ├── vehicles/
│   │   └── loads/
│   ├── routing/
│   │   ├── route-planning/
│   │   ├── optimization/
│   │   └── hos-compliance/
│   └── operations/
│       └── alerts/
├── infrastructure/             # Infrastructure concerns
│   ├── database/
│   ├── cache/
│   └── filters/
├── auth/                       # Authentication (cross-cutting)
└── shared/                     # Shared utilities
    ├── decorators/
    ├── guards/
    └── pipes/
```

**Backend mirrors frontend structure:**
- Same domain organization
- Feature-aligned modules
- Kebab-case naming throughout

---

## Import and Export Patterns

### Always Use Absolute Imports

**ALWAYS use absolute imports with `@/` alias, even within the same feature.**

```typescript
// ✅ CORRECT
import { useAuth } from '@/features/platform/auth/hooks/use-auth';
import { authApi } from '@/features/platform/auth/auth-api';
import { apiClient } from '@/shared/lib/api/client';
import { Button } from '@/shared/components/ui/button';

// ❌ INCORRECT - Never use relative imports
import { useAuth } from '../hooks/use-auth';
import { authApi } from './auth-api';
import { apiClient } from '../../../../shared/lib/api/client';
```

**Rationale:**
- Easier refactoring (moving files doesn't break imports)
- Clearer context (know exactly where things come from)
- Prevents deep relative path hell (`../../../..`)
- Enforced by ESLint

### Import Order

Imports must follow this order (enforced by ESLint):

```typescript
// 1. External dependencies (React, libraries)
import { useState, useEffect } from 'react';
import { create } from 'zustand';
import axios from 'axios';

// 2. Internal absolute imports (@/ paths)
import { useAuth } from '@/features/platform/auth';
import { apiClient } from '@/shared/lib/api/client';
import { Button } from '@/shared/components/ui/button';

// 3. Type imports
import type { User, Credentials } from '@/features/platform/auth/types';

// 4. Styles (if any)
import './styles.css';
```

### Barrel Exports

Each feature must export its public API through `index.ts`:

```typescript
// features/platform/auth/index.ts
export { useAuth } from './hooks/use-auth';
export { useAuthStore } from './store';
export { authApi } from './auth-api';

// Re-export types
export type * from './types';

// Do NOT export internal implementation details
// ❌ Don't export: helper functions, internal components, etc.
```

**Usage:**

```typescript
// ✅ CORRECT - Import from feature barrel
import { useAuth, authApi, type User } from '@/features/platform/auth';

// ❌ AVOID - Importing deep into feature (unless needed)
import { useAuth } from '@/features/platform/auth/hooks/use-auth';
```

---

## TypeScript Standards

### Strict Mode Enabled

All TypeScript projects must use strict mode:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Definitions

**Use `interface` for object shapes, `type` for unions/primitives:**

```typescript
// ✅ CORRECT
interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

type UserRole = 'OWNER' | 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'SUPER_ADMIN';

type ApiResponse<T> = {
  data: T;
  message: string;
};

// ❌ INCORRECT - Don't use type for simple objects
type User = {
  id: string;
  email: string;
};
```

### Organize Types in types.ts

All types for a feature go in `types.ts`:

```typescript
// features/platform/auth/types.ts

// Domain entities
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Enums / Union types
export type UserRole = 'OWNER' | 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'SUPER_ADMIN';

// Request/Response types
export interface Credentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  tenantName: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// State types
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

### Type Imports

Always use `type` keyword for type-only imports:

```typescript
// ✅ CORRECT
import type { User, UserRole } from '@/features/platform/auth/types';
import { useAuth } from '@/features/platform/auth';

// ✅ ALSO CORRECT - Inline type import
import { useAuth, type User } from '@/features/platform/auth';
```

### Avoid `any`

Never use `any` - use `unknown` and type guards, or define proper types:

```typescript
// ❌ INCORRECT
const data: any = await fetch('/api/user');

// ✅ CORRECT - Use unknown and narrow
const data: unknown = await fetch('/api/user');
if (isUser(data)) {
  console.log(data.email); // TypeScript knows it's a User
}

// ✅ BETTER - Define response type
const data: ApiResponse<User> = await fetch('/api/user');
console.log(data.data.email);
```

### Type Guards

Create type guards for runtime validation:

```typescript
// shared/lib/utils/type-guards.ts
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    'role' in value
  );
}
```

---

## State Management

### Zustand - Feature-Scoped Stores

Each feature has its own Zustand store when needed.

**Store pattern:**

```typescript
// features/platform/auth/store.ts
import { create } from 'zustand';
import { authApi } from './auth-api';
import type { User, Credentials, AuthState } from './types';

interface AuthStore extends AuthState {
  // Actions
  signIn: (credentials: Credentials) => Promise<void>;
  signOut: () => void;
  refreshToken: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  // Actions
  signIn: async (credentials) => {
    set({ isLoading: true });
    try {
      const response = await authApi.signIn(credentials);
      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signOut: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  refreshToken: async () => {
    const response = await authApi.refreshToken();
    set({ accessToken: response.accessToken });
  },

  setUser: (user) => set({ user }),
}));
```

**Custom hook wrapper:**

```typescript
// features/platform/auth/hooks/use-auth.ts
import { useAuthStore } from '../store';

export const useAuth = () => {
  const {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    refreshToken,
  } = useAuthStore();

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    refreshToken,
    // Computed values
    isOwner: user?.role === 'OWNER',
    isAdmin: user?.role === 'ADMIN',
    isDispatcher: user?.role === 'DISPATCHER',
    isDriver: user?.role === 'DRIVER',
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
  };
};
```

**Usage in components:**

```typescript
// components/login-form.tsx
import { useAuth } from '@/features/platform/auth';

export function LoginForm() {
  const { signIn, isLoading } = useAuth();

  const handleSubmit = async (credentials) => {
    await signIn(credentials);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### When to Use Zustand vs Local State

```typescript
// ✅ Use Zustand for:
// - Global application state (auth, theme, user preferences)
// - State shared across multiple features
// - State that needs to persist across navigation

// ✅ Use local useState for:
// - Component-specific UI state (form inputs, toggles)
// - Temporary state that doesn't need sharing
// - Simple component interactions

// ✅ Use React Query for:
// - Server state (fetching, caching, syncing)
// - API data that needs automatic refetching
```

---

## API Layer Patterns

### Frontend API Modules

Each feature has its own API module that uses the shared API client.

**API module pattern:**

```typescript
// features/platform/auth/auth-api.ts
import { apiClient } from '@/shared/lib/api/client';
import type { User, Credentials, SignUpData, AuthResponse } from './types';

export const authApi = {
  signIn: async (credentials: Credentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/signin', credentials);
    return response.data;
  },

  signUp: async (data: SignUpData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/signup', data);
    return response.data;
  },

  signOut: async (): Promise<void> => {
    await apiClient.post('/auth/signout');
  },

  refreshToken: async (): Promise<{ accessToken: string }> => {
    const response = await apiClient.post<{ accessToken: string }>('/auth/refresh');
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
```

**Shared API client:**

```typescript
// shared/lib/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/features/platform/auth/store';
import { toast } from '@/shared/hooks/use-toast';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      useAuthStore.getState().signOut();
      window.location.href = '/login';
    }

    // Show error toast
    const message = error.response?.data?.message || 'An error occurred';
    toast.error(message);

    return Promise.reject(error);
  }
);
```

### Backend API Controllers

NestJS controllers mirror the frontend API structure.

**Controller pattern:**

```typescript
// domains/auth/auth.controller.ts
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto, SignUpDto } from './dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  async signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
  }

  @Post('signup')
  async signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Post('signout')
  @UseGuards(JwtAuthGuard)
  async signOut(@CurrentUser() userId: string) {
    return this.authService.signOut(userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() userId: string) {
    return this.authService.getUserById(userId);
  }
}
```

**Service pattern:**

```typescript
// domains/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SignInDto, SignUpDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async signIn(dto: SignInDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !await this.verifyPassword(dto.password, user.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id);
    return {
      user,
      ...tokens,
    };
  }

  async signUp(dto: SignUpDto) {
    const user = await this.usersService.create(dto);
    const tokens = await this.generateTokens(user.id);
    return {
      user,
      ...tokens,
    };
  }

  private async generateTokens(userId: string) {
    const accessToken = await this.jwtService.signAsync({ sub: userId });
    return { accessToken };
  }
}
```

---

## Error Handling

### Centralized Error Handling with Typed Errors

**Custom error classes:**

```typescript
// shared/lib/errors/app-errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}
```

### Frontend Error Boundary

```typescript
// shared/components/error-boundary.tsx
'use client';

import React from 'react';
import { Button } from '@/shared/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-4">{this.state.error?.message}</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Backend Exception Filters

```typescript
// infrastructure/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
```

---

## Testing Standards

### Minimal Testing Approach

**Only test critical paths and complex logic. No minimum coverage requirements.**

### What to Test

```typescript
// ✅ TEST:
// - Complex business logic (routing algorithms, HOS calculations)
// - Critical authentication/authorization flows
// - Payment/financial calculations
// - Data transformations with edge cases
// - Integration tests for critical API flows

// ❌ DON'T TEST:
// - Simple presentational components
// - API client wrappers (test via integration tests)
// - Utility functions (unless complex)
// - Hooks that just wrap stores
// - Type definitions
// - Third-party library integrations
```

### Test File Location

Tests are co-located with source files:

```
features/platform/auth/
├── hooks/
│   ├── use-auth.ts
│   └── use-auth.test.ts        # Co-located
├── auth-api.ts
└── auth-api.test.ts            # Co-located
```

### Test Structure

```typescript
// features/platform/auth/hooks/use-auth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './use-auth';

describe('useAuth', () => {
  it('should sign in user with valid credentials', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeDefined();
  });

  it('should handle authentication errors', async () => {
    const { result } = renderHook(() => useAuth());

    await expect(
      act(async () => {
        await result.current.signIn({
          email: 'invalid@example.com',
          password: 'wrong',
        });
      })
    ).rejects.toThrow();

    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

---

## Component Standards

### React Component Structure

**Always use functional components with TypeScript:**

```typescript
// features/platform/auth/components/login-form.tsx
import { useState } from 'react';
import { useAuth } from '@/features/platform/auth';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import type { Credentials } from '../types';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectUrl?: string;
}

export function LoginForm({ onSuccess, redirectUrl }: LoginFormProps) {
  const { signIn, isLoading } = useAuth();
  const [credentials, setCredentials] = useState<Credentials>({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(credentials);
      onSuccess?.();
    } catch (error) {
      // Error handled by global error handler
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={credentials.email}
          onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={credentials.password}
          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
```

### Always Use Shadcn UI Components

**NEVER use plain HTML elements for UI components. ALWAYS use Shadcn UI components.**

```typescript
// ❌ INCORRECT - Plain HTML
<button className="px-4 py-2 bg-black text-white rounded">Click me</button>
<input type="text" className="border rounded px-2 py-1" />
<select className="border rounded">...</select>

// ✅ CORRECT - Shadcn components
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

<Button>Click me</Button>
<Input type="text" />
<Select>...</Select>
```

**Available Shadcn components:**
- Button, Input, Textarea, Label
- Select, Checkbox, Radio, Switch
- Card, Dialog, Sheet, Popover, Tooltip
- Table, Tabs, Accordion
- Alert, Badge, Progress
- And more...

**Install missing components:**
```bash
npx shadcn@latest add [component-name]
```

### Dark Theme Support (NON-NEGOTIABLE)

**ALL components MUST support dark theme.**

```typescript
// ❌ INCORRECT - No dark mode
<div className="bg-white text-gray-900 border-gray-200">

// ✅ CORRECT - Semantic tokens
<div className="bg-background text-foreground border-border">

// ✅ ALSO CORRECT - Explicit dark variants
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

**Semantic color tokens:**
```typescript
// Backgrounds
bg-background        // Main page background
bg-card             // Card/panel backgrounds
bg-accent           // Subtle accent background
bg-muted            // Muted background

// Text
text-foreground          // Primary text
text-muted-foreground    // Secondary/helper text
text-accent-foreground   // Accent text

// Borders
border-border       // Standard borders
border-input        // Input borders

// Interactive
bg-primary text-primary-foreground      // Primary buttons
bg-secondary text-secondary-foreground  // Secondary buttons
```

### Responsive Design (NON-NEGOTIABLE)

**ALL components MUST be fully responsive.**

```typescript
// ✅ CORRECT - Mobile-first responsive
<div className="px-4 md:px-6 lg:px-8">
  <h1 className="text-lg md:text-xl lg:text-2xl">Title</h1>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Content */}
  </div>
</div>

// ❌ INCORRECT - No responsive classes
<div className="px-8">
  <h1 className="text-2xl">Title</h1>
  <div className="grid grid-cols-3 gap-4">
    {/* Content */}
  </div>
</div>
```

**Required breakpoints:**
- `sm`: 640px - Small devices
- `md`: 768px - Medium devices (tablets)
- `lg`: 1024px - Large devices (desktops)
- `xl`: 1280px - Extra large devices

**Test at:**
- 375px (mobile)
- 768px (tablet)
- 1440px (desktop)

---

## Backend Standards

### NestJS Module Structure

Backend architecture mirrors frontend structure:

```typescript
// domains/fleet/drivers/drivers.module.ts
import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
```

### DTOs (Data Transfer Objects)

Use class-validator for validation:

```typescript
// domains/fleet/drivers/dto/create-driver.dto.ts
import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsEnum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR'])
  employmentType: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;
}
```

### Service Layer

Business logic goes in services:

```typescript
// domains/fleet/drivers/drivers.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { CreateDriverDto, UpdateDriverDto } from './dto';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driversRepository: Repository<Driver>,
  ) {}

  async create(dto: CreateDriverDto): Promise<Driver> {
    const driver = this.driversRepository.create(dto);
    return this.driversRepository.save(driver);
  }

  async findAll(): Promise<Driver[]> {
    return this.driversRepository.find();
  }

  async findOne(id: string): Promise<Driver> {
    const driver = await this.driversRepository.findOne({ where: { id } });
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }
    return driver;
  }

  async update(id: string, dto: UpdateDriverDto): Promise<Driver> {
    const driver = await this.findOne(id);
    Object.assign(driver, dto);
    return this.driversRepository.save(driver);
  }

  async remove(id: string): Promise<void> {
    const driver = await this.findOne(id);
    await this.driversRepository.remove(driver);
  }
}
```

---

## Quick Reference

### File Naming Checklist
- [ ] All files use kebab-case (except Next.js special files)
- [ ] All directories use kebab-case
- [ ] No camelCase, PascalCase, or snake_case in custom files

### Import Checklist
- [ ] All imports use absolute `@/` paths
- [ ] No relative imports (`../`, `./`)
- [ ] Import order: external → internal → types → styles
- [ ] Type imports use `import type` syntax

### Component Checklist
- [ ] Uses Shadcn UI components (no plain HTML)
- [ ] Supports dark theme (semantic tokens or dark: variants)
- [ ] Fully responsive (mobile-first with breakpoints)
- [ ] TypeScript props interface defined
- [ ] Functional component with proper typing

### Feature Module Checklist
- [ ] Flat structure (no deep nesting)
- [ ] Barrel exports in index.ts
- [ ] Types in types.ts
- [ ] API in feature-name-api.ts
- [ ] Store in store.ts (if needed)
- [ ] Hooks in hooks/ directory
- [ ] Components in components/ directory

### Code Quality Checklist
- [ ] No `any` types (use `unknown` or proper types)
- [ ] TypeScript strict mode enabled
- [ ] ESLint passes
- [ ] Prettier formatted
- [ ] Critical paths tested (if applicable)

---

## Enforcement

These guidelines are enforced through:
1. **ESLint** - File naming, import order, no relative imports
2. **Prettier** - Code formatting
3. **Husky** - Pre-commit hooks (auto-fix)
4. **CI/CD** - Blocks merges on violations
5. **Code Review** - Manual review for patterns

See `.docs/technical/automation-setup.md` for configuration details.

---

## Questions or Feedback?

If you have questions about these guidelines or suggestions for improvements, please:
1. Discuss with the team
2. Update this document
3. Communicate changes to all developers

---

**Last Updated:** February 5, 2026
**Version:** 1.0.0

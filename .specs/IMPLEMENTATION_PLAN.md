# REST-OS Project Scaffolding Plan

## Executive Summary

Scaffolding for REST-OS (Rest Optimization System) - an enterprise-grade platform for optimizing truck driver rest periods during dock time while maintaining FMCSA compliance. This initial phase focuses on creating the foundational architecture for:

1. **Backend Engine** - Python/FastAPI with UV package manager
2. **Operations Dashboard** - Next.js/React single-page application with engine control interface

**User App is explicitly excluded from this scaffolding phase.**

---

## Project Overview

REST-OS is a decision-intelligence system that detects dock time, predicts post-load driving demand, evaluates HOS (Hours of Service) legality, and recommends optimal rest timing to maximize productive driving hours.

### Core Components (MVP Scope)

1. **HOS Rule Engine** - FMCSA compliance validation
2. **Rest Optimization Engine** - Optimal rest timing decisions
3. **Prediction Engine** - Post-load drive demand forecasting
4. **Ops Dashboard** - Real-time monitoring and engine configuration

---

## Technology Stack

### Backend
- **Language**: Python 3.11+
- **Framework**: FastAPI
- **Package Manager**: UV (enterprise Python package management)
- **Database**: PostgreSQL (with AsyncPG driver)
- **Cache**: Redis
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Background Tasks**: Celery (future phase)
- **Logging**: Structlog
- **Validation**: Pydantic v2
- **Testing**: pytest, pytest-asyncio

### Frontend
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **State Management**: Zustand + React Query (TanStack Query)
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Visualization**: Tremor + Recharts
- **Forms**: React Hook Form + Zod validation
- **API Client**: Auto-generated from FastAPI OpenAPI schema
- **Testing**: Jest + React Testing Library + Playwright

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Development**: uv, hot-reload for both frontend and backend
- **Cloud**: AWS (future deployment)

---

## Directory Structure

```
rest-os/
├── backend/                          # Python FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app initialization
│   │   ├── config.py                 # Pydantic settings
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── security.py           # Auth & security
│   │   │   ├── constants.py          # HOS constants (11hr drive, 14hr duty, etc.)
│   │   │   └── exceptions.py         # Custom exceptions
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py         # Main router aggregator
│   │   │       ├── endpoints/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── hos_rules.py  # HOS compliance endpoints
│   │   │       │   ├── optimization.py # Rest optimization endpoints
│   │   │       │   └── prediction.py  # Prediction endpoints
│   │   │       ├── schemas/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── requests.py   # Request models
│   │   │       │   └── responses.py  # Response models
│   │   │       └── dependencies.py   # FastAPI dependencies
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── base_service.py
│   │   │   ├── hos_rule_engine.py    # HOS Rule Engine service
│   │   │   ├── rest_optimization.py  # Rest Optimization Engine
│   │   │   └── prediction_engine.py  # Prediction Engine
│   │   │
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   ├── base_repository.py
│   │   │   ├── driver_repository.py
│   │   │   ├── vehicle_repository.py
│   │   │   └── route_repository.py
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── driver.py             # Driver model
│   │   │   ├── vehicle.py            # Vehicle model
│   │   │   ├── route.py              # Route model
│   │   │   ├── event.py              # Event logs model
│   │   │   └── recommendation.py     # Recommendation model
│   │   │
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── database.py           # DB session management
│   │   │   ├── base.py               # SQLAlchemy base
│   │   │   └── migrations/           # Alembic migrations
│   │   │       ├── env.py
│   │   │       ├── script.py.mako
│   │   │       └── versions/
│   │   │
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   ├── logging.py            # Request/response logging
│   │   │   ├── error_handling.py     # Global error handler
│   │   │   └── cors.py               # CORS configuration
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── logger.py             # Structlog configuration
│   │       ├── cache.py              # Redis cache manager
│   │       └── validators.py         # Custom validators
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py               # Pytest fixtures
│   │   ├── unit/
│   │   │   ├── services/
│   │   │   │   ├── test_hos_engine.py
│   │   │   │   ├── test_optimization.py
│   │   │   │   └── test_prediction.py
│   │   │   └── repositories/
│   │   ├── integration/
│   │   │   └── api/
│   │   │       ├── test_hos_endpoints.py
│   │   │       ├── test_optimization_endpoints.py
│   │   │       └── test_prediction_endpoints.py
│   │   └── fixtures/
│   │       ├── factories.py          # Test data factories
│   │       └── mocks.py
│   │
│   ├── scripts/
│   │   ├── __init__.py
│   │   ├── db_seed.py                # Database seeding
│   │   └── init_db.py                # Database initialization
│   │
│   ├── pyproject.toml                # UV dependencies & config
│   ├── uv.lock                       # Locked dependencies
│   ├── .python-version               # Python 3.11
│   ├── Dockerfile
│   ├── .env.example
│   ├── alembic.ini
│   └── README.md
│
├── frontend/                         # Next.js React dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── page.tsx              # Engine control dashboard
│   │   │   ├── globals.css           # Global styles
│   │   │   └── api/
│   │   │       └── [...nextauth]/route.ts  # Auth API (future)
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                   # Shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   └── form.tsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── ControlPanel.tsx  # Engine parameter controls
│   │   │   │   ├── VisualizationArea.tsx # Results display
│   │   │   │   ├── EngineStatus.tsx  # Engine status indicator
│   │   │   │   └── ResultsTable.tsx  # Tabular results
│   │   │   │
│   │   │   └── forms/
│   │   │       ├── DriverInputForm.tsx
│   │   │       ├── RouteInputForm.tsx
│   │   │       └── HOSParametersForm.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   ├── client.ts         # FastAPI client
│   │   │   │   ├── schemas.gen.ts    # Auto-generated types
│   │   │   │   └── endpoints.ts      # API endpoint wrappers
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useEngineRun.ts   # Engine execution hook
│   │   │   │   ├── useHOSCheck.ts    # HOS validation hook
│   │   │   │   └── useOptimization.ts # Optimization hook
│   │   │   │
│   │   │   ├── store/
│   │   │   │   ├── engineStore.ts    # Zustand store for engine state
│   │   │   │   └── configStore.ts    # Configuration state
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── engine.ts         # Engine-related types
│   │   │   │   ├── driver.ts         # Driver types
│   │   │   │   └── route.ts          # Route types
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   ├── formatters.ts     # Data formatters
│   │   │   │   └── validators.ts     # Client-side validation
│   │   │   │
│   │   │   └── validation/
│   │   │       └── schemas.ts        # Zod validation schemas
│   │   │
│   │   └── styles/
│   │       └── globals.css
│   │
│   ├── public/
│   │   └── favicon.ico
│   │
│   ├── __tests__/
│   │   ├── unit/
│   │   │   └── components/
│   │   └── e2e/
│   │       └── engine-run.spec.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── components.json              # Shadcn/ui config
│   ├── jest.config.js
│   ├── playwright.config.ts
│   ├── .env.example
│   └── README.md
│
├── specs/
│   └── blueprint.md                  # Product blueprint (exists)
│
├── docker-compose.yml                # Multi-service orchestration
├── .gitignore
└── README.md                         # Root project README
```

---

## Critical Files to Create

### Backend Core Files

1. **backend/pyproject.toml** - UV configuration with all dependencies
2. **backend/app/main.py** - FastAPI application initialization with CORS, middleware, routers
3. **backend/app/config.py** - Environment-based configuration using Pydantic Settings
4. **backend/app/db/database.py** - Async SQLAlchemy setup with PostgreSQL
5. **backend/app/core/constants.py** - HOS regulations constants (11hr drive limit, 14hr duty window, 30min break, sleeper berth splits)

### Backend Services (Business Logic)

6. **backend/app/services/hos_rule_engine.py** - HOS compliance validation logic
7. **backend/app/services/rest_optimization.py** - Rest timing optimization algorithm
8. **backend/app/services/prediction_engine.py** - Post-load drive prediction (stub for MVP)

### Backend API Layer

9. **backend/app/api/v1/endpoints/hos_rules.py** - HOS validation endpoints
10. **backend/app/api/v1/endpoints/optimization.py** - Optimization recommendation endpoints
11. **backend/app/api/v1/schemas/requests.py** - Pydantic request models
12. **backend/app/api/v1/schemas/responses.py** - Pydantic response models

### Backend Database Models

13. **backend/app/models/driver.py** - Driver SQLAlchemy model
14. **backend/app/models/vehicle.py** - Vehicle model
15. **backend/app/models/route.py** - Route/trip model
16. **backend/app/models/recommendation.py** - Rest recommendation history

### Frontend Core Files

17. **frontend/package.json** - npm dependencies and scripts
18. **frontend/next.config.ts** - Next.js configuration with FastAPI proxy
19. **frontend/tsconfig.json** - TypeScript configuration
20. **frontend/tailwind.config.ts** - Tailwind CSS setup
21. **frontend/src/app/layout.tsx** - Root layout with providers
22. **frontend/src/app/page.tsx** - Main dashboard page with side-by-side UI

### Frontend Components

23. **frontend/src/components/dashboard/ControlPanel.tsx** - Left panel with engine parameter inputs
24. **frontend/src/components/dashboard/VisualizationArea.tsx** - Right panel showing results
25. **frontend/src/components/forms/DriverInputForm.tsx** - Driver data input form
26. **frontend/src/components/forms/RouteInputForm.tsx** - Route details form
27. **frontend/src/components/forms/HOSParametersForm.tsx** - HOS configuration form

### Frontend State & API Integration

28. **frontend/src/lib/api/client.ts** - FastAPI client configuration
29. **frontend/src/lib/hooks/useEngineRun.ts** - React Query hook for engine execution
30. **frontend/src/lib/store/engineStore.ts** - Zustand store for engine state
31. **frontend/src/lib/validation/schemas.ts** - Zod schemas for form validation

### Infrastructure

32. **docker-compose.yml** - PostgreSQL, Redis, FastAPI, Next.js services
33. **backend/Dockerfile** - Python backend containerization
34. **frontend/Dockerfile** - Next.js frontend containerization (optional for dev)
35. **.gitignore** - Comprehensive gitignore for Python + Node.js

### Configuration Files

36. **backend/.env.example** - Backend environment variables template
37. **frontend/.env.example** - Frontend environment variables template
38. **backend/alembic.ini** - Alembic migration configuration
39. **backend/tests/conftest.py** - Pytest fixtures and test database setup

### Documentation

40. **README.md** - Root project documentation with setup instructions
41. **backend/README.md** - Backend-specific documentation
42. **frontend/README.md** - Frontend-specific documentation

---

## Dashboard UI Design

### Side-by-Side Layout

```
┌─────────────────────────────────────────────────────────┐
│  REST-OS Engine Control Dashboard                      │
├──────────────────┬──────────────────────────────────────┤
│                  │                                      │
│  Control Panel   │   Visualization Area                 │
│  (30% width)     │   (70% width)                        │
│                  │                                      │
│  ┌─────────────┐ │   ┌────────────────────────────┐    │
│  │ Driver Info │ │   │  Recommendation Output      │    │
│  │ - ID        │ │   │  ┌──────────────────────┐  │    │
│  │ - Name      │ │   │  │ 🟢 Take Full Rest    │  │    │
│  │ - Status    │ │   │  │ Duration: 2.5 hours  │  │    │
│  └─────────────┘ │   │  │ Reason: ...          │  │    │
│                  │   │  └──────────────────────┘  │    │
│  ┌─────────────┐ │   │                            │    │
│  │ Route Info  │ │   │  Compliance Check:         │    │
│  │ - Distance  │ │   │  ✓ 11hr drive limit: OK    │    │
│  │ - Duration  │ │   │  ✓ 14hr duty window: OK    │    │
│  │ - Dest      │ │   │  ✓ 30min break: OK         │    │
│  └─────────────┘ │   └────────────────────────────┘    │
│                  │                                      │
│  ┌─────────────┐ │   ┌────────────────────────────┐    │
│  │ HOS Params  │ │   │  Metrics Visualization      │    │
│  │ - Hours     │ │   │  [Bar chart of hours]       │    │
│  │ - Duty time │ │   │  [Timeline view]            │    │
│  │ - Break?    │ │   └────────────────────────────┘    │
│  └─────────────┘ │                                      │
│                  │   ┌────────────────────────────┐    │
│  ┌─────────────┐ │   │  Execution History          │    │
│  │ Dock Info   │ │   │  [Table of past runs]       │    │
│  │ - Duration  │ │   └────────────────────────────┘    │
│  │ - Location  │ │                                      │
│  └─────────────┘ │                                      │
│                  │                                      │
│  [Run Engine]    │                                      │
│  [Clear]         │                                      │
│                  │                                      │
└──────────────────┴──────────────────────────────────────┘
```

### Key UI Features

1. **Control Panel (Left)**
   - Form inputs for driver data (ID, current hours worked, duty status)
   - Route information (remaining distance, destination, appointment time)
   - HOS parameters (hours driven, on-duty time, break taken)
   - Dock information (dock duration, location)
   - Action buttons (Run Engine, Clear Form)

2. **Visualization Area (Right)**
   - Recommendation card (color-coded: 🟢 full rest, 🟡 partial rest, 🔴 no rest)
   - Compliance checklist (visual indicators for HOS rules)
   - Metrics charts (hours breakdown, timeline view using Tremor/Recharts)
   - Execution history table (past engine runs with results)

3. **Real-Time Feedback**
   - Loading states during API calls
   - Success/error notifications
   - Visual indicators for compliance status
   - Explanations for recommendations ("Why?" tooltips)

---

## Implementation Approach

### Phase 1: Backend Scaffolding

1. **Initialize Python project with UV**
   - Create pyproject.toml with FastAPI, SQLAlchemy, Pydantic dependencies
   - Set up .python-version (3.11)
   - Configure development and production dependency groups

2. **Core FastAPI application**
   - Create main.py with FastAPI app initialization
   - Set up CORS middleware for local development
   - Configure Pydantic Settings for environment management
   - Add structured logging with structlog
   - Create health check endpoint

3. **Database layer**
   - Set up async SQLAlchemy with PostgreSQL connection
   - Create base models (Driver, Vehicle, Route, Recommendation)
   - Initialize Alembic for migrations
   - Create initial migration

4. **Service layer (business logic)**
   - Implement HOS Rule Engine with FMCSA regulations
     - 11-hour driving limit
     - 14-hour on-duty window
     - 30-minute break requirement
     - Sleeper berth split provisions (7/3, 8/2)
   - Implement Rest Optimization Engine
     - Basic algorithm: IF dock_time ≥ required_rest AND post_load_drive ≤ threshold → FULL REST
     - Classification logic (full/partial/no rest)
   - Stub Prediction Engine (simple calculation for MVP)

5. **API layer**
   - Create v1 router structure
   - Implement HOS validation endpoints (POST /api/v1/hos-rules/check)
   - Implement optimization endpoints (POST /api/v1/optimization/recommend)
   - Add Pydantic request/response schemas
   - Include OpenAPI documentation

6. **Testing setup**
   - Configure pytest with async support
   - Create test fixtures and factories
   - Write unit tests for services
   - Write integration tests for API endpoints

### Phase 2: Frontend Scaffolding

1. **Initialize Next.js project**
   - Create Next.js 15 app with TypeScript
   - Configure Tailwind CSS
   - Install and configure Shadcn/ui
   - Set up path aliases (@/components, @/lib)

2. **API integration setup**
   - Configure Next.js rewrites to proxy FastAPI backend
   - Install React Query (TanStack Query)
   - Install Zustand for state management
   - Set up API client with type generation

3. **State management**
   - Create Zustand store for engine state
   - Set up React Query hooks for API calls
   - Define TypeScript types/interfaces

4. **UI component structure**
   - Install Shadcn/ui components (Button, Card, Input, Form, Select, Label)
   - Create dashboard layout with side-by-side panels
   - Build ControlPanel component with form inputs
   - Build VisualizationArea component for results

5. **Forms and validation**
   - Install React Hook Form + Zod
   - Create validation schemas
   - Build DriverInputForm
   - Build RouteInputForm
   - Build HOSParametersForm

6. **Visualization components**
   - Install Tremor and Recharts
   - Create recommendation display card
   - Create compliance checklist component
   - Create metrics visualization (bar charts, timeline)
   - Create execution history table

7. **Testing setup**
   - Configure Jest and React Testing Library
   - Configure Playwright for E2E tests
   - Write component tests
   - Write E2E test for engine run flow

### Phase 3: Integration and Docker

1. **Docker setup**
   - Create backend Dockerfile with UV
   - Create frontend Dockerfile (optional for dev)
   - Create docker-compose.yml with services:
     - PostgreSQL database
     - Redis cache
     - FastAPI backend
     - Next.js frontend
   - Configure networking and volumes

2. **Environment configuration**
   - Create .env.example files
   - Document required environment variables
   - Set up environment-specific configs

3. **End-to-end integration**
   - Test frontend → backend API flow
   - Verify database connections
   - Test engine execution with real data
   - Validate compliance checks

4. **Documentation**
   - Write setup instructions
   - Document API endpoints
   - Create architecture diagrams
   - Add code examples

---

## Key Technical Decisions

### Backend

1. **UV Package Manager**: Modern, fast Python package management with reproducible builds
2. **Async SQLAlchemy**: Non-blocking database operations for better performance
3. **Service Layer Pattern**: Clear separation between business logic (services) and data access (repositories)
4. **Pydantic v2**: Strong type validation and OpenAPI schema generation
5. **API Versioning**: URL-based versioning (/api/v1) for future compatibility

### Frontend

1. **Next.js App Router**: Latest routing paradigm with server components support
2. **Zustand over Redux**: Simpler state management, smaller bundle, easier testing
3. **React Query**: Server state management with caching and real-time updates
4. **Tremor Library**: Pre-built dashboard components for rapid development
5. **Shadcn/ui**: Copy-paste component library (no npm dependency bloat)

### Architecture

1. **Monorepo Structure**: Single repository with backend/ and frontend/ for simpler development
2. **API-First Design**: FastAPI generates OpenAPI schema → auto-generate TypeScript types
3. **Type Safety**: End-to-end type safety from database to UI
4. **Separation of Concerns**: Clear boundaries between layers (API, services, repositories, models)

---

## MVP Feature Implementation

### HOS Rule Engine

**Core Rules to Implement:**
- 11-hour driving limit
- 14-hour on-duty window
- 30-minute break after 8 hours
- Sleeper berth split provisions (7/3 or 8/2)

**Input:**
- Driver ID
- Current hours driven today
- Current on-duty time
- Break taken (yes/no, duration)
- Current duty status

**Output:**
- Compliance status (compliant/non-compliant)
- Hours remaining
- Required actions
- Legal reasoning

### Rest Optimization Engine

**Algorithm (Simplified):**
```python
IF dock_time >= required_rest (e.g., 10 hours sleeper berth)
   AND post_load_drive_demand <= threshold (e.g., < 3 hours)
   AND sleeper_berth_allowed (compliance check)
   → RECOMMEND: FULL REST at dock

ELSE IF dock_time >= partial_rest (e.g., 7 hours for 7/3 split)
   AND compliance allows split
   → RECOMMEND: PARTIAL REST

ELSE
   → RECOMMEND: NO REST (continue without rest)
```

**Input:**
- Driver HOS status
- Dock time duration (actual or estimated)
- Route information (distance, destination, appointments)
- Current location

**Output:**
- Recommendation (FULL/PARTIAL/NO REST)
- Recommended duration
- Reasoning/explanation
- Compliance validation

### Prediction Engine (Stub for MVP)

**Basic Calculation:**
- Post-load drive time = remaining_distance / average_speed
- Consider appointment schedules
- Flag high-demand vs low-demand routes

**Future Enhancement:**
- Historical lane data
- Traffic predictions
- ML-based demand forecasting

---

## Dashboard Workflow

### User Flow: Running the Engine

1. **User enters driver information**
   - Driver ID, name, current status
   - Hours driven today
   - On-duty time
   - Break status

2. **User enters route details**
   - Remaining route distance
   - Destination
   - Appointment time (if any)

3. **User enters dock information**
   - Expected/actual dock duration
   - Dock location

4. **User clicks "Run Engine"**
   - Frontend validates inputs (Zod schemas)
   - React Query sends request to FastAPI backend
   - Loading state displayed

5. **Backend processes request**
   - HOS Rule Engine validates compliance
   - Prediction Engine estimates post-load demand
   - Rest Optimization Engine generates recommendation
   - Audit log created

6. **Results displayed**
   - Recommendation card (color-coded)
   - Compliance checklist
   - Visual metrics (charts)
   - Explanation text
   - Recommendation saved to history

7. **User can review history**
   - Table of past engine runs
   - Filter/search capabilities
   - Export options (future)

---

## Environment Variables

### Backend (.env)

```bash
# Application
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
SECRET_KEY=your-secret-key-change-in-production

# Database
DATABASE_URL=postgresql+asyncpg://rest_os_user:rest_os_password@localhost:5432/rest_os

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# API
API_V1_PREFIX=/api/v1
```

### Frontend (.env.local)

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Feature Flags
NEXT_PUBLIC_ENABLE_PREDICTIONS=true
```

---

## Testing Strategy

### Backend Testing

**Unit Tests:**
- HOS Rule Engine logic (compliance validation)
- Rest Optimization Engine algorithm
- Prediction Engine calculations
- Utility functions

**Integration Tests:**
- API endpoint responses
- Database operations
- Service layer integration

**Coverage Target:** 80%+ for services and repositories

### Frontend Testing

**Unit Tests:**
- Component rendering
- Form validation (Zod schemas)
- State management (Zustand stores)
- Utility functions

**Integration Tests:**
- API client integration
- React Query hooks
- Form submission flows

**E2E Tests:**
- Complete engine run workflow
- Error handling
- Results visualization

**Coverage Target:** 70%+ for components and hooks

---

## Development Commands

### Backend

```bash
# Navigate to backend
cd backend

# Install dependencies with UV
uv sync

# Run development server (hot reload)
uv run fastapi dev app/main.py

# Run tests
uv run pytest tests/

# Run tests with coverage
uv run pytest --cov=app tests/

# Create database migration
uv run alembic revision --autogenerate -m "description"

# Apply migrations
uv run alembic upgrade head

# Seed database
uv run python scripts/db_seed.py
```

### Frontend

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build

# Type checking
npm run type-check
```

### Docker (Full Stack)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild after changes
docker-compose up --build
```

---

## Verification Plan

### Backend Verification

1. **Health Check**
   - `curl http://localhost:8000/health`
   - Should return 200 OK

2. **OpenAPI Docs**
   - Navigate to `http://localhost:8000/docs`
   - Verify all endpoints are documented
   - Test endpoints interactively

3. **HOS Rule Engine Test**
   - Send POST request to `/api/v1/hos-rules/check` with sample driver data
   - Verify compliance validation
   - Check response format matches schema

4. **Optimization Engine Test**
   - Send POST request to `/api/v1/optimization/recommend`
   - Verify recommendation logic (full/partial/no rest)
   - Validate reasoning explanation

5. **Database Test**
   - Verify PostgreSQL connection
   - Check tables created via Alembic migrations
   - Insert test data via API
   - Query test data

### Frontend Verification

1. **Dashboard Load**
   - Navigate to `http://localhost:3000`
   - Verify side-by-side layout renders
   - Check responsive design

2. **Form Inputs**
   - Fill out driver information form
   - Fill out route details form
   - Verify Zod validation (test invalid inputs)
   - Check error messages display

3. **Engine Execution**
   - Click "Run Engine" button
   - Verify loading state
   - Check API request sent to backend
   - Verify results display correctly

4. **Visualization**
   - Check recommendation card displays
   - Verify compliance checklist renders
   - Validate charts/metrics display
   - Check execution history table

5. **State Management**
   - Verify Zustand store updates
   - Check React Query cache
   - Test state persistence across interactions

### Integration Verification

1. **End-to-End Flow**
   - Complete full workflow from form input to results
   - Verify data flows through all layers
   - Check database persistence
   - Validate audit trail

2. **Error Handling**
   - Test backend error responses
   - Verify frontend error display
   - Check validation error messages
   - Test network failure scenarios

3. **Performance**
   - Measure API response times (< 500ms target)
   - Check frontend rendering performance
   - Verify no memory leaks
   - Test with multiple concurrent requests

---

## Success Criteria

### Backend
- ✅ FastAPI server runs successfully
- ✅ All API endpoints respond with correct schemas
- ✅ Database migrations applied without errors
- ✅ HOS Rule Engine validates compliance correctly
- ✅ Rest Optimization Engine generates recommendations
- ✅ OpenAPI documentation accessible
- ✅ Unit tests pass (80%+ coverage)
- ✅ Integration tests pass

### Frontend
- ✅ Next.js development server runs
- ✅ Dashboard UI renders with side-by-side layout
- ✅ All forms accept and validate input
- ✅ API integration works (requests/responses)
- ✅ Recommendations display correctly
- ✅ Visualizations render (charts, tables)
- ✅ State management functions properly
- ✅ Component tests pass (70%+ coverage)
- ✅ E2E test passes for main workflow

### Integration
- ✅ Docker Compose starts all services
- ✅ Frontend communicates with backend successfully
- ✅ Database stores and retrieves data
- ✅ End-to-end workflow completes without errors
- ✅ Error handling works across stack
- ✅ Documentation complete and accurate

---

## Post-Scaffolding Next Steps

After scaffolding is complete, the following enhancements can be added:

1. **Authentication & Authorization**
   - Implement user authentication (NextAuth.js)
   - Add role-based access control
   - Secure API endpoints

2. **Enhanced Prediction Engine**
   - Integrate historical data analysis
   - Add ML-based demand forecasting
   - Implement traffic prediction API integration

3. **Real-Time Updates**
   - Add Server-Sent Events (SSE) for live status
   - Implement WebSocket for bidirectional communication
   - Add real-time fleet tracking

4. **Advanced Visualizations**
   - Add interactive map view
   - Implement timeline visualization
   - Create comparative analytics

5. **Driver App**
   - React Native mobile application
   - Push notifications
   - Offline support

6. **ELD Integration**
   - Connect to ELD systems
   - Automate duty status detection
   - Real-time HOS monitoring

7. **Deployment**
   - AWS infrastructure setup
   - CI/CD pipeline (GitHub Actions)
   - Production monitoring (Sentry, Prometheus)

---

## Timeline Estimate

**Note: No time estimates provided per guidelines. Tasks are broken down for execution prioritization.**

### Priority Order

1. Backend scaffolding (foundation)
2. Database setup and models
3. Core engine implementation (HOS, Optimization)
4. Backend API endpoints
5. Frontend scaffolding
6. Dashboard UI components
7. API integration
8. Testing setup
9. Docker configuration
10. Documentation

---

## Dependencies and Prerequisites

### System Requirements

- Python 3.11+ installed
- Node.js 20+ installed
- PostgreSQL 16+ running (or Docker)
- Redis 7+ running (or Docker)
- UV package manager (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Git

### Development Tools

- VS Code or preferred IDE
- Postman or similar (API testing)
- pgAdmin or similar (database management)
- Docker Desktop (for containerization)

---

## Risk Mitigation

### Technical Risks

1. **HOS Compliance Accuracy**
   - Mitigation: Conservative defaults, comprehensive testing, legal review
   - Validation: Compare with known compliant/non-compliant scenarios

2. **Type Safety Across Stack**
   - Mitigation: Auto-generate TypeScript types from OpenAPI schema
   - Validation: End-to-end type checking in CI/CD

3. **Real-Time Data Synchronization**
   - Mitigation: Use React Query for cache invalidation
   - Validation: Test concurrent updates

4. **Database Performance**
   - Mitigation: Proper indexing, connection pooling
   - Validation: Load testing with realistic data volumes

### Process Risks

1. **Scope Creep**
   - Mitigation: Strict MVP feature set, defer enhancements
   - Validation: Feature checklist adherence

2. **Integration Complexity**
   - Mitigation: API-first design, comprehensive testing
   - Validation: Integration tests for all endpoints

---

## Notes

- **User App is excluded** from this scaffolding phase
- Focus is on **ops dashboard** for internal users to test the engine
- **MVP scope only** - advanced features deferred
- **Enterprise-grade** standards applied throughout
- **Type safety** prioritized across entire stack
- **Testing** integrated from the start
- **Documentation** created alongside code

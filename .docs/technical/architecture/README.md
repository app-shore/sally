# SALLY Architecture Documentation

This directory contains comprehensive C4 model diagrams for the SALLY (Rest Optimization System) application using PlantUML.

## 📋 Table of Contents

- [Overview](#overview)
- [Diagram Types](#diagram-types)
- [How to Visualize](#how-to-visualize)
- [Diagram Descriptions](#diagram-descriptions)
- [Architecture Patterns](#architecture-patterns)

---

## Overview

The SALLY architecture follows the **C4 model** (Context, Container, Component, Code) for documenting software architecture. This provides multiple levels of abstraction, from high-level system context down to detailed code-level views.

### What is the C4 Model?

The C4 model is a hierarchical approach to documenting software architecture:
- **Level 1 - System Context**: Shows the system and its relationships with users and external systems
- **Level 2 - Container**: Shows high-level technology choices and how containers communicate
- **Level 3 - Component**: Shows the internal structure of containers
- **Level 4 - Code**: Shows implementation details (classes, methods, etc.)

---

## Diagram Types

| Diagram | File | Level | Description |
|---------|------|-------|-------------|
| **System Context** | `c4-level1-context.puml` | L1 | System boundary, users, and external systems |
| **Container** | `c4-level2-container.puml` | L2 | High-level technology stack (frontend, backend, databases) |
| **Backend Components** | `c4-level3-component-backend.puml` | L3 | Backend API internal structure and services |
| **Frontend Components** | `c4-level3-component-frontend.puml` | L3 | Dashboard UI component architecture |
| **HOS Engine Code** | `c4-level4-code-hos-engine.puml` | L4 | HOS Rule Engine class structure |
| **Optimization Engine Code** | `c4-level4-code-optimization-engine.puml` | L4 | Rest Optimization Engine class structure |
| **Sequence Diagram** | `sequence-rest-optimization.puml` | - | End-to-end flow for rest optimization |
| **Deployment** | `deployment-diagram.puml` | - | Docker container deployment architecture |
| **Data Flow** | `data-flow-diagram.puml` | - | Data flow through the system |

---

## How to Visualize

There are several ways to view and render these PlantUML diagrams:

### Option 1: VS Code Extension (Recommended)

1. **Install PlantUML Extension**:
   - Open VS Code
   - Search for "PlantUML" by jebbs
   - Install the extension

2. **View Diagram**:
   - Open any `.puml` file
   - Press `Alt + D` (or `Option + D` on Mac) to preview
   - Or use Command Palette: `PlantUML: Preview Current Diagram`

3. **Export to Image**:
   - Press `Alt + Shift + E` to export as PNG/SVG
   - Choose format and location

### Option 2: Online PlantUML Editor

1. Go to [PlantUML Web Server](http://www.plantuml.com/plantuml/uml/)
2. Copy the contents of any `.puml` file
3. Paste into the editor
4. The diagram renders automatically
5. Download as PNG, SVG, or other formats

### Option 3: Local PlantUML Installation

#### macOS
```bash
# Install Java (required)
brew install openjdk

# Install PlantUML
brew install plantuml

# Install Graphviz (for better rendering)
brew install graphviz

# Render a diagram
plantuml c4-level1-context.puml
# Output: c4-level1-context.png
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get install plantuml graphviz

# Render diagram
plantuml c4-level1-context.puml
```

#### Windows
```powershell
# Install using Chocolatey
choco install plantuml graphviz

# Render diagram
plantuml c4-level1-context.puml
```

### Option 4: Docker

```bash
# Run PlantUML in Docker
docker run --rm -v $(pwd):/data plantuml/plantuml -tpng "/data/*.puml"

# This generates PNG files for all .puml files in the current directory
```

### Option 5: Render All Diagrams at Once

Create a script to render all diagrams:

```bash
#!/bin/bash
# render-diagrams.sh

cd /Users/ajay-admin/sally/docs/architecture

# Render all PlantUML files as PNG
for file in *.puml; do
    echo "Rendering $file..."
    plantuml -tpng "$file"
done

echo "All diagrams rendered successfully!"
```

Make it executable and run:
```bash
chmod +x render-diagrams.sh
./render-diagrams.sh
```

---

## Diagram Descriptions

### 1. System Context Diagram (`c4-level1-context.puml`)

**Purpose**: Shows SALLY in the context of users and external systems.

**Key Elements**:
- **Users**: Fleet Dispatchers, Operations Managers, Truck Drivers
- **System**: SALLY (main system)
- **External Systems**: ELD, TMS, Telematics Platform (future integrations)

**Use Case**: Understanding who uses the system and what external integrations are planned.

---

### 2. Container Diagram (`c4-level2-container.puml`)

**Purpose**: Shows the high-level technology stack and container architecture.

**Key Elements**:
- **Operations Dashboard**: Next.js 15, React 18, TypeScript
- **Backend API**: Python 3.11, FastAPI
- **Database**: PostgreSQL 16
- **Cache**: Redis 7

**Use Case**: Understanding the technology choices and how containers communicate.

---

### 3. Backend Component Diagram (`c4-level3-component-backend.puml`)

**Purpose**: Shows the internal structure of the FastAPI backend.

**Key Components**:
- **API Layer**: Routers, endpoints, middleware
- **Service Layer**: HOS Rule Engine, Rest Optimization Engine, Prediction Engine
- **Repository Layer**: Driver, Vehicle, Route, Recommendation repositories
- **Security Layer**: Authentication, authorization (future)

**Use Case**: Understanding backend architecture and service responsibilities.

---

### 4. Frontend Component Diagram (`c4-level3-component-frontend.puml`)

**Purpose**: Shows the internal structure of the Next.js dashboard.

**Key Components**:
- **Pages**: Dashboard page with App Router
- **UI Components**: Control Panel, Visualization Area, Forms
- **State Management**: Zustand (client state), React Query (server state)
- **Validation**: Zod schemas for form validation

**Use Case**: Understanding frontend architecture and component hierarchy.

---

### 5. HOS Engine Code Diagram (`c4-level4-code-hos-engine.puml`)

**Purpose**: Shows the class-level structure of the HOS Rule Engine.

**Key Classes**:
- `HOSRuleEngine`: Main validation logic
- `HOSComplianceInput`: Input data model
- `HOSComplianceResult`: Validation result
- `ComplianceCheck`: Individual rule check
- `HOSConstants`: FMCSA regulation constants

**Use Case**: Understanding the detailed implementation of HOS compliance validation.

---

### 6. Optimization Engine Code Diagram (`c4-level4-code-optimization-engine.puml`)

**Purpose**: Shows the class-level structure of the Rest Optimization Engine.

**Key Classes**:
- `RestOptimizationEngine`: Main recommendation logic
- `RestType`: Enum (FULL_REST, PARTIAL_REST, NO_REST)
- `RestOptimizationInput`: Input data model
- `RestOptimizationResult`: Recommendation result

**Use Case**: Understanding the decision algorithm for rest recommendations.

---

### 7. Sequence Diagram (`sequence-rest-optimization.puml`)

**Purpose**: Shows the complete end-to-end flow for generating a rest recommendation.

**Flow**:
1. User fills forms in dashboard
2. Input validation (Zod)
3. API call to optimization endpoint
4. HOS compliance validation
5. Drive demand prediction
6. Rest recommendation generation
7. Database persistence
8. UI update with results

**Use Case**: Understanding the complete request-response cycle with all interactions.

---

### 8. Deployment Diagram (`deployment-diagram.puml`)

**Purpose**: Shows the Docker container deployment architecture.

**Infrastructure**:
- **Docker Network**: sally-network (bridge)
- **Containers**: PostgreSQL, Redis, Backend, Frontend
- **Volumes**: postgres_data, redis_data
- **Ports**: 5432, 6379, 8000, 3000

**Use Case**: Understanding how the application is deployed in development.

---

### 9. Data Flow Diagram (`data-flow-diagram.puml`)

**Purpose**: Shows how data flows through the system from input to output.

**Data Path**:
1. **Input**: Driver, Dock, Route, HOS forms
2. **Validation**: Zod schemas
3. **Processing**: HOS validation → Prediction → Optimization
4. **Storage**: PostgreSQL (persistent), Redis (cache)
5. **Output**: Recommendation card, compliance checklist, metrics, history

**Use Case**: Understanding data transformations and storage points.

---

## Architecture Patterns

### Layered Architecture

The backend follows a strict layered architecture:

```
API Layer (FastAPI Routes)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
Model Layer (Database Models)
```

**Benefits**:
- Clear separation of concerns
- Easy to test (mock dependencies)
- Maintainable and scalable

### Service-Oriented Design

Three core services power the application:

1. **HOS Rule Engine**: FMCSA compliance validation
2. **Rest Optimization Engine**: Decision-making for rest recommendations
3. **Prediction Engine**: Drive demand estimation

**Benefits**:
- Services are independent and reusable
- Can be scaled separately
- Clear boundaries and responsibilities

### State Management Pattern (Frontend)

Dual state management approach:

- **Client State (Zustand)**: UI state, form data, local preferences
- **Server State (React Query)**: API data, caching, synchronization

**Benefits**:
- Optimized performance
- Automatic cache invalidation
- Reduced unnecessary re-renders

### Repository Pattern

Data access is abstracted through repositories:

```
Service → Repository → Database
```

**Benefits**:
- Database implementation can change without affecting services
- Easy to mock for testing
- Centralized data access logic

---

## Key Architectural Decisions

### 1. Async Everything (Backend)

- **Why**: Non-blocking I/O for better performance
- **How**: AsyncIO, SQLAlchemy async, AsyncPG driver
- **Benefit**: Handle more concurrent requests with fewer resources

### 2. Type Safety Across Stack

- **Frontend**: TypeScript with strict mode
- **Backend**: Pydantic v2 for runtime validation
- **API**: Auto-generated TypeScript types from OpenAPI schema

**Benefit**: Catch errors at compile time, not runtime

### 3. API-First Design

- **Approach**: Design API contracts first, implement later
- **Tool**: FastAPI auto-generates OpenAPI schema
- **Benefit**: Frontend and backend can develop in parallel

### 4. Caching Strategy

**What to Cache**:
- HOS validation results (TTL: 5 minutes)
- Prediction results (TTL: 15 minutes)
- Session data (TTL: 30 minutes)

**Why**: Reduce database load and improve response times

### 5. Monorepo with Turborepo

**Structure**:
```
sally/
├── apps/
│   ├── backend/    # Python FastAPI
│   └── web/        # Next.js dashboard
└── packages/       # Shared packages (future)
```

**Benefit**: Single repository, coordinated releases, shared tooling

---

## FMCSA HOS Regulations (Encoded in System)

The system implements these federal regulations:

| Rule | Value | Constant |
|------|-------|----------|
| Max driving hours per day | 11 hours | `MAX_DRIVE_HOURS` |
| Max on-duty hours per day | 14 hours | `MAX_DUTY_HOURS` |
| Required break after driving | 30 minutes | `REQUIRED_BREAK_MINUTES` |
| Break trigger threshold | 8 hours | `BREAK_TRIGGER_HOURS` |
| Minimum rest period | 10 hours | `MIN_REST_HOURS` |
| Sleeper berth long split | 8 hours | `SLEEPER_BERTH_SPLIT_LONG` |
| Sleeper berth short split | 2 hours | `SLEEPER_BERTH_SPLIT_SHORT` |

**References**:
- [FMCSA HOS Summary](https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations)
- Implemented in: `apps/backend/app/core/constants.py`

---

## Technology Stack Summary

### Backend
- **Language**: Python 3.11
- **Framework**: FastAPI
- **Package Manager**: UV
- **ORM**: SQLAlchemy 2.0 (async)
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Migrations**: Alembic
- **Testing**: pytest, pytest-asyncio
- **Logging**: structlog

### Frontend
- **Framework**: Next.js 15
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod
- **Visualization**: Tremor + Recharts
- **Testing**: Jest, React Testing Library, Playwright

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Monorepo**: Turborepo
- **Web Server**: Uvicorn (ASGI)
- **Deployment**: Docker (dev), AWS (production - future)

---

## How to Update Diagrams

When making architectural changes:

1. **Update the relevant `.puml` file(s)**
2. **Regenerate the diagram** using one of the visualization methods above
3. **Commit both `.puml` and rendered images** to version control
4. **Update this README** if new diagrams are added

---

## Further Reading

- [C4 Model Official Site](https://c4model.com/)
- [PlantUML Documentation](https://plantuml.com/)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Query Documentation](https://tanstack.com/query/latest)
- [FMCSA Hours of Service](https://www.fmcsa.dot.gov/regulations/hours-service)

---

## Questions or Feedback

For questions about the architecture or to suggest improvements, please:
- Open an issue in the repository
- Contact the development team
- Refer to the main project documentation

---

**Last Updated**: 2026-01-22
**Maintainer**: SALLY Development Team

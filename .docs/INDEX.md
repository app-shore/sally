# REST-OS Documentation Index

Welcome to the REST-OS documentation. This index provides links to all documentation resources.

## 📚 Documentation Structure

```
docs/
├── INDEX.md                          # This file
├── architecture/                     # C4 model architecture diagrams
│   ├── README.md                    # Architecture overview
│   ├── VISUALIZATION_GUIDE.md       # How to view diagrams
│   ├── c4-level1-context.puml       # System context diagram
│   ├── c4-level2-container.puml     # Container diagram
│   ├── c4-level3-component-backend.puml
│   ├── c4-level3-component-frontend.puml
│   ├── c4-level4-code-hos-engine.puml
│   ├── c4-level4-code-optimization-engine.puml
│   ├── sequence-rest-optimization.puml
│   ├── deployment-diagram.puml
│   ├── data-flow-diagram.puml
│   └── render-diagrams.sh          # Script to render all diagrams
│
specs/
├── IMPLEMENTATION_PLAN.md           # Original scaffolding plan
└── blueprint.md                     # Product blueprint (if exists)
```

---

## 🚀 Quick Start

### For Developers
1. **Setup**: Read [QUICKSTART.md](../QUICKSTART.md) (5-minute guide)
2. **Architecture**: Start with [architecture/README.md](architecture/README.md)
3. **Visualize**: Use [architecture/VISUALIZATION_GUIDE.md](architecture/VISUALIZATION_GUIDE.md)

### For Architects
1. **System Context**: View `architecture/c4-level1-context.puml`
2. **Technology Stack**: View `architecture/c4-level2-container.puml`
3. **Detailed Design**: Review level 3 & 4 diagrams

### For Operations
1. **Deployment**: See `architecture/deployment-diagram.puml`
2. **Status**: Check [DEPLOYMENT_STATUS.md](../DEPLOYMENT_STATUS.md)
3. **Troubleshooting**: Refer to [SETUP.md](../SETUP.md)

---

## 📖 Documentation Categories

### 1. Getting Started
| Document | Description |
|----------|-------------|
| [QUICKSTART.md](../QUICKSTART.md) | 5-minute quick start guide |
| [SETUP.md](../SETUP.md) | Comprehensive setup instructions |
| [DEPLOY.md](./DEPLOY.md) | Deployment guide (Docker, Vercel, CapRover) |
| [BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md) | Backend deployment (NestJS or Python to CapRover) |
| [README.md](../README.md) | Project overview and introduction |

### 2. Architecture
| Document | Description |
|----------|-------------|
| [architecture/README.md](architecture/README.md) | Architecture overview and C4 model guide |
| [architecture/VISUALIZATION_GUIDE.md](architecture/VISUALIZATION_GUIDE.md) | How to visualize PlantUML diagrams |
| [specs/IMPLEMENTATION_PLAN.md](../specs/IMPLEMENTATION_PLAN.md) | Original implementation plan |

### 3. System Status
| Document | Description |
|----------|-------------|
| [DEPLOYMENT_STATUS.md](../DEPLOYMENT_STATUS.md) | Current deployment status and health |
| [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) | What has been implemented |
| [VERIFICATION_CHECKLIST.md](../VERIFICATION_CHECKLIST.md) | Verification checklist |

### 4. Development
| Location | Description |
|----------|-------------|
| [apps/backend/README.md](../apps/backend/README.md) | Backend development guide (if exists) |
| [apps/web/README.md](../apps/web/README.md) | Frontend development guide (if exists) |
| [apps/backend/tests/](../apps/backend/tests/) | Backend test suite |
| [apps/web/__tests__/](../apps/web/__tests__/) | Frontend test suite |

---

## 🏗️ Architecture Diagrams

### C4 Model Hierarchy

#### Level 1 - System Context
**File**: `architecture/c4-level1-context.puml`

Shows REST-OS in the context of:
- Users (Dispatchers, Operations Managers, Drivers)
- External systems (ELD, TMS, Telematics)

**Purpose**: Big picture understanding

---

#### Level 2 - Container
**File**: `architecture/c4-level2-container.puml`

Shows technology containers:
- Next.js 15 Frontend Dashboard
- FastAPI Backend API
- PostgreSQL Database
- Redis Cache

**Purpose**: Technology stack overview

---

#### Level 3 - Components

##### Backend Components
**File**: `architecture/c4-level3-component-backend.puml`

Shows backend internal structure:
- API Router and Endpoints
- HOS Rule Engine
- Rest Optimization Engine
- Prediction Engine
- Repositories (Driver, Vehicle, Route, Recommendation)

**Purpose**: Backend service architecture

##### Frontend Components
**File**: `architecture/c4-level3-component-frontend.puml`

Shows frontend internal structure:
- Dashboard Page Layout
- Control Panel (forms)
- Visualization Area (results)
- State Management (Zustand + React Query)
- API Client

**Purpose**: Frontend component hierarchy

---

#### Level 4 - Code

##### HOS Rule Engine
**File**: `architecture/c4-level4-code-hos-engine.puml`

Shows class-level structure:
- `HOSRuleEngine` class
- FMCSA regulation constants
- Compliance validation logic

**Purpose**: Detailed HOS implementation

##### Optimization Engine
**File**: `architecture/c4-level4-code-optimization-engine.puml`

Shows class-level structure:
- `RestOptimizationEngine` class
- Decision algorithm
- Rest type classification (FULL/PARTIAL/NO REST)

**Purpose**: Detailed optimization logic

---

### Additional Diagrams

#### Sequence Diagram
**File**: `architecture/sequence-rest-optimization.puml`

Shows complete end-to-end flow:
1. User input in dashboard
2. Form validation
3. API request
4. HOS validation
5. Prediction estimation
6. Optimization recommendation
7. Database persistence
8. UI update

**Purpose**: Runtime behavior understanding

---

#### Deployment Diagram
**File**: `architecture/deployment-diagram.puml`

Shows Docker infrastructure:
- 4 containers (PostgreSQL, Redis, Backend, Frontend)
- Docker network configuration
- Volume mounts
- Port mappings

**Purpose**: Infrastructure understanding

---

#### Data Flow Diagram
**File**: `architecture/data-flow-diagram.puml`

Shows data transformations:
- Input validation
- Processing pipeline
- Storage points (PostgreSQL, Redis)
- Output rendering

**Purpose**: Data pipeline understanding

---

## 🎯 Common Tasks

### View Architecture Diagrams

**Quick View (Online)**:
```bash
# Copy any .puml file content to:
http://www.plantuml.com/plantuml/uml/
```

**Render Locally**:
```bash
cd docs/architecture
./render-diagrams.sh
# Images will be in docs/architecture/output/
```

**VS Code Preview**:
1. Install PlantUML extension
2. Open any `.puml` file
3. Press `Alt + D` (or `Option + D` on Mac)

---

### Update Documentation

When making changes:

1. **Update relevant `.puml` files** for architecture changes
2. **Regenerate diagrams** using `./render-diagrams.sh`
3. **Update markdown docs** if structure changes
4. **Commit both source and generated files**

---

### Find Specific Information

**FMCSA HOS Regulations**:
- Constants: `apps/backend/app/core/constants.py`
- Implementation: `apps/backend/app/services/hos_rule_engine.py`
- Diagram: `architecture/c4-level4-code-hos-engine.puml`

**API Endpoints**:
- Code: `apps/backend/app/api/v1/endpoints/`
- Schemas: `apps/backend/app/api/v1/schemas/`
- Diagram: `architecture/c4-level3-component-backend.puml`

**Frontend Components**:
- Code: `apps/web/src/components/`
- Diagram: `architecture/c4-level3-component-frontend.puml`

**Database Models**:
- Code: `apps/backend/app/models/`
- Migrations: `apps/backend/app/db/migrations/versions/`
- Schema: Check PostgreSQL directly or Alembic migrations

**Docker Configuration**:
- Compose: `docker-compose.yml`
- Backend: `apps/backend/Dockerfile`
- Frontend: `apps/web/Dockerfile`
- Diagram: `architecture/deployment-diagram.puml`

---

## 📋 Key Documents by Role

### Software Developer
1. [QUICKSTART.md](../QUICKSTART.md) - Get started fast
2. [SETUP.md](../SETUP.md) - Detailed setup
3. [architecture/c4-level3-component-backend.puml](architecture/c4-level3-component-backend.puml) - Backend structure
4. [architecture/c4-level3-component-frontend.puml](architecture/c4-level3-component-frontend.puml) - Frontend structure

### Solutions Architect
1. [architecture/README.md](architecture/README.md) - Architecture overview
2. [specs/IMPLEMENTATION_PLAN.md](../specs/IMPLEMENTATION_PLAN.md) - Implementation plan
3. [architecture/c4-level1-context.puml](architecture/c4-level1-context.puml) - System context
4. [architecture/c4-level2-container.puml](architecture/c4-level2-container.puml) - Container architecture

### DevOps Engineer
1. [DEPLOY.md](./DEPLOY.md) - Deployment guide
2. [BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md) - Backend deployment
3. [DEPLOYMENT_STATUS.md](../DEPLOYMENT_STATUS.md) - Current status
4. [architecture/deployment-diagram.puml](architecture/deployment-diagram.puml) - Infrastructure
5. [docker-compose.yml](../docker-compose.yml) - Docker orchestration

### Product Manager
1. [README.md](../README.md) - Project overview
2. [specs/IMPLEMENTATION_PLAN.md](../specs/IMPLEMENTATION_PLAN.md) - Feature implementation
3. [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) - What's built
4. [architecture/sequence-rest-optimization.puml](architecture/sequence-rest-optimization.puml) - User flow

### QA Engineer
1. [VERIFICATION_CHECKLIST.md](../VERIFICATION_CHECKLIST.md) - Test checklist
2. [apps/backend/tests/](../apps/backend/tests/) - Backend tests
3. [apps/web/__tests__/](../apps/web/__tests__/) - Frontend tests
4. [DEPLOYMENT_STATUS.md](../DEPLOYMENT_STATUS.md) - Test environment status

---

## 🔗 External Resources

- **FMCSA HOS Regulations**: https://www.fmcsa.dot.gov/regulations/hours-service
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Next.js Documentation**: https://nextjs.org/docs
- **PlantUML Guide**: https://plantuml.com/
- **C4 Model**: https://c4model.com/
- **Turborepo Guide**: https://turbo.build/repo/docs

---

## 💡 Tips

1. **Start with the big picture**: Level 1 context diagram
2. **Drill down as needed**: Level 2 → 3 → 4
3. **Use sequence diagrams** to understand runtime behavior
4. **Keep diagrams in sync** with code changes
5. **Visualize before coding** to validate architectural decisions

---

## 📝 Contributing to Documentation

When adding new documentation:

1. **Follow existing structure**
2. **Update this INDEX.md** with links to new docs
3. **Use clear, concise language**
4. **Include code examples** where helpful
5. **Add diagrams** for complex concepts
6. **Keep it up-to-date** with code changes

---

## ❓ Questions or Feedback

For documentation improvements or questions:
- Open an issue in the repository
- Contact the development team
- Refer to inline code documentation

---

**Last Updated**: 2026-01-22
**Maintained By**: REST-OS Development Team

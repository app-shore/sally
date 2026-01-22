# REST-OS (Rest Optimization System)

Enterprise-grade platform for optimizing truck driver rest periods during dock time while maintaining FMCSA compliance.

## Overview

REST-OS is a decision-intelligence system that:
- Detects dock time and predicts post-load driving demand
- Evaluates Hours of Service (HOS) legal compliance
- Recommends optimal rest timing to maximize productive driving hours

## Architecture

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Package Manager**: UV
- **Database**: PostgreSQL with AsyncPG
- **Cache**: Redis
- **ORM**: SQLAlchemy 2.0 (async)

### Frontend
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **State Management**: Zustand + React Query
- **Styling**: Tailwind CSS + Shadcn/ui
- **Visualization**: Tremor + Recharts

## Project Structure

```
rest-os/
├── apps/
│   ├── backend/      # Python FastAPI backend
│   └── web/          # Next.js React dashboard
├── packages/         # Shared packages (future)
├── specs/            # Product specifications
├── turbo.json        # Turborepo configuration
├── package.json      # Root package.json
└── docker-compose.yml
```

## Quick Start

**👉 New to REST-OS? Start here: [QUICKSTART.md](./QUICKSTART.md)**

For detailed setup instructions, see **[SETUP.md](./SETUP.md)**.

### Prerequisites

- Python 3.11+
- Node.js 20+
- npm 10+ (comes with Node.js)
- PostgreSQL 16+
- Redis 7+
- UV package manager: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Docker (optional, recommended for local development)

### Quick Start with Docker

```bash
# Install root dependencies
npm install

# Copy environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local

# Start all services
docker-compose up -d

# Initialize database
docker-compose exec backend uv run alembic upgrade head

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Using Turborepo (Recommended for Development)

```bash
# Install root dependencies (Turborepo)
npm install

# Install all workspace dependencies
npm install --workspaces

# Set up environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
# Edit .env files with your configuration

# Run both backend and frontend in development mode
npm run dev

# Or run individually
npm run backend:dev  # Backend only
npm run frontend:dev # Frontend only
```

Access:
- Frontend Dashboard: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Using Docker (Recommended for Full Stack)

```bash
# Start all services (Postgres, Redis, Backend, Frontend)
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Manual Setup

#### Backend Setup

```bash
cd apps/backend

# Install dependencies
uv sync

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
uv run alembic upgrade head

# Seed database (optional)
uv run python scripts/db_seed.py

# Start development server
uv run fastapi dev app/main.py
```

Backend will be available at http://localhost:8000

#### Frontend Setup

```bash
cd apps/web

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

Frontend will be available at http://localhost:3000

## Core Components

### HOS Rule Engine
- Validates FMCSA Hours of Service compliance
- 11-hour driving limit
- 14-hour on-duty window
- 30-minute break requirement
- Sleeper berth split provisions (7/3, 8/2)

### Rest Optimization Engine
- Analyzes dock time vs. rest requirements
- Evaluates post-load driving demand
- Recommends optimal rest timing (FULL/PARTIAL/NO REST)
- Provides compliance-aware recommendations

### Prediction Engine
- Estimates post-load drive demand
- Considers appointment schedules
- Factors route characteristics

### Operations Dashboard
- Side-by-side control panel and visualization
- Real-time engine execution
- Compliance monitoring
- Results visualization with charts and metrics
- Execution history tracking

## Development

### Turborepo Commands

```bash
# Run all apps in development mode
npm run dev

# Build all apps
npm run build

# Run all tests
npm run test

# Run linting across all apps
npm run lint

# Type check all apps
npm run type-check

# Clean all build artifacts
npm run clean
```

### Backend Commands

```bash
cd apps/backend

# Run tests
uv run pytest tests/

# Run tests with coverage
uv run pytest --cov=app tests/

# Create database migration
uv run alembic revision --autogenerate -m "description"

# Apply migrations
uv run alembic upgrade head

# Format code
uv run black app/
uv run isort app/

# Type checking
uv run mypy app/
```

### Frontend Commands

```bash
cd apps/web

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build

# Type checking
npm run type-check

# Lint
npm run lint
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

### Backend (.env)

```bash
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql+asyncpg://rest_os_user:rest_os_password@localhost:5432/rest_os
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Testing

### Backend Testing
- Unit tests for business logic
- Integration tests for API endpoints
- Target: 80%+ coverage

### Frontend Testing
- Component tests with Jest + React Testing Library
- E2E tests with Playwright
- Target: 70%+ coverage

## Monorepo Structure

This project uses **Turborepo** for efficient monorepo management:

- **apps/backend** - FastAPI Python backend
- **apps/web** - Next.js frontend dashboard
- **packages/** - Shared packages (future: shared TypeScript types, utilities, etc.)

### Benefits of Turborepo

- **Parallel execution** - Run tasks across packages simultaneously
- **Smart caching** - Only rebuild what changed
- **Pipeline optimization** - Automatically handles task dependencies
- **Remote caching** - Share cache with CI/CD (optional)

## Contributing

See individual README files in `apps/backend/` and `apps/web/` directories for detailed contribution guidelines.

## License

Proprietary - All rights reserved

## Support

For issues and questions, please refer to the project documentation or contact the development team.

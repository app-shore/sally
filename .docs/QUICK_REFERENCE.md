# SALLY Quick Reference Card

## 🚀 Quick Commands

### Start Everything
```bash
npm run docker:up
# or
docker-compose up -d
```

### Stop Everything
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f              # All services
docker-compose logs -f backend      # Backend only
docker-compose logs -f frontend     # Frontend only
```

---

## 🌐 Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Operations Dashboard |
| **Backend API** | http://localhost:8000 | REST API |
| **API Docs** | http://localhost:8000/docs | Swagger UI |
| **Health Check** | http://localhost:8000/health | Backend health |
| **PostgreSQL** | localhost:5432 | Database |
| **Redis** | localhost:6379 | Cache |

---

## 📊 Visualize Architecture

### Method 1: Online (No Installation)
http://www.plantuml.com/plantuml/uml/
→ Copy any `.puml` file from `docs/architecture/`
→ Paste and view instantly

### Method 2: Command Line
```bash
cd docs/architecture
./render-diagrams.sh
open output/*.png
```

### Method 3: VS Code
1. Install PlantUML extension
2. Open `.puml` file
3. Press `Alt + D` (or `Option + D` on Mac)

---

## 📁 Key File Locations

### Configuration
- Docker: `docker-compose.yml`
- Backend: `apps/backend/pyproject.toml`
- Frontend: `apps/web/package.json`
- Environment: `.env` (create from `.env.example`)

### Code
- Backend API: `apps/backend/app/api/v1/endpoints/`
- Engines: `apps/backend/app/services/`
- Models: `apps/backend/app/models/`
- Frontend: `apps/web/src/`
- Components: `apps/web/src/components/`

### Documentation
- Master Guide: `DOCUMENTATION.md`
- Quick Start: `QUICKSTART.md`
- Product Specs: `.specs/README.md`
- Architecture: `.docs/INDEX.md`
- Setup: `.docs/SETUP.md`
- Deployment: `.docs/DEPLOY.md`

---

## 🔧 Database Commands

### Run Migrations
```bash
npm run db:migrate
# or
docker-compose exec backend uv run alembic upgrade head
```

### Create Migration
```bash
docker-compose exec backend uv run alembic revision --autogenerate -m "description"
```

### Check Migration Status
```bash
docker-compose exec backend uv run alembic current
```

### Seed Database
```bash
npm run db:seed
# or
docker-compose exec backend uv run python scripts/db_seed.py
```

---

## 🧪 Testing

### Backend Tests
```bash
docker-compose exec backend uv run pytest tests/ -v
docker-compose exec backend uv run pytest --cov=app tests/
```

### Frontend Tests
```bash
cd apps/web
npm test                    # Unit tests
npm run test:e2e           # E2E tests
```

---

## 🏗️ Architecture Diagrams

| Diagram | File | Shows |
|---------|------|-------|
| **Context** | `c4-level1-context.puml` | Users & external systems |
| **Container** | `c4-level2-container.puml` | Tech stack |
| **Backend** | `c4-level3-component-backend.puml` | Services & APIs |
| **Frontend** | `c4-level3-component-frontend.puml` | UI components |
| **HOS Engine** | `c4-level4-code-hos-engine.puml` | HOS validation |
| **Optimization** | `c4-level4-code-optimization-engine.puml` | Rest algorithm |
| **Sequence** | `sequence-rest-optimization.puml` | Request flow |
| **Deployment** | `deployment-diagram.puml` | Docker setup |
| **Data Flow** | `data-flow-diagram.puml` | Data pipeline |

All in: `docs/architecture/`

---

## 🔍 Troubleshooting

### Container Not Starting
```bash
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up -d
```

### Check Container Health
```bash
docker-compose ps
docker-compose logs backend --tail=50
```

### Reset Database
```bash
docker-compose down
docker volume rm sally_postgres_data
docker-compose up -d
npm run db:migrate
```

### Frontend Build Issues
```bash
cd apps/web
rm -rf node_modules .next
npm install --legacy-peer-deps
```

---

## 📦 Technology Stack

### Backend
- Python 3.11 + FastAPI
- PostgreSQL 16
- Redis 7
- SQLAlchemy 2.0 (async)
- UV package manager

### Frontend
- Next.js 15 + React 18
- TypeScript
- Tailwind CSS + Shadcn/ui
- Zustand + React Query
- Tremor + Recharts

### Infrastructure
- Docker + Docker Compose
- Turborepo (monorepo)
- Uvicorn (ASGI server)

---

## 🎯 Common Tasks

### Add New API Endpoint
1. Create endpoint in `apps/backend/app/api/v1/endpoints/`
2. Add schemas in `apps/backend/app/api/v1/schemas/`
3. Update router in `apps/backend/app/api/v1/router.py`
4. Update architecture diagram

### Add New React Component
1. Create in `apps/web/src/components/`
2. Import in parent component
3. Add to `index.ts` if needed
4. Update component diagram

### Update Database Schema
1. Modify model in `apps/backend/app/models/`
2. Create migration: `alembic revision --autogenerate -m "description"`
3. Review migration in `migrations/versions/`
4. Apply: `npm run db:migrate`

### Update Architecture Diagram
1. Edit relevant `.puml` file in `docs/architecture/`
2. Preview in VS Code or online
3. Render: `./render-diagrams.sh`
4. Commit both `.puml` and `.png`

---

## 📊 Database Schema

### Route Planning Tables (Primary)
- **route_plans**: Complete route plans with metadata
- **route_segments**: Individual segments (drive, rest, fuel, dock)
- **route_plan_updates**: Update history and versioning
- **stops**: Stop definitions with time windows

### Supporting Tables
- **drivers**: Driver HOS status and info
- **vehicles**: Vehicle tracking data
- **events**: Event logging
- **recommendations**: Rest recommendation history (legacy)

### Credentials
- Database: `rest_os`
- User: `rest_os_user`
- Password: `rest_os_password`
- Host: `localhost` (or `postgres` inside Docker)
- Port: `5432`

---

## 🔐 Environment Variables

### Backend (.env)
```bash
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql+asyncpg://rest_os_user:rest_os_password@postgres:5432/rest_os
REDIS_URL=redis://redis:6379/0
CORS_ORIGINS=http://localhost:3000
SECRET_KEY=your-secret-key-here
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🎨 HOS Regulations (FMCSA)

| Rule | Value | Constant |
|------|-------|----------|
| Max driving hours | 11 hours | `MAX_DRIVE_HOURS` |
| Max on-duty hours | 14 hours | `MAX_DUTY_HOURS` |
| Required break | 30 minutes | `REQUIRED_BREAK_MINUTES` |
| Break trigger | 8 hours | `BREAK_TRIGGER_HOURS` |
| Minimum rest | 10 hours | `MIN_REST_HOURS` |
| Sleeper berth long | 8 hours | `SLEEPER_BERTH_SPLIT_LONG` |
| Sleeper berth short | 2 hours | `SLEEPER_BERTH_SPLIT_SHORT` |

Defined in: `apps/backend/app/core/constants.py`

---

## 📝 API Endpoints

### Route Planning (Primary)
```bash
# Plan a complete route
POST /api/v1/routes/plan
{
  "driver": {
    "id": "DRV-001",
    "hours_driven": 5.0,
    "on_duty_time": 6.0,
    "hours_since_break": 4.0
  },
  "vehicle": {
    "id": "TRUCK-001",
    "fuel_level_percent": 75,
    "mpg": 6.5
  },
  "stops": [
    {"id": "STOP-1", "name": "Origin", "is_origin": true},
    {"id": "STOP-2", "name": "Customer A", "estimated_dock_hours": 2.0},
    {"id": "STOP-3", "name": "Destination", "is_destination": true}
  ]
}

# Update route with trigger
POST /api/v1/routes/update
{
  "plan_id": "uuid",
  "trigger_type": "DOCK_TIME_CHANGED",
  "current_location": "Customer A",
  "actual_dock_hours": 4.0
}

# Get route status
GET /api/v1/routes/{plan_id}

# Get monitoring status
GET /api/v1/routes/{plan_id}/monitoring
```

### Component Endpoints (Called by Route Planner)
```bash
# HOS validation
POST /api/v1/hos/validate
{
  "driver_id": "DRV-001",
  "hours_driven": 8.5,
  "on_duty_time": 10.0,
  "hours_since_break": 6.0
}

# REST optimization
POST /api/v1/rest/recommend
{
  "driver_id": "DRV-001",
  "hours_driven": 8.5,
  "on_duty_time": 10.0,
  "dock_duration_hours": 3.0,
  "remaining_route": {
    "total_distance_miles": 150,
    "estimated_drive_hours": 2.5
  }
}

# Fuel stop finding
POST /api/v1/fuel/find-stops
{
  "current_location": {"lat": 34.0, "lng": -118.0},
  "remaining_distance": 500,
  "fuel_remaining_percent": 25
}
```

---

## 💻 Development Workflow

1. **Start services**: `npm run docker:up`
2. **Check health**: Visit http://localhost:8000/health
3. **Open dashboard**: Visit http://localhost:3000
4. **Make changes**: Edit code in `apps/`
5. **Hot reload**: Changes auto-reload
6. **Run tests**: Use commands above
7. **Commit**: Git commit with descriptive message
8. **Update docs**: If architecture changed

---

## 📚 Documentation Hierarchy

```
sally/
├── README.md                   # Project overview
├── QUICKSTART.md              # 5-minute guide
├── DOCUMENTATION.md           # Master navigation
│
├── .specs/                    # Product Specifications
│   ├── README.md             # Specs index
│   ├── blueprint.md          # Product vision
│   ├── ROUTE_PLANNING_SPEC.md # Technical spec
│   └── INTELLIGENT_OPTIMIZATION_FORMULA.md
│
└── .docs/                     # Technical Documentation
    ├── INDEX.md              # Architecture index
    ├── SETUP.md              # Setup guide
    ├── DEPLOY.md             # Deployment guide
    ├── QUICK_REFERENCE.md    # This file
    ├── C4_MODEL_SUMMARY.md
    └── architecture/         # 9 PlantUML diagrams
```

---

## 🆘 Help & Resources

### Documentation
- **Quick Start**: `QUICKSTART.md`
- **Master Guide**: `DOCUMENTATION.md`
- **Product Specs**: `.specs/README.md`
- **Setup Guide**: `.docs/SETUP.md`
- **Architecture**: `.docs/architecture/README.md`
- **API Docs**: http://localhost:8000/docs

### External Resources
- **FMCSA HOS**: https://www.fmcsa.dot.gov/regulations/hours-service
- **FastAPI**: https://fastapi.tiangolo.com/
- **Next.js**: https://nextjs.org/docs
- **PlantUML**: https://plantuml.com/

### Troubleshooting
- Check `SETUP.md` troubleshooting section
- View container logs: `docker-compose logs`
- Check deployment status: `DEPLOYMENT_STATUS.md`

---

**Last Updated**: 2026-01-23
**Product**: SALLY Route Planning Platform
**Quick Reference**: Keep this handy!

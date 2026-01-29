# Backend Deployment Guide

**Deploy either NestJS or Python backend to CapRover on the same `sally-api` app**

---

## Overview

You have two backend options that deploy to the **same CapRover app** (`sally-api`):
- **NestJS** (current/primary) - Deploy from root
- **Python** (future/legacy) - Deploy from apps/backend-py

Both use the same database and can be switched anytime by deploying the other.

---

## Prerequisites

- CapRover server running
- PostgreSQL database: `sally-db` (one-time setup)
- Redis cache: `sally-cache` (one-time setup)
- CapRover CLI: `npm install -g caprover`

---

## Deploy NestJS Backend (Current)

### From Project Root

```bash
# Login to CapRover (first time only)
caprover login

# Deploy NestJS
caprover deploy -a sally-api

# Or with saved settings
caprover deploy -a sally-api --default
```

### Environment Variables

Dashboard → Apps → **sally-api** → App Configs → Environment Variables:

```bash
# Database (Prisma format)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@srv-captain--sally-db:5432/postgres

# Redis
REDIS_URL=redis://srv-captain--sally-cache:6379/0

# App Config
NODE_ENV=production
PORT=8000

# CORS
CORS_ORIGINS=https://your-app.vercel.app
```

### Run Migrations

Dashboard → Apps → **sally-api** → Deployment → Execute Command:

```bash
npx prisma migrate deploy
```

### Verify

- Health: `https://sally-api.captain.your-domain.com/health`
- API Docs: `https://sally-api.captain.your-domain.com/api/docs`

---

## Deploy Python Backend (Alternative)

### From apps/backend-py Directory

```bash
# Navigate to Python backend
cd apps/backend-py

# Login to CapRover
caprover login

# Deploy Python
caprover deploy -a sally-api
```

### Environment Variables

Dashboard → Apps → **sally-api** → App Configs → Environment Variables:

```bash
# Database (SQLAlchemy format)
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@srv-captain--sally-db:5432/postgres

# Redis
REDIS_URL=redis://srv-captain--sally-cache:6379/0

# App Config
ENVIRONMENT=production
LOG_LEVEL=INFO

# CORS
CORS_ORIGINS=https://your-app.vercel.app
```

### Run Migrations

Dashboard → Apps → **sally-api** → Deployment → Execute Command:

```bash
cd /app && uv run alembic upgrade head
```

### Verify

- Health: `https://sally-api.captain.your-domain.com/health`
- API Docs: `https://sally-api.captain.your-domain.com/docs`

---

## File Structure

```
sally/
├── captain-definition          # Deploys NestJS (points to apps/backend/Dockerfile)
├── apps/
│   ├── backend/
│   │   └── Dockerfile          # NestJS Dockerfile
│   └── backend-py/
│       ├── captain-definition  # Deploys Python (points to ./Dockerfile)
│       └── Dockerfile          # Python Dockerfile
```

---

## Switching Between Backends

Both deploy to the **same CapRover app** (`sally-api`), so switching is simple:

### Switch to NestJS
```bash
# From project root
caprover deploy -a sally-api
```

### Switch to Python
```bash
# From apps/backend-py
cd apps/backend-py
caprover deploy -a sally-api
```

**Frontend:** No code changes needed! Both backends use the same API URL.

---

## Key Differences

| Aspect | NestJS | Python |
|--------|--------|--------|
| **Deploy from** | Project root | apps/backend-py |
| **Framework** | NestJS | FastAPI |
| **ORM** | Prisma | SQLAlchemy |
| **Database URL Format** | `postgresql://...` | `postgresql+asyncpg://...` |
| **Migrations** | `npx prisma migrate deploy` | `uv run alembic upgrade head` |
| **API Docs** | `/api/docs` | `/docs` |

---

## Frontend Configuration

No changes needed! Both backends use the same URL:

```bash
NEXT_PUBLIC_API_URL=https://sally-api.captain.your-domain.com
```

Or with custom domain:
```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

---

## Enable HTTPS & Custom Domain

Dashboard → Apps → **sally-api** → HTTP Settings:

1. **Enable HTTPS** ✓
2. **Force HTTPS** ✓
3. **Connect New Domain** (optional):
   - Domain: `api.your-domain.com`
   - Enable HTTPS ✓

---

## Quick Commands

### Deploy
```bash
# NestJS (from root)
caprover deploy -a sally-api

# Python (from apps/backend-py)
cd apps/backend-py && caprover deploy -a sally-api
```

### Logs
```bash
caprover apps:logs -a sally-api -f
```

### Restart
```bash
caprover apps:restart -a sally-api
```

---

## Troubleshooting

### Build Fails
```bash
# Check logs
caprover apps:logs -a sally

# Verify captain-definition exists
ls captain-definition              # For NestJS (root)
ls apps/backend-py/captain-definition  # For Python
```

### Database Connection Fails
- Verify `DATABASE_URL` format matches backend type
- Check PostgreSQL password is correct
- Ensure PostgreSQL app (`sally-db`) is running

### Wrong Backend Running
```bash
# Check which backend is deployed
caprover apps:logs -a sally-api | head -20

# NestJS will show: "Nest application successfully started"
# Python will show: "Uvicorn running on..."
```

---

## Production Checklist

- [ ] PostgreSQL database deployed (`sally-db`)
- [ ] Redis cache deployed (`sally-cache`)
- [ ] Environment variables configured
- [ ] HTTPS enabled and forced
- [ ] Database migrations run
- [ ] Health endpoint returns 200
- [ ] API documentation accessible
- [ ] CORS configured for frontend URL

---

## Summary

**Same App, Two Options:**
- Deploy **NestJS** from root: `caprover deploy -a sally-api`
- Deploy **Python** from backend-py: `cd apps/backend-py && caprover deploy -a sally-api`

**Frontend:** Always uses same URL, no changes needed when switching backends.

**Migration Strategy:**
1. Start with NestJS (current)
2. Switch to Python if needed (future)
3. No downtime - just redeploy

---

**Done!** Your backend is deployed at `https://sally-api.captain.your-domain.com` 🚀

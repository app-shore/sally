# REST-OS Setup Guide

Complete setup instructions for the REST-OS (Rest Optimization System) project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Manual Setup](#manual-setup)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: 20.0.0 or higher
  ```bash
  node --version  # Should be v20.x.x or higher
  ```

- **npm**: 10.0.0 or higher (comes with Node.js)
  ```bash
  npm --version   # Should be 10.x.x or higher
  ```

- **Python**: 3.11 or higher
  ```bash
  python --version  # Should be 3.11.x or higher
  ```

- **UV Package Manager**: Latest version
  ```bash
  # Install UV
  curl -LsSf https://astral.sh/uv/install.sh | sh

  # Verify installation
  uv --version
  ```

- **Docker & Docker Compose** (for Docker setup)
  ```bash
  docker --version
  docker-compose --version
  ```

- **PostgreSQL**: 16 or higher (for manual setup)
- **Redis**: 7 or higher (for manual setup)

### Optional Tools

- **Git**: For version control
- **VS Code**: Recommended IDE
- **Postman**: For API testing

---

## Quick Start (Docker)

The fastest way to get REST-OS running is with Docker Compose.

### Step 1: Clone and Navigate

```bash
cd rest-os
```

### Step 2: Set Up Environment Files

```bash
# Backend environment
cp apps/backend/.env.example apps/backend/.env

# Frontend environment
cp apps/web/.env.example apps/web/.env.local
```

### Step 3: Install Root Dependencies

```bash
# Install Turborepo and root workspace dependencies
npm install
```

### Step 4: Start All Services

```bash
# Start PostgreSQL, Redis, Backend, and Frontend
docker-compose up -d

# View logs
docker-compose logs -f
```

### Step 5: Initialize Database

```bash
# Run migrations
docker-compose exec backend uv run alembic upgrade head

# Seed database with sample data (optional)
docker-compose exec backend uv run python scripts/db_seed.py
```

### Step 6: Access Applications

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API Docs (ReDoc)**: http://localhost:8000/redoc

**You're done!** Skip to [Verification](#verification).

---

## Manual Setup

If you prefer to run services without Docker:

### Part 1: Database Setup

#### PostgreSQL

```bash
# macOS (with Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16
sudo systemctl start postgresql

# Create database and user
psql postgres
CREATE DATABASE rest_os;
CREATE USER rest_os_user WITH PASSWORD 'rest_os_password';
GRANT ALL PRIVILEGES ON DATABASE rest_os TO rest_os_user;
\q
```

#### Redis

```bash
# macOS (with Homebrew)
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis
```

### Part 2: Backend Setup

```bash
cd apps/backend

# Install dependencies with UV
uv sync --extra dev

# Set up environment
cp .env.example .env

# Edit .env and set DATABASE_URL and REDIS_URL
# DATABASE_URL=postgresql+asyncpg://rest_os_user:rest_os_password@localhost:5432/rest_os
# REDIS_URL=redis://localhost:6379/0

# Run database migrations
uv run alembic upgrade head

# Seed database (optional)
uv run python scripts/db_seed.py

# Start development server
uv run fastapi dev app/main.py
```

Backend will be available at http://localhost:8000

### Part 3: Frontend Setup

Open a new terminal:

```bash
cd apps/web

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Edit .env.local and set NEXT_PUBLIC_API_URL
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```

Frontend will be available at http://localhost:3000

### Part 4: Turborepo (Optional)

From the root directory, you can use Turborepo to run both apps:

```bash
# From project root
npm install

# Run both backend and frontend
npm run dev
```

---

## Verification

### 1. Backend Health Check

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "environment": "development",
  "version": "0.1.0"
}
```

### 2. API Documentation

Visit http://localhost:8000/docs

You should see the Swagger UI with all API endpoints.

### 3. Test HOS Compliance Endpoint

```bash
curl -X POST http://localhost:8000/api/v1/hos-rules/check \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "TEST-001",
    "hours_driven": 8.5,
    "on_duty_time": 10.0,
    "hours_since_break": 6.0
  }'
```

Expected: JSON response with compliance status.

### 4. Test Optimization Endpoint

```bash
curl -X POST http://localhost:8000/api/v1/optimization/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "TEST-001",
    "hours_driven": 8.5,
    "on_duty_time": 10.0,
    "hours_since_break": 6.0,
    "dock_duration_hours": 12.0,
    "remaining_distance_miles": 150.0,
    "destination": "Miami, FL"
  }'
```

Expected: JSON response with rest recommendation.

### 5. Frontend Verification

1. Navigate to http://localhost:3000
2. Fill out the form with sample data
3. Click "Run Engine"
4. Verify recommendation displays correctly

### 6. Run Tests

Backend tests:
```bash
cd apps/backend
uv run pytest tests/
```

Expected: All tests pass.

---

## Troubleshooting

### Common Issues

#### Issue: "Port 8000 already in use"

**Solution:**
```bash
# Find process using port 8000
lsof -ti:8000

# Kill the process
kill -9 <PID>

# Or change the port in .env
```

#### Issue: "Database connection failed"

**Solution:**
```bash
# Verify PostgreSQL is running
pg_isready

# Check connection string in .env
# Ensure user, password, and database name are correct
```

#### Issue: "Redis connection failed"

**Solution:**
```bash
# Verify Redis is running
redis-cli ping

# Should return: PONG
```

#### Issue: "UV command not found"

**Solution:**
```bash
# Re-install UV
curl -LsSf https://astral.sh/uv/install.sh | sh

# Add to PATH (if needed)
export PATH="$HOME/.local/bin:$PATH"
```

#### Issue: "Next.js can't connect to backend"

**Solution:**
```bash
# Verify NEXT_PUBLIC_API_URL in apps/web/.env.local
# Should be: http://localhost:8000

# Verify backend is running
curl http://localhost:8000/health
```

#### Issue: "Alembic migration failed"

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
cd apps/backend

# Drop and recreate database
dropdb rest_os
createdb rest_os

# Run migrations again
uv run alembic upgrade head
```

#### Issue: "Frontend build errors"

**Solution:**
```bash
cd apps/web

# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### Docker-Specific Issues

#### Issue: "docker-compose up fails"

**Solution:**
```bash
# Stop all containers
docker-compose down

# Remove volumes
docker-compose down -v

# Rebuild and restart
docker-compose up --build -d
```

#### Issue: "Backend container keeps restarting"

**Solution:**
```bash
# Check logs
docker-compose logs backend

# Common causes:
# 1. Database not ready - wait a few seconds
# 2. Environment variables missing - check .env file
# 3. Port conflict - change port in docker-compose.yml
```

### Getting Help

If you encounter issues not covered here:

1. Check the logs:
   ```bash
   # Docker logs
   docker-compose logs -f

   # Backend logs (manual setup)
   # Visible in terminal where backend is running

   # Frontend logs (manual setup)
   # Visible in terminal where frontend is running
   ```

2. Verify environment variables in `.env` files

3. Ensure all prerequisites are installed correctly

4. Check GitHub issues or create a new one

---

## Next Steps

After successful setup:

1. **Explore the API**: Visit http://localhost:8000/docs
2. **Test the Dashboard**: Use the web interface at http://localhost:3000
3. **Review Documentation**: See individual README files in `apps/backend` and `apps/web`
4. **Run Tests**: Execute test suites to verify everything works
5. **Develop Features**: Start building on the scaffolding

---

## Development Workflow

### Recommended Development Flow

```bash
# Terminal 1: Backend
cd apps/backend
uv run fastapi dev app/main.py

# Terminal 2: Frontend
cd apps/web
npm run dev

# Terminal 3: Tests/commands
cd apps/backend
uv run pytest tests/ --watch
```

### Using Turborepo (Alternative)

```bash
# From project root - runs both apps in parallel
npm run dev
```

### Code Quality Checks

```bash
# Backend
cd apps/backend
uv run black app/
uv run isort app/
uv run mypy app/
uv run pytest tests/

# Frontend
cd apps/web
npm run lint
npm run type-check
npm run test
```

---

## Production Deployment

For production deployment guidance:

1. Use Docker Compose in production mode
2. Set `ENVIRONMENT=production` in backend `.env`
3. Set `NODE_ENV=production` for frontend
4. Use strong `SECRET_KEY` in backend `.env`
5. Configure proper CORS origins
6. Set up SSL/TLS certificates
7. Use managed PostgreSQL and Redis services
8. Enable monitoring and logging
9. Configure backups

See individual app READMEs for detailed production deployment instructions.

---

## Summary

You now have a fully functional REST-OS development environment with:

✅ FastAPI backend with HOS Rule Engine, Rest Optimization, and Prediction engines
✅ Next.js dashboard with real-time visualization
✅ PostgreSQL database with sample data
✅ Redis caching layer
✅ Comprehensive testing infrastructure
✅ Docker containerization
✅ Turborepo monorepo setup

Happy coding! 🚀

# REST-OS Quick Start Guide

Get REST-OS up and running in under 5 minutes!

## Prerequisites Check

Before starting, verify you have:

```bash
# Check Node.js version (need 20+)
node --version

# Check npm version (need 10+)
npm --version

# Check Python version (need 3.11+)
python3 --version

# Check UV is installed
uv --version

# Check Docker (optional but recommended)
docker --version
docker-compose --version
```

If any are missing, see [SETUP.md](./SETUP.md) for installation instructions.

## Option 1: Automated Installation (Recommended)

```bash
# Run the automated installation script
./install.sh

# Start all services with Docker
npm run docker:up

# Initialize database
npm run db:migrate

# (Optional) Add sample data
npm run db:seed
```

**Done!** Open http://localhost:3000 in your browser.

## Option 2: Manual Installation

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd apps/backend
uv sync
cd ../..

# Install frontend dependencies
cd apps/web
npm install
cd ../..
```

### Step 2: Set Up Environment

```bash
# Copy environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local

# No edits needed for local development - defaults work!
```

### Step 3: Start Services

**With Docker (Recommended):**

```bash
# Start PostgreSQL, Redis, Backend, Frontend
docker-compose up -d

# Initialize database
docker-compose exec backend uv run alembic upgrade head

# View logs
docker-compose logs -f
```

**Without Docker:**

Terminal 1 - Start PostgreSQL and Redis (if not already running):
```bash
# macOS with Homebrew
brew services start postgresql@16
brew services start redis

# Linux
sudo systemctl start postgresql
sudo systemctl start redis
```

Terminal 2 - Backend:
```bash
cd apps/backend
uv run fastapi dev app/main.py
```

Terminal 3 - Frontend:
```bash
cd apps/web
npm run dev
```

## Access the Application

Once running, access:

- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **API (ReDoc)**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Test the Dashboard

1. Open http://localhost:3000
2. You'll see the side-by-side dashboard:
   - **Left panel**: Control inputs
   - **Right panel**: Results visualization

3. Try the pre-filled example:
   - Driver ID: DRV-001
   - Hours Driven: 8.5
   - On-Duty Time: 10
   - Hours Since Break: 6
   - Dock Duration: 12 hours
   - Remaining Distance: 150 miles

4. Click **"Run Engine"**

5. You should see:
   - A color-coded recommendation (🟢 Full Rest, 🟡 Partial Rest, or 🔵 No Rest)
   - Compliance status
   - Detailed reasoning
   - Execution history

## Test the API

### Using curl

```bash
# Health check
curl http://localhost:8000/health

# HOS compliance check
curl -X POST http://localhost:8000/api/v1/hos-rules/check \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "TEST-001",
    "hours_driven": 8.5,
    "on_duty_time": 10.0,
    "hours_since_break": 6.0
  }'

# Rest optimization
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

### Using Swagger UI

Visit http://localhost:8000/docs and try the interactive API documentation!

## Useful Commands

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Restart services
npm run docker:restart

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Run backend tests
npm run backend:test

# Run just backend in dev mode
npm run backend:dev

# Run just frontend in dev mode
npm run frontend:dev

# Run both with Turborepo
npm run dev
```

## Troubleshooting

### "Port already in use"

```bash
# Find what's using the port
lsof -ti:8000  # For backend
lsof -ti:3000  # For frontend

# Kill the process
kill -9 <PID>
```

### "Can't connect to database"

```bash
# Verify PostgreSQL is running
docker-compose ps  # If using Docker

# Or check system service
pg_isready  # If running locally
```

### "TypeScript errors in IDE"

This is normal before installing dependencies. Run:

```bash
cd apps/web
npm install
```

The errors will disappear after installation.

### Frontend can't reach backend

1. Check backend is running: `curl http://localhost:8000/health`
2. Check NEXT_PUBLIC_API_URL in `apps/web/.env.local`
3. Restart frontend: `docker-compose restart frontend`

### "uv: command not found"

Install UV:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Then restart your terminal.

## What's Next?

Now that you're up and running:

1. **Explore the API**: Try different inputs in the dashboard
2. **Check the Code**: Browse the well-documented source code
3. **Run Tests**: `npm run backend:test`
4. **Read the Docs**: See [SETUP.md](./SETUP.md) for detailed information
5. **Start Developing**: Build new features on this foundation!

## Sample Test Scenarios

### Scenario 1: Driver Near Limit
- Hours Driven: 10.5
- On-Duty Time: 13
- Hours Since Break: 7
- Expected: Warning status, approaching limits

### Scenario 2: Driver Exceeded Limits
- Hours Driven: 12
- On-Duty Time: 15
- Hours Since Break: 12
- Expected: Non-compliant, full rest required

### Scenario 3: Optimal Rest at Dock
- Hours Driven: 8.5
- On-Duty Time: 10
- Dock Duration: 12 hours
- Remaining Distance: 150 miles
- Expected: Full rest recommendation

### Scenario 4: Short Dock, No Rest Needed
- Hours Driven: 5
- On-Duty Time: 7
- Dock Duration: 2 hours
- Remaining Distance: 400 miles
- Expected: No rest recommendation

## Getting Help

- **Detailed Setup**: See [SETUP.md](./SETUP.md)
- **Implementation Details**: See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Backend Docs**: See [apps/backend/README.md](apps/backend/README.md)
- **Frontend Docs**: See [apps/web/README.md](apps/web/README.md)

## Success! 🎉

You now have REST-OS running locally. The dashboard is ready for testing the optimization engines, and the API is fully functional.

Happy optimizing! 🚛💤

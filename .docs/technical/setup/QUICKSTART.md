# SALLY Quick Start Guide

**Get SALLY (Route Planning Platform) up and running in under 5 minutes!**

---

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

If any are missing, see [.docs/SETUP.md](./.docs/SETUP.md) for installation instructions.

---

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

---

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

---

## Access the Application

Once running, access:

- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **API (ReDoc)**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

---

## Test the Route Planning API

### Scenario 1: Plan a Simple 3-Stop Route

```bash
curl -X POST http://localhost:8000/api/v1/routes/plan \
  -H "Content-Type: application/json" \
  -d '{
    "driver": {
      "id": "DRV-001",
      "hours_driven": 5.0,
      "on_duty_time": 6.0,
      "hours_since_break": 4.0
    },
    "vehicle": {
      "id": "TRUCK-001",
      "fuel_level_percent": 75,
      "fuel_capacity_gallons": 150,
      "mpg": 6.5
    },
    "stops": [
      {
        "id": "STOP-1",
        "name": "Origin Warehouse",
        "location_type": "warehouse",
        "is_origin": true
      },
      {
        "id": "STOP-2",
        "name": "Customer A",
        "location_type": "customer",
        "estimated_dock_hours": 2.0
      },
      {
        "id": "STOP-3",
        "name": "Customer B",
        "location_type": "customer",
        "estimated_dock_hours": 1.5
      },
      {
        "id": "STOP-4",
        "name": "Final Destination",
        "location_type": "warehouse",
        "is_destination": true
      }
    ],
    "optimization_goal": "minimize_time"
  }'
```

**Expected Response:**
```json
{
  "plan_id": "uuid",
  "optimized_stop_sequence": [1, 2, 3, 4],
  "segments": [
    {
      "type": "drive",
      "from": "Origin Warehouse",
      "to": "Customer A",
      "distance_miles": 120,
      "duration_hours": 2.0
    },
    {
      "type": "dock",
      "location": "Customer A",
      "duration_hours": 2.0
    },
    {
      "type": "drive",
      "from": "Customer A",
      "to": "Customer B",
      "distance_miles": 85,
      "duration_hours": 1.4
    },
    ...
  ],
  "total_distance": 305,
  "total_time_hours": 12.5,
  "hos_compliant": true,
  "feasibility": "FEASIBLE"
}
```

---

### Scenario 2: Route with HOS Constraint (REST Stop Inserted)

```bash
curl -X POST http://localhost:8000/api/v1/routes/plan \
  -H "Content-Type: application/json" \
  -d '{
    "driver": {
      "id": "DRV-002",
      "hours_driven": 8.5,
      "on_duty_time": 11.0,
      "hours_since_break": 7.0
    },
    "vehicle": {
      "id": "TRUCK-002",
      "fuel_level_percent": 60,
      "fuel_capacity_gallons": 150,
      "mpg": 6.5
    },
    "stops": [
      {
        "id": "STOP-1",
        "name": "Current Location",
        "location_type": "warehouse",
        "is_origin": true
      },
      {
        "id": "STOP-2",
        "name": "Customer C",
        "location_type": "customer",
        "estimated_dock_hours": 3.0
      },
      {
        "id": "STOP-3",
        "name": "Customer D",
        "location_type": "customer",
        "estimated_dock_hours": 2.0
      }
    ],
    "optimization_goal": "minimize_time"
  }'
```

**Expected Response:**
```json
{
  "plan_id": "uuid",
  "segments": [
    {
      "type": "drive",
      "from": "Current Location",
      "to": "Customer C",
      "distance_miles": 45,
      "duration_hours": 0.75
    },
    {
      "type": "dock",
      "location": "Customer C",
      "duration_hours": 3.0
    },
    {
      "type": "rest",
      "location": "Customer C (Leveraged Dock)",
      "rest_type": "FULL_REST",
      "duration_hours": 10.0,
      "reason": "HOS 14h duty window approaching. Leveraging dock time for mandatory rest."
    },
    {
      "type": "drive",
      "from": "Customer C",
      "to": "Customer D",
      "distance_miles": 120,
      "duration_hours": 2.0
    },
    ...
  ],
  "total_time_hours": 18.5,
  "hos_compliant": true,
  "feasibility": "FEASIBLE",
  "rest_stops_inserted": 1
}
```

**Key Insight:** The route planner detected HOS shortfall and automatically:
1. Called the REST Optimization Engine
2. Leveraged the dock time at Customer C for mandatory rest
3. Inserted a 10-hour full rest period
4. Updated the route to be HOS compliant

---

### Scenario 3: Dynamic Update (Dock Took Longer)

```bash
# First, plan a route (use Scenario 1)
# Get the plan_id from the response

# Then, report a dock delay
curl -X POST http://localhost:8000/api/v1/routes/update \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "uuid-from-previous-response",
    "trigger_type": "DOCK_TIME_CHANGED",
    "current_location": "Customer A",
    "actual_dock_hours": 4.0,
    "estimated_dock_hours": 2.0
  }'
```

**Expected Response:**
```json
{
  "update_id": "uuid",
  "plan_id": "uuid",
  "action": "RE_PLAN",
  "reason": "Dock time increased by 2 hours (threshold exceeded). Re-planning remaining route.",
  "new_plan_version": 2,
  "eta_changes": {
    "Customer B": "+2.0 hours",
    "Final Destination": "+2.0 hours"
  },
  "new_segments": [...]
}
```

---

## Test Other Components

### HOS Compliance Check (Used by Route Planner)

```bash
curl -X POST http://localhost:8000/api/v1/hos/validate \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "DRV-001",
    "hours_driven": 8.5,
    "on_duty_time": 10.0,
    "hours_since_break": 6.0
  }'
```

### REST Optimization (Called by Route Planner)

```bash
curl -X POST http://localhost:8000/api/v1/rest/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "DRV-001",
    "hours_driven": 8.5,
    "on_duty_time": 10.0,
    "hours_since_break": 6.0,
    "dock_duration_hours": 12.0,
    "remaining_route": {
      "total_distance_miles": 150,
      "estimated_drive_hours": 2.5
    }
  }'
```

---

## Using Swagger UI

Visit http://localhost:8000/docs for interactive API documentation!

**Primary Endpoints:**
1. **Route Planning** - `/api/v1/routes/plan` (START HERE)
2. **Dynamic Updates** - `/api/v1/routes/update`
3. **Route Status** - `/api/v1/routes/{plan_id}`
4. **HOS Validation** - `/api/v1/hos/validate` (Component)
5. **REST Optimization** - `/api/v1/rest/recommend` (Component)

---

## Test the Dashboard

1. Open http://localhost:3000
2. Navigate to **Route Planning** page
3. Try the route planning workflow:
   - **Step 1:** Enter driver HOS state
   - **Step 2:** Enter vehicle fuel level
   - **Step 3:** Add stops (origin, waypoints, destination)
   - **Step 4:** Click **"Plan Route"**
   - **Step 5:** View optimized route with:
     - Stop sequence
     - Drive segments
     - Rest stops (if inserted)
     - Fuel stops (if needed)
     - HOS compliance status

---

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

---

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

---

## What's Next?

Now that you're up and running:

1. **Plan Your First Route**: Use the dashboard or API
2. **Test Dynamic Updates**: Simulate dock delays and load changes
3. **Explore HOS Compliance**: See how the system prevents violations
4. **Read the Specs**: See [.specs/README.md](./.specs/README.md) for complete documentation
5. **View Architecture**: See [.docs/INDEX.md](./.docs/INDEX.md) for C4 diagrams

---

## Sample Test Scenarios

### Scenario A: Short Route, No Rest Needed
- Driver: 5h driven, 7h on-duty
- Stops: 3 stops, total 200 miles
- **Expected**: Route completes without rest stops

### Scenario B: Long Route, REST Stop Inserted
- Driver: 8.5h driven, 11h on-duty
- Stops: 4 stops, total 450 miles
- **Expected**: Route planner inserts rest stop at truck stop

### Scenario C: Opportunistic Rest at Dock
- Driver: 7h driven, 9h on-duty
- Customer dock: 10 hours
- Remaining: 300 miles
- **Expected**: REST engine recommends leveraging dock for rest

### Scenario D: Fuel Stop Inserted
- Vehicle: 25% fuel remaining
- Remaining distance: 500 miles
- Vehicle MPG: 6.5 (range: ~244 miles)
- **Expected**: Route planner inserts fuel stop

---

## Getting Help

- **Detailed Setup**: See [.docs/SETUP.md](./.docs/SETUP.md)
- **Product Specs**: See [.specs/README.md](./.specs/README.md)
- **Architecture**: See [.docs/INDEX.md](./.docs/INDEX.md)
- **Complete Guide**: See [DOCUMENTATION.md](./DOCUMENTATION.md)

---

## Success! 🎉

You now have SALLY running locally. The route planning engine is ready to optimize multi-stop routes with automatic rest stop insertion, fuel stop optimization, and HOS compliance validation.

**What makes SALLY unique:**
- Routes drivers, not just trucks (understands HOS limits)
- Automatically inserts rest stops where needed
- Leverages dock time for opportunistic rest
- Dynamically updates routes when conditions change
- Full audit trail for compliance

Happy routing! 🚛📍

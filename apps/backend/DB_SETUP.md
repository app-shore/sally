# Database Setup Guide for Node.js Backend

## Overview

The SALLY Node.js backend uses **Prisma ORM 7.3.0** with PostgreSQL as the database.

## Prerequisites

- Docker and Docker Compose running
- Node.js 20+ installed
- Database containers running (`docker ps` should show `sally-postgres`)

## Database Configuration

### Connection Strings

The application uses different connection strings depending on the environment:

**For local development** (host machine → Docker):
```
DATABASE_URL=postgresql://sally_user:sally_password@localhost:5432/sally
```

**For Docker containers** (container → container):
```
DATABASE_URL=postgresql://sally_user:sally_password@postgres:5432/sally
```

### Environment Files

Update `apps/backend/.env`:
```bash
DATABASE_URL=postgresql://sally_user:sally_password@localhost:5432/sally
REDIS_URL=redis://localhost:6379/0
```

## Step-by-Step Setup

### 1. Start Docker Containers

From the project root:
```bash
npm run docker:up
```

Verify containers are running:
```bash
docker ps
```

You should see:
- `sally-postgres` (PostgreSQL)
- `sally-redis` (Redis)
- `sally-backend` (Node.js API)
- `sally-frontend` (Next.js)

### 2. Generate Prisma Client

From the project root:
```bash
npm run backend:prisma:generate
```

Or from `apps/backend`:
```bash
npm run prisma:generate
```

### 3. Push Database Schema

This creates all tables defined in `prisma/schema.prisma`:

From the project root:
```bash
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run backend:migrate
```

Or from `apps/backend`:
```bash
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run db:push
```

Expected output:
```
✓ Your database is now in sync with your Prisma schema
```

### 4. Seed the Database

Populate the database with sample data:

From the project root:
```bash
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run backend:seed
```

Or from `apps/backend`:
```bash
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run db:seed
```

Expected output:
```
✓ Database seeded successfully!

Summary:
- Drivers: 3
- Vehicles: 3
- Stops: 4
- Loads: 2
- Load Stops: 4
- Scenarios: 3
```

## Quick Commands Reference

### From Project Root

```bash
# Generate Prisma Client
npm run backend:prisma:generate

# Push schema to database
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run backend:migrate

# Seed database
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run backend:seed

# Open Prisma Studio (Database GUI)
npm run backend:prisma:studio
```

### From apps/backend Directory

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run db:push

# Seed database
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run db:seed

# Open Prisma Studio
npm run prisma:studio

# Check migration status
npm run prisma:migrate:status
```

## Database Schema

The schema includes the following tables:

- **drivers** - Driver information and HOS status
- **vehicles** - Vehicle details and fuel capacity
- **route_plans** - Route planning data
- **route_segments** - Individual segments of routes
- **route_plan_updates** - Update history
- **stops** - Warehouse and delivery locations
- **loads** - Load information
- **load_stops** - Stops associated with loads
- **scenarios** - Test scenarios
- **events** - Event logging
- **recommendations** - REST optimization recommendations

## Sample Data

The seed script creates:

### Drivers
- **DRV-001**: John Smith (5.5 hours driven)
- **DRV-002**: Sarah Johnson (8.0 hours driven)
- **DRV-003**: Mike Williams (off duty)

### Vehicles
- **VEH-001**: TRK-1234 (200 gal capacity, 6.5 MPG)
- **VEH-002**: TRK-5678 (180 gal capacity, 7.0 MPG)
- **VEH-003**: TRK-9012 (220 gal capacity, 6.0 MPG)

### Stops (Texas locations)
- Dallas Distribution Center
- Houston Warehouse
- Austin Logistics Hub
- San Antonio Distribution

### Scenarios
1. **Basic Short Haul** - Under 200 miles, no rest required
2. **Long Haul with Rest** - 500+ miles, requires rest stop
3. **Multi-Stop Route** - 4 stops with multiple pickups/deliveries

## Troubleshooting

### "Can't reach database server"

Ensure Docker containers are running:
```bash
docker ps
```

If not running:
```bash
npm run docker:up
```

### "Authentication failed"

Check database credentials match:
- User: `sally_user`
- Password: `sally_password`
- Database: `sally`

### "Prisma Client not found"

Generate the client:
```bash
npm run backend:prisma:generate
```

### Reset Database

To completely reset and reseed:
```bash
cd apps/backend
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run db:reset
```

**Warning**: This will delete ALL data!

## Prisma Studio

To visually browse and edit your database:

```bash
npm run backend:prisma:studio
```

This opens a web interface at `http://localhost:5555`

## API Endpoints

Once the database is seeded, you can test these endpoints:

```bash
# Get all drivers
curl http://localhost:8000/api/v1/drivers

# Get all vehicles
curl http://localhost:8000/api/v1/vehicles

# Get all scenarios
curl http://localhost:8000/api/v1/scenarios
```

## Schema Updates

When you modify `prisma/schema.prisma`:

1. Generate updated client:
   ```bash
   npm run prisma:generate
   ```

2. Push changes to database:
   ```bash
   DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run db:push
   ```

## Notes

- Prisma 7.x uses `prisma.config.ts` for configuration (not `.env` for migrations)
- The `prisma.config.ts` file must be at the project root (`apps/backend/`)
- For production, use proper migration files instead of `db:push`
- The seed script can be run multiple times (it clears existing data first)

## Production Deployment

For production environments, use proper migrations:

```bash
# Create a migration
npx prisma migrate dev --name your_migration_name

# Deploy migrations
npx prisma migrate deploy
```

---

**Last Updated**: January 29, 2026

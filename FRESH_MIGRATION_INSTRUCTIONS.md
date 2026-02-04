# Fresh Migration Deployment Instructions

## ✅ What Was Fixed

### 1. **Prisma 7 Configuration (Real Fix)**
- Moved `prisma.config.ts` from `apps/backend/prisma/` to `apps/backend/` (root)
- Updated config format to use Prisma 7 syntax:
  ```typescript
  import 'dotenv/config';
  import { defineConfig, env } from 'prisma/config';

  export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
      path: 'prisma/migrations',
    },
    datasource: {
      url: env('DATABASE_URL'),
    },
  });
  ```
- Prisma CLI now correctly reads config: `Loaded Prisma config from prisma.config.ts` ✅

### 2. **Fresh Migration Created**
- Backed up old migrations to `apps/backend/prisma/migrations.backup/`
- Dropped and recreated database
- Created single fresh migration: `20260204062550_initial_schema`
- All 23 tables created including `integration_configs` and `integration_sync_logs` ✅
- Backend runs without errors ✅

### 3. **TypeScript Errors Fixed**
- Fixed `project44-tms.adapter.ts` mapStatus return type
- Updated DTO enum from `TRUCKBASE_TMS` to `PROJECT44_TMS`
- Build successful ✅

---

## 📋 Deploy to CapRover

### Step 1: Apply Fresh Migration to CapRover Database

SSH into CapRover server and run:

```bash
# Get postgres container ID
CONTAINER_ID=$(docker ps | grep sally-db | awk '{print $1}')

# Drop existing database (BE CAREFUL - THIS DELETES ALL DATA)
docker exec $CONTAINER_ID psql -U sally_user -d postgres -c "DROP DATABASE IF EXISTS sally;"

# Create fresh database
docker exec $CONTAINER_ID psql -U sally_user -d postgres -c "CREATE DATABASE sally;"

# Exit - We'll apply migration via app deployment
```

### Step 2: Deploy Backend to CapRover

From your local machine:

```bash
cd /Users/ajay-admin/sally

# Commit the fresh migration
git add apps/backend/prisma/migrations/20260204062550_initial_schema/
git add apps/backend/prisma.config.ts
git add apps/backend/src/

git commit -m "feat: fresh migration with Prisma 7 config

- Single initial_schema migration (20260204062550)
- Fixed Prisma 7 config location and format
- Fixed TypeScript errors
- All 23 tables including integration tables

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Deploy to CapRover
git push caprover main
```

### Step 3: Apply Migration on CapRover

SSH into CapRover and run:

```bash
# Get backend container ID
BACKEND_CONTAINER=$(docker ps | grep sally-api | awk '{print $1}')

# Apply migration
docker exec $BACKEND_CONTAINER npx prisma migrate deploy

# Expected output:
# Loaded Prisma config from prisma.config.ts.
# 1 migration found in prisma/migrations
# Applying migration `20260204062550_initial_schema`
# All migrations have been successfully applied.
```

### Step 4: Verify Deployment

```bash
# Check backend logs
docker logs $BACKEND_CONTAINER --tail 50

# Expected: No errors, app started successfully

# Test health endpoint from CapRover machine
curl http://localhost:8000/api/v1/health

# Expected: {"status":"healthy","environment":"production","version":"1.0.0",...}

# Verify all tables created
POSTGRES_CONTAINER=$(docker ps | grep sally-db | awk '{print $1}')
docker exec $POSTGRES_CONTAINER psql -U sally_user -d sally -c "\dt" | wc -l

# Expected: 23 tables
```

---

## 🔍 Verify Integration Tables

```bash
# Check integration tables exist
docker exec $POSTGRES_CONTAINER psql -U sally_user -d sally -c "\dt" | grep integration

# Expected output:
# public | integration_configs    | table | sally_user
# public | integration_sync_logs  | table | sally_user
```

---

## 🎯 Summary

**Before:**
- 7 separate migrations with ordering issues
- Missing `integration_configs` and `integration_sync_logs` tables
- Prisma 7 config in wrong location and wrong format
- TypeScript errors

**After:**
- ✅ Single clean migration: `20260204062550_initial_schema`
- ✅ All 23 tables created correctly
- ✅ Prisma 7 config working properly
- ✅ No TypeScript errors
- ✅ Backend runs without errors locally
- ✅ Ready for CapRover deployment

---

## 📁 Migration Backup

Old migrations are backed up in:
`apps/backend/prisma/migrations.backup/`

If you need to rollback, you can restore them (but not recommended).

---

## 🚨 Important Notes

1. **This will delete all existing data in CapRover database** - only do this in dev/test
2. **Prisma 7 requires** `prisma.config.ts` in `apps/backend/` root (not in prisma/ folder)
3. **Dockerfile doesn't run migrations automatically** - you must run `npx prisma migrate deploy` manually after deployment
4. **Fresh migration approach** is much cleaner than fixing migration order issues

---

## 🎉 Next Steps

After successful deployment:
1. Test all API endpoints
2. Verify cron jobs run without errors (check logs after 1 minute)
3. Test integration sync functionality
4. Monitor logs for 5-10 minutes to ensure stability

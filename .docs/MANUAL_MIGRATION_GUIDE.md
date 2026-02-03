# Manual Database Migration Guide (CapRover)

## When to Use This

- Auto-migrations failing in container
- Need to debug DATABASE_URL issues
- Want to verify database connectivity before app starts

## Step-by-Step Process

### 1. SSH into DigitalOcean Server

```bash
ssh root@your-server-ip
```

### 2. Find the Running Container

```bash
docker ps | grep sally-api
```

You'll see output like:
```
abc123def456  img-captain-sally-api  "./docker-entrypoint.sh"  sally-api
```

Copy the container ID (first column): `abc123def456`

### 3. Exec Into the Container

```bash
docker exec -it abc123def456 sh
```

Replace `abc123def456` with your actual container ID.

### 4. Verify Environment Variables

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Check all environment variables
env | grep -E "DATABASE|REDIS|SECRET"
```

**Expected output:**
```
DATABASE_URL=postgresql://sallyroot:sallyroot2026@srv-captain--sally-db:5432/sallyroot2026
REDIS_URL=redis://srv-captain--sally-redis:6379/0
SECRET_KEY=your-secret-key
```

### 5. Test Database Connection

```bash
# Try to connect to PostgreSQL
apk add postgresql-client  # Install psql if not present

# Parse DATABASE_URL and test connection
psql $DATABASE_URL -c "SELECT version();"
```

**If connection fails:**
- Check if `srv-captain--sally-db` resolves: `ping srv-captain--sally-db`
- Verify PostgreSQL is running: `docker ps | grep postgres`
- Check CapRover dashboard: Apps → sally-db → Status

### 6. Run Prisma Migrations Manually

```bash
cd /app

# Check Prisma schema is present
ls -la prisma/

# Generate Prisma Client (if needed)
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

**Expected output:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "sallyroot2026"

3 migrations found in prisma/migrations

Applying migration `20240115120000_initial_schema`
Applying migration `20240115121000_add_routes_table`
Applying migration `20240115122000_add_monitoring`

✅ All migrations applied successfully
```

### 7. Verify Database Schema

```bash
# List all tables
npx prisma db pull --schema=prisma/schema.prisma

# Or use psql
psql $DATABASE_URL -c "\dt"
```

**Expected tables:**
- `users`
- `routes`
- `route_legs`
- `route_stops`
- `monitoring_events`
- `alerts`
- `_prisma_migrations`

### 8. Exit and Restart Container (Optional)

```bash
# Exit the container
exit

# Back on the server, restart the app
docker restart abc123def456

# Check logs
docker logs -f abc123def456
```

## Common Issues & Fixes

### Issue 1: DATABASE_URL Not Set

**Error:**
```bash
echo $DATABASE_URL
# (empty output)
```

**Fix:**
1. Go to CapRover Dashboard
2. Apps → sally-api → App Configs
3. Environment Variables section
4. Verify `DATABASE_URL` is set
5. Click "Save & Update"
6. Wait for container to restart
7. Re-run Step 3 above

### Issue 2: Cannot Connect to Database

**Error:**
```
psql: could not translate host name "srv-captain--sally-db" to address
```

**Fix:**
```bash
# Check if database service exists
docker ps | grep postgres

# Check if hostname resolves
nslookup srv-captain--sally-db

# If not found, database service may have different name
# List all services
docker ps --format "table {{.Names}}\t{{.Image}}"

# Update DATABASE_URL with correct hostname
```

### Issue 3: Authentication Failed

**Error:**
```
psql: FATAL: password authentication failed
```

**Fix:**
1. Go to CapRover: Apps → sally-db (or your postgres app name)
2. Check App Configs for actual password
3. Update DATABASE_URL in sally-api with correct password

### Issue 4: Database Does Not Exist

**Error:**
```
psql: FATAL: database "sallyroot2026" does not exist
```

**Fix:**
```bash
# Connect to default 'postgres' database
psql postgresql://sallyroot:sallyroot2026@srv-captain--sally-db:5432/postgres

# Create the database
CREATE DATABASE sallyroot2026;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE sallyroot2026 TO sallyroot;

# Exit
\q

# Now run migrations
npx prisma migrate deploy
```

### Issue 5: Prisma Schema Not Found

**Error:**
```
Error: Could not find Prisma Schema at prisma/schema.prisma
```

**Fix:**
```bash
# Check if schema exists
ls -la /app/prisma/

# If missing, the Dockerfile didn't copy it correctly
# Check Dockerfile line:
# COPY --from=builder /workspace/apps/backend/prisma ./prisma

# Rebuild and redeploy
exit  # Exit container
# On your local machine:
caprover deploy -a sally-api --default
```

## Quick Troubleshooting Commands

```bash
# Check container logs from host
docker logs -f $(docker ps | grep sally-api | awk '{print $1}')

# Check container environment variables from host
docker exec $(docker ps | grep sally-api | awk '{print $1}') env

# Restart specific container
docker restart $(docker ps | grep sally-api | awk '{print $1}')

# Check all CapRover internal hostnames
docker network inspect captain-overlay-network | grep Name
```

## After Successful Migration

1. ✅ App should start successfully
2. ✅ Check health endpoint:
   ```bash
   curl https://sally-api.apps.appshore.in/health
   ```
3. ✅ Test a route plan:
   ```bash
   curl -X POST https://sally-api.apps.appshore.in/api/v1/routes/plan \
     -H "Content-Type: application/json" \
     -d '{
       "origin": {"latitude": 40.7128, "longitude": -74.0060},
       "destination": {"latitude": 34.0522, "longitude": -118.2437},
       "stops": []
     }'
   ```

## Automate Future Migrations

Once migrations work manually, re-enable auto-migrations by keeping the original `docker-entrypoint.sh` with migrations enabled.

---

Last Updated: February 3, 2026

# Debug CapRover Deployment

## Issue: 502 Bad Gateway Error

App deploys successfully but returns 502 error when accessed.

## Quick Debug Steps

### 1. SSH into DigitalOcean Server
```bash
ssh root@your-server-ip
```

### 2. Check Container Status
```bash
# List all sally-api containers
docker ps -a | grep sally-api

# Check if container is running or restarting
docker ps | grep sally-api
```

### 3. Check Container Logs
```bash
# Get container ID
CONTAINER_ID=$(docker ps -a | grep sally-api | head -1 | awk '{print $1}')

# View logs
docker logs $CONTAINER_ID --tail 100

# Follow logs in real-time
docker logs $CONTAINER_ID -f
```

### 4. Check Environment Variables
```bash
# Check if DATABASE_URL is set
docker exec $CONTAINER_ID env | grep DATABASE_URL

# Check all environment variables
docker exec $CONTAINER_ID env | sort
```

### 5. Test Inside Container
```bash
# Get shell access
docker exec -it $CONTAINER_ID sh

# Test if app is running
wget -qO- http://localhost:8000/api/v1/health

# Check listening ports
netstat -tlnp | grep 8000

# Check if node process is running
ps aux | grep node

# Exit
exit
```

## Common Issues & Fixes

### Issue 1: Container Keeps Restarting

**Check:**
```bash
docker ps -a | grep sally-api
# If STATUS shows "Restarting" or "Exited"
```

**Likely Causes:**
- Missing DATABASE_URL environment variable
- Can't connect to database
- Can't connect to Redis
- App crash on startup

**Fix:**
1. Check logs: `docker logs $CONTAINER_ID`
2. Verify environment variables in CapRover dashboard
3. Verify database and Redis services are running

### Issue 2: Container Running but 502 Error

**Check:**
```bash
docker ps | grep sally-api
# STATUS should show "Up X minutes (healthy)" or "Up X minutes"
```

**Likely Causes:**
- App not listening on correct port
- CapRover routing misconfigured
- App crashed after startup

**Fix:**
```bash
# Check if app is responding inside container
docker exec $CONTAINER_ID wget -qO- http://localhost:8000/api/v1/health

# If this works, routing issue. If not, app issue.
```

### Issue 3: Missing Environment Variables

**Check in CapRover Dashboard:**
1. Go to Apps → sally-api → App Configs
2. Scroll to Environment Variables
3. Verify these are set:
   - DATABASE_URL
   - REDIS_URL
   - SECRET_KEY
   - NODE_ENV=production

**Or check via SSH:**
```bash
docker exec $CONTAINER_ID env | grep -E "DATABASE|REDIS|SECRET"
```

### Issue 4: Database Connection Failed

**Check logs for:**
```
Can't reach database server
Connection refused
ECONNREFUSED
```

**Verify database is running:**
```bash
docker ps | grep postgres
# Should show sally-db or similar

# Test connection from sally-api container
docker exec $CONTAINER_ID sh -c "apk add postgresql-client && psql \$DATABASE_URL -c 'SELECT 1'"
```

### Issue 5: Redis Connection Failed

**Check logs for:**
```
Redis Connection Error
ECONNREFUSED ::1:6379
```

**Verify Redis is running:**
```bash
docker ps | grep redis

# Test from sally-api container
docker exec $CONTAINER_ID sh -c "apk add redis && redis-cli -u \$REDIS_URL ping"
```

## Debugging Checklist

Run these commands in order:

```bash
# 1. Is container running?
docker ps | grep sally-api

# 2. What do the logs say?
docker logs $(docker ps | grep sally-api | awk '{print $1}') --tail 50

# 3. Are environment variables set?
docker exec $(docker ps | grep sally-api | awk '{print $1}') env | grep -E "DATABASE|REDIS|SECRET|NODE_ENV"

# 4. Is the app responding internally?
docker exec $(docker ps | grep sally-api | awk '{print $1}') wget -qO- http://localhost:8000/api/v1/health

# 5. What port is the app listening on?
docker exec $(docker ps | grep sally-api | awk '{print $1}') netstat -tlnp
```

## Expected Successful Output

When everything is working:

```bash
$ docker ps | grep sally-api
abc123  img-captain-sally-api  Up 5 minutes (healthy)

$ docker logs abc123 --tail 10
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [PrismaService] Database connected
[Nest] LOG [NestApplication] Nest application successfully started
SALLY Backend running on port 8000

$ docker exec abc123 wget -qO- http://localhost:8000/api/v1/health
{"status":"healthy","environment":"production","version":"1.0.0"}
```

## Next Steps After Identifying Issue

1. **If logs show error** → Fix the specific error (DB connection, missing env var, etc.)
2. **If container keeps restarting** → Fix startup error and redeploy
3. **If 502 but app works internally** → Check CapRover port mapping (should be 8000)
4. **If env vars missing** → Add them in CapRover dashboard and restart

---

**Please run the debugging commands above and share the output!**

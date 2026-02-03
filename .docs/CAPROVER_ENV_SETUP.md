# CapRover Environment Setup Guide

## Step 1: Create PostgreSQL Database

1. Go to **CapRover Dashboard** → **Apps** → **One-Click Apps/Databases**
2. Search for **PostgreSQL**
3. Fill in:
   - **App Name**: `sally-postgres`
   - **Postgres Version**: `16` (or latest)
   - **Postgres Password**: Generate a secure password
   - **Postgres Default Database**: `sally`
   - **Postgres Username**: `sally_user`
4. Click **Deploy**
5. Wait for deployment to complete

## Step 2: Create Redis Cache

1. Go to **One-Click Apps/Databases**
2. Search for **Redis**
3. Fill in:
   - **App Name**: `sally-redis`
   - **Redis Version**: `7` (or latest)
4. Click **Deploy**

## Step 3: Configure Backend Environment Variables

1. Go to **Apps** → **sally-api** → **App Configs** tab
2. Scroll to **Environment Variables** section
3. Click **Bulk Edit**
4. Paste the following (update values as needed):

```bash
# Database Connection
DATABASE_URL=postgresql://sally_user:YOUR_PASSWORD_FROM_STEP1@srv-captain--sally-postgres:5432/sally

# Redis Connection
REDIS_URL=redis://srv-captain--sally-redis:6379/0

# Security (CHANGE THIS!)
SECRET_KEY=generate-a-secure-random-32-character-string-here

# Environment
NODE_ENV=production

# API Configuration
API_V1_PREFIX=/api/v1
PROJECT_NAME=SALLY Backend
CORS_ORIGINS=https://sally.yourdomain.com

# HOS Constants (FMCSA Regulations)
MAX_DRIVE_HOURS=11.0
MAX_DUTY_HOURS=14.0
REQUIRED_BREAK_MINUTES=30
BREAK_TRIGGER_HOURS=8.0
MIN_REST_HOURS=10.0
SLEEPER_BERTH_SPLIT_LONG=8.0
SLEEPER_BERTH_SPLIT_SHORT=2.0

# Distance Calculation
DISTANCE_CALCULATION_METHOD=haversine
```

5. Click **Save & Update**
6. The app will automatically restart with new environment variables

## Step 4: Verify Database Connection

After the app restarts, check the logs:

```bash
caprover apps:logs -a sally-api
```

You should see:
```
📦 Running database migrations...
✅ Migrations completed successfully
🚀 Starting SALLY Backend...
[Nest] INFO [NestFactory] Starting Nest application...
```

## Step 5: Test the API

Once the app is running, test the health endpoint:

```bash
curl https://sally-api.yourdomain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T18:15:00.000Z",
  "uptime": 5.123
}
```

## Troubleshooting

### Error: "datasource.url property is required"
- **Cause**: `DATABASE_URL` environment variable not set
- **Fix**: Add `DATABASE_URL` in App Configs → Environment Variables

### Error: "Connection refused" or "ECONNREFUSED"
- **Cause**: PostgreSQL service not running or wrong hostname
- **Fix**:
  - Verify `sally-postgres` app is running
  - Use `srv-captain--sally-postgres` as hostname (CapRover internal DNS)

### Error: "Password authentication failed"
- **Cause**: Wrong database credentials
- **Fix**: Update `DATABASE_URL` with correct password from PostgreSQL app

### App keeps restarting
- **Cause**: Missing environment variables or database connection issues
- **Fix**:
  1. Check logs: `caprover apps:logs -a sally-api`
  2. Verify all required env vars are set
  3. Ensure PostgreSQL is accessible

### Migrations fail
- **Cause**: Database user doesn't have permissions
- **Fix**:
  - Connect to PostgreSQL: `caprover exec -a sally-postgres`
  - Run: `psql -U sally_user -d sally`
  - Grant permissions: `GRANT ALL PRIVILEGES ON DATABASE sally TO sally_user;`

## Security Best Practices

1. **SECRET_KEY**: Generate a strong random key:
   ```bash
   openssl rand -base64 32
   ```

2. **Database Password**: Use a strong password (don't use the example)

3. **CORS_ORIGINS**: Only allow your frontend domains

4. **Firewall**: Use CapRover's built-in firewall to restrict access

## Next Steps

After setup:
1. ✅ Test all API endpoints
2. ✅ Run a test route plan
3. ✅ Deploy frontend to Vercel
4. ✅ Update frontend `.env` with production API URL

---

Last Updated: February 3, 2026

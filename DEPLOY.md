# REST-OS Deployment Guide

Two deployment options: **Docker Compose** (for sharing/local) and **CapRover** (for production).

---

## Option 1: Docker Compose (Sharing & Local Testing) 🐳

**Best for:** Sharing with team, local development, testing

### For Anyone to Run

```bash
# Clone and start
git clone https://github.com/YOUR_USERNAME/rest-os.git
cd rest-os
npm run docker:up
```

**Or using docker-compose directly:**
```bash
docker-compose up -d
```

### Access

- **Dashboard:** http://localhost:3000
- **API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### What's Included

- ✅ PostgreSQL database (port 5432)
- ✅ Redis cache (port 6379)
- ✅ FastAPI backend (port 8000)
- ✅ Next.js frontend (port 3000)
- ✅ Hot-reload enabled (changes auto-update)

### Useful Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Restart
npm run docker:restart

# Run database migrations
npm run db:migrate
```

### Stop & Cleanup

```bash
npm run docker:down
```

---

## Option 2: CapRover (Production on Digital Ocean) 🚀

**Best for:** Production deployment with HTTPS and custom domain

### Prerequisites

- ✅ CapRover installed on Digital Ocean
- ✅ Domain name pointed to your server
- ✅ CapRover CLI: `npm install -g caprover`
- ✅ Docker Desktop (for local build method)

### Deployment Methods

You can deploy to CapRover in two ways:

**Method A: Build on Server** (simpler, uses server resources)
**Method B: Build Locally** (faster, recommended for small droplets)

### Step 1: Set Up Databases (One-Time)

In CapRover dashboard:

1. **Apps** → **One-Click Apps/Databases**
2. Deploy **PostgreSQL**:
   - App Name: `rest-os-db`
   - Set password (remember it!)
3. Deploy **Redis**:
   - App Name: `rest-os-cache`

### Step 2: Deploy REST-OS

#### Method A: Build on Server (Simple)

```bash
# Login to CapRover
caprover login

# Deploy (builds on your CapRover server)
caprover deploy -a rest-os
```

**When prompted:**
1. "Select your CapRover machine": Choose your server
2. "Branch to deploy": Press Enter (uses current branch)

⚠️ **Note:** This uses your droplet's CPU/RAM to build. Can be slow on small droplets.

#### Method B: Build Locally (Recommended)

```bash
# Login to CapRover
caprover login

# Build and deploy locally (faster, less server load)
./deploy-local.sh
```

**Benefits:**
- ✅ Builds on your machine (faster)
- ✅ No load on production server
- ✅ Test locally before deploying
- ✅ Better for $6-12/month droplets

**Or manual steps:**
```bash
# Build the image
docker build -t rest-os:latest .

# Test locally (optional)
docker run -p 3000:3000 -p 8000:8000 rest-os:latest

# Save and deploy to 'rest-os' app
docker save rest-os:latest -o /tmp/rest-os.tar
caprover deploy -a rest-os -t /tmp/rest-os.tar
rm /tmp/rest-os.tar
```

### Step 3: Configure Environment Variables

In CapRover dashboard → **Apps** → **rest-os** → **App Configs** → **Environment Variables**:

```bash
NEXT_PUBLIC_API_URL=https://rest-os.your-domain.com
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_DB_PASSWORD@srv-captain--rest-os-db:5432/postgres
REDIS_URL=redis://srv-captain--rest-os-cache:6379/0
ENVIRONMENT=production
LOG_LEVEL=INFO
CORS_ORIGINS=https://rest-os.your-domain.com
```

**Important:**
- Replace `YOUR_DB_PASSWORD` with PostgreSQL password from Step 1
- Replace `your-domain.com` with your actual domain

Click **Save & Update**.

### Step 4: Enable HTTPS & Custom Domain

In **rest-os** app settings:

1. **HTTP Settings** → **Enable HTTPS** ✓
2. **Connect New Domain**:
   - Domain: `rest-os.your-domain.com`
   - Enable **HTTPS** ✓
   - Enable **Force HTTPS** ✓

### Step 5: Run Database Migrations

**Option 1: Via Dashboard (Easier)**
1. Go to CapRover Dashboard → Apps → rest-os
2. Scroll to **Deployment** tab
3. Click **Execute Command**
4. Enter: `cd /app/backend && uv run alembic upgrade head`
5. Click **Execute**

**Option 2: If you have SSH access**
```bash
# SSH into your CapRover server
ssh root@your-server-ip

# Find the container
docker ps | grep rest-os

# Execute in container (replace CONTAINER_ID)
docker exec -it CONTAINER_ID sh
cd /app/backend
uv run alembic upgrade head
exit
```

### Step 6: Access Your App

🎉 **Done!** Visit: `https://rest-os.your-domain.com`

### Updating Your App

When you make changes:

**Method A (Build on Server):**
```bash
git add .
git commit -m "Update description"
git push
caprover deploy -a rest-os
```

**Method B (Build Locally - Faster):**
```bash
git add .
git commit -m "Update description"
git push
./deploy-local.sh
```

### Useful CapRover Commands

```bash
# Deploy updates
caprover deploy

# All other operations (logs, restart, env vars, etc.)
# Use the CapRover Web Dashboard:
# https://captain.your-domain.com
```

**In Dashboard:**
- **View Logs**: Apps → rest-os → View Logs
- **Restart**: Apps → rest-os → Click "Save & Update"
- **Environment Variables**: Apps → rest-os → App Configs
- **Domain Settings**: Apps → rest-os → HTTP Settings

---

## What's Included in REST-OS

### Backend (FastAPI + Python)
- ✅ HOS Rule Engine (FMCSA compliance validation)
- ✅ Rest Optimization Engine (decision algorithm)
- ✅ Prediction Engine (post-load drive estimation)
- ✅ Full REST API with auto-generated docs

### Frontend (Next.js + React)
- ✅ Landing page
- ✅ Operations dashboard (Engine page)
- ✅ Side-by-side control panel
- ✅ Charts & metrics visualization
  - Progress bars for HOS limits
  - Bar charts for hours breakdown
  - Donut charts for utilization
  - Key metrics summary
- ✅ Execution history tracking

### Infrastructure
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Docker containerization
- ✅ Development hot-reload
- ✅ Production optimized builds

---

## Troubleshooting

### Docker Compose Issues

**Ports already in use:**
```bash
# Stop existing containers
npm run docker:down

# Or check what's using the ports
lsof -i :3000
lsof -i :8000
```

**Can't connect to database:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# View backend logs
docker-compose logs backend

# Restart services
npm run docker:restart
```

**Frontend not loading:**
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild if needed
docker-compose up -d --build frontend
```

### CapRover Issues

**Database connection fails:**
- Ensure PostgreSQL app name is `rest-os-db`
- Use `srv-captain--rest-os-db` in DATABASE_URL (not localhost)
- Check password is correct
- Verify environment variables are saved

**App not accessible:**
- Check if HTTPS is enabled
- Verify domain is connected
- Check app logs: `caprover apps:logs -a rest-os`
- Ensure port 80/443 are open in firewall

**Build fails:**
```bash
# Check build logs
caprover apps:logs -a rest-os

# Try deploying again
caprover deploy
```

---

## Deployment Comparison

| Feature | Docker Compose | CapRover (Server Build) | CapRover (Local Build) |
|---------|---------------|------------------------|------------------------|
| **Setup Time** | 2 minutes | 15 minutes | 15 minutes + Docker |
| **Build Speed** | Fast | Slow (on small droplet) | Fast (local machine) |
| **Server Load** | N/A | ⚠️ High during build | ✅ None |
| **Best For** | Local/Testing | Large droplets | Small droplets ($6-12) |
| **Database** | ✅ Included | ⚠️ Setup required | ⚠️ Setup required |
| **HTTPS** | ❌ No | ✅ Yes | ✅ Yes |
| **Custom Domain** | ❌ No | ✅ Yes | ✅ Yes |
| **Hot Reload** | ✅ Yes | ❌ No | ❌ No |
| **Cost** | Free | $6-12/month | $6-12/month |
| **Public Access** | ❌ Local only | ✅ Internet | ✅ Internet |

### Build Method Recommendations

- **$6 Droplet (1GB RAM):** Use local build - server builds may OOM
- **$12 Droplet (2GB RAM):** Either works, local is faster
- **$24+ Droplet (4GB+ RAM):** Server build is fine, simpler workflow

---

## Quick Reference

### Docker Compose
```bash
npm run docker:up        # Start
npm run docker:down      # Stop
npm run docker:logs      # Logs
npm run docker:restart   # Restart
```

### CapRover
```bash
caprover deploy                    # Deploy
caprover apps:logs -a rest-os     # Logs
caprover apps:restart -a rest-os  # Restart
```

---

## Production Checklist

Before going live with CapRover:

- [ ] Change default PostgreSQL password
- [ ] Set strong SECRET_KEY in environment
- [ ] Configure CORS_ORIGINS for your domain
- [ ] Enable HTTPS and force HTTPS redirect
- [ ] Set up database backups
- [ ] Configure monitoring/alerts
- [ ] Test all features in production
- [ ] Document environment variables

---

## Support

- **API Docs:** http://localhost:8000/docs (local) or https://rest-os.your-domain.com/docs (production)
- **Product Blueprint:** `.specs/blueprint.md`
- **Implementation Plan:** `.specs/IMPLEMENTATION_PLAN.md`

---

## Summary

**For sharing with developers:**
→ Use Docker Compose (your existing `docker-compose.yml`)

**For production deployment:**
→ Use CapRover with `captain-definition`

Both options are ready to use! 🎉

# REST-OS Deployment Guide

Three deployment options:
1. **Docker Compose** - Local development & testing
2. **Vercel + CapRover** - Production (Recommended) - Frontend on Vercel, Backend on CapRover
3. **CapRover Full-Stack** - Legacy option (both frontend and backend on CapRover)

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

## Option 2: Vercel + CapRover (Production - Recommended) 🚀

**Best for:** Production deployment with optimal performance and cost

**Architecture:**
- 🎨 **Frontend:** Vercel (Free tier, edge network, automatic HTTPS)
- ⚙️ **Backend:** CapRover on Digital Ocean ($6-12/month)
- 🗄️ **Databases:** PostgreSQL & Redis on CapRover

**Benefits:**
- ✅ Frontend on Vercel's global CDN (faster worldwide)
- ✅ Free frontend hosting (Vercel free tier)
- ✅ Smaller backend Docker image (~200MB vs 2GB)
- ✅ Faster deployments (no frontend build on server)
- ✅ Auto-deploy on git push (for both)

### Step 1: Deploy Backend to CapRover

#### 1.1: Set Up Databases (One-Time)

In CapRover dashboard:

1. **Apps** → **One-Click Apps/Databases**
2. Deploy **PostgreSQL**:
   - App Name: `rest-os-db`
   - Set password (remember it!)
3. Deploy **Redis**:
   - App Name: `rest-os-cache`

#### 1.2: Deploy Backend API

```bash
# Login to CapRover
caprover login

# Deploy backend (builds on your CapRover server)
caprover deploy -a rest-os-api
```

**When prompted:**
1. "Select your CapRover machine": Choose your server
2. "Branch to deploy": Press Enter (uses current branch)

#### 1.3: Configure Backend Environment Variables

In CapRover dashboard → **Apps** → **rest-os-api** → **App Configs** → **Environment Variables**:

```bash
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_DB_PASSWORD@srv-captain--rest-os-db:5432/postgres
REDIS_URL=redis://srv-captain--rest-os-cache:6379/0
ENVIRONMENT=production
LOG_LEVEL=INFO
CORS_ORIGINS=https://your-app.vercel.app,https://rest-os.your-domain.com
```

**Important:**
- Replace `YOUR_DB_PASSWORD` with PostgreSQL password from Step 1.1
- Replace `your-app.vercel.app` with your actual Vercel domain (add after deploying frontend)
- You can add multiple CORS origins separated by commas

Click **Save & Update**.

#### 1.4: Enable HTTPS & Custom Domain (Optional)

In **rest-os-api** app settings:

1. **HTTP Settings** → **Enable HTTPS** ✓
2. **Connect New Domain**:
   - Domain: `api.your-domain.com`
   - Enable **HTTPS** ✓
   - Enable **Force HTTPS** ✓

#### 1.5: Run Database Migrations

In CapRover Dashboard → Apps → rest-os-api → Deployment → Execute Command:

```bash
cd /app/backend && uv run alembic upgrade head
```

Click **Execute**.

#### 1.6: Get Your Backend URL

Your backend API is now available at:
- With custom domain: `https://api.your-domain.com`
- Without custom domain: `https://rest-os-api.captain.your-domain.com`

### Step 2: Deploy Frontend to Vercel

#### 2.1: Push to GitHub

```bash
git push origin main
```

#### 2.2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your `rest-os` repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

#### 2.3: Add Environment Variable

In Vercel project settings → **Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

(Use your backend URL from Step 1.6)

#### 2.4: Deploy

Click **Deploy**. Vercel will build and deploy your frontend.

Your app will be live at: `https://your-app.vercel.app`

#### 2.5: Update Backend CORS (Important!)

Go back to CapRover and update the `CORS_ORIGINS` environment variable to include your Vercel URL:

```bash
CORS_ORIGINS=https://your-app.vercel.app
```

### Step 3: Custom Domain (Optional)

#### Frontend Domain (Vercel)
1. In Vercel: Settings → Domains
2. Add your domain: `rest-os.your-domain.com`
3. Follow Vercel's DNS instructions

#### Backend Domain (CapRover)
Already done in Step 1.4!

### Updating Your App

**Backend updates:**
```bash
git add .
git commit -m "Update backend"
git push
caprover deploy -a rest-os-api
```

**Frontend updates:**
```bash
git add .
git commit -m "Update frontend"
git push  # Vercel auto-deploys!
```

---

## Option 3: CapRover Full-Stack (Legacy)

**Best for:** If you don't want to use Vercel

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

| Feature | Docker Compose | Vercel + CapRover | CapRover Full-Stack |
|---------|---------------|-------------------|---------------------|
| **Setup Time** | 2 minutes | 20 minutes | 20 minutes |
| **Build Speed** | Fast | Fast (parallel) | Slow (sequential) |
| **Image Size** | N/A | ~200MB | ~2GB |
| **Frontend CDN** | ❌ No | ✅ Yes (Global) | ❌ No |
| **Backend Location** | Local | CapRover | CapRover |
| **Database** | ✅ Included | ⚠️ Setup required | ⚠️ Setup required |
| **HTTPS** | ❌ No | ✅ Yes (Auto) | ✅ Yes |
| **Custom Domain** | ❌ No | ✅ Yes | ✅ Yes |
| **Hot Reload** | ✅ Yes | ❌ No | ❌ No |
| **Cost** | Free | **$6-12/month** | $6-12/month |
| **Best For** | Local/Testing | **Production** | Small projects |
| **Frontend Performance** | Good | **Excellent** | Good |
| **Deploy Complexity** | Low | Medium | Low |

### Recommendation: Use Vercel + CapRover

The Vercel + CapRover split is the best option because:
- ✅ Smaller Docker image (200MB vs 2GB)
- ✅ Faster builds (frontend and backend build in parallel)
- ✅ Better frontend performance (Vercel's global CDN)
- ✅ Free frontend hosting (Vercel free tier)
- ✅ Works great on $6 droplets
- ✅ Auto-deploy from git for both services

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

# NestJS Backend Deployment to CapRover

**Quick guide for switching from backend-py to NestJS backend on CapRover**

---

## Prerequisites

- CapRover server running
- PostgreSQL database deployed (from previous setup)
- CapRover CLI: `npm install -g caprover`
- captain-definition file in `apps/backend/`

---

## Step 1: Create captain-definition

Create `apps/backend/captain-definition` (no extension):

```json
{
  "schemaVersion": 2,
  "dockerfilePath": "./Dockerfile"
}
```

---

## Step 2: Deploy Backend

```bash
# Navigate to backend directory
cd apps/backend

# Login to CapRover
caprover login

# Deploy (creates new app or updates existing)
caprover deploy -a rest-os-api
```

**When prompted:**
- Select your CapRover machine
- Press Enter to use current branch

---

## Step 3: Configure Environment Variables

In CapRover Dashboard → Apps → rest-os-api → App Configs → Environment Variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@srv-captain--rest-os-db:5432/postgres

# Redis (if using)
REDIS_URL=redis://srv-captain--rest-os-cache:6379/0

# App Config
NODE_ENV=production
PORT=8000

# CORS (add your frontend URLs)
CORS_ORIGINS=https://your-app.vercel.app,https://rest-os.your-domain.com
```

**Important:**
- Replace `YOUR_PASSWORD` with your PostgreSQL password
- Update `CORS_ORIGINS` with actual frontend URLs
- Click **Save & Update**

---

## Step 4: Enable HTTPS

In rest-os-api app settings:

1. **HTTP Settings** → **Enable HTTPS** ✓
2. **Force HTTPS** ✓
3. **Connect New Domain** (optional):
   - Domain: `api.your-domain.com`
   - Enable HTTPS ✓

---

## Step 5: Run Database Migrations

In CapRover Dashboard → Apps → rest-os-api → Deployment → Execute Command:

```bash
npx prisma migrate deploy
```

Click **Execute**.

---

## Step 6: Verify Deployment

Check your API:
- Health: `https://rest-os-api.captain.your-domain.com/health`
- API Docs: `https://rest-os-api.captain.your-domain.com/api/docs`

---

## Key Differences from backend-py

| Aspect | backend-py | backend (NestJS) |
|--------|-----------|------------------|
| **Language** | Python | Node.js/TypeScript |
| **Framework** | FastAPI | NestJS |
| **ORM** | SQLAlchemy | Prisma |
| **Package Manager** | UV | npm |
| **Migrations** | `alembic upgrade head` | `npx prisma migrate deploy` |
| **Port** | 8000 | 8000 |
| **Dockerfile** | Different | Optimized for Node |

---

## Updating the App

When you make code changes:

```bash
cd apps/backend
git add .
git commit -m "Update backend"
git push
caprover deploy -a rest-os-api
```

---

## Troubleshooting

**Build fails:**
```bash
# Check build logs
caprover apps:logs -a rest-os-api

# Ensure captain-definition exists
ls apps/backend/captain-definition

# Verify Dockerfile exists
ls apps/backend/Dockerfile
```

**App not accessible:**
- Check HTTPS is enabled
- Verify port 8000 is exposed in Dockerfile
- Check environment variables are saved
- View logs: Dashboard → Apps → rest-os-api → View Logs

**Database connection fails:**
- Ensure DATABASE_URL uses `srv-captain--rest-os-db` hostname
- Verify PostgreSQL password is correct
- Check PostgreSQL app is running

**Prisma migrations fail:**
```bash
# Generate Prisma client first
npx prisma generate

# Then run migrations
npx prisma migrate deploy
```

---

## Cleanup Old Backend (Optional)

After verifying NestJS backend works:

1. **Stop old backend-py app** (if separate):
   - Dashboard → Apps → backend-py → Stop

2. **Remove if not needed**:
   - Dashboard → Apps → backend-py → Delete

---

## Production Checklist

- [ ] Environment variables configured
- [ ] HTTPS enabled and forced
- [ ] Database migrations run successfully
- [ ] Health endpoint returns 200
- [ ] API documentation accessible
- [ ] CORS configured for frontend
- [ ] Logs show no errors
- [ ] Test key endpoints work

---

## Quick Commands

```bash
# Deploy
cd apps/backend && caprover deploy -a rest-os-api

# View logs
caprover apps:logs -a rest-os-api -f

# Restart
caprover apps:restart -a rest-os-api

# Execute command in container
# (Use Dashboard → Deployment → Execute Command)
```

---

## Support

- **API Docs:** `https://rest-os-api.captain.your-domain.com/api/docs`
- **Health Check:** `https://rest-os-api.captain.your-domain.com/health`
- **General Deployment:** See `.docs/DEPLOY.md`

---

**Done!** Your NestJS backend is now running on CapRover. 🚀

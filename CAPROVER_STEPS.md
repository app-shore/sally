# CapRover Deployment - Quick Steps

Follow these steps in order:

## 1️⃣ Create Database Apps (One-Time Setup)

**In CapRover Dashboard:**

1. Go to **Apps** → **One-Click Apps/Databases**
2. Search and deploy **PostgreSQL**:
   - App Name: `rest-os-db`
   - PostgreSQL Password: `[choose-strong-password]`
   - Click **Deploy**
3. Search and deploy **Redis**:
   - App Name: `rest-os-cache`
   - Click **Deploy**

✅ Wait for both to finish deploying (check status in Apps list)

---

## 2️⃣ Deploy Your Code

**In Terminal (from your rest-os directory):**

```bash
# Login to CapRover
caprover login

# Deploy
caprover deploy
```

**When prompted:**
1. **"Select your CapRover machine"**: Choose your server
2. **"Enter the app name"**: Type `rest-os` (it will create automatically)
3. **"Branch to deploy"**: Press Enter (uses current branch)

✅ Wait for build and deployment to complete

---

## 3️⃣ Set Environment Variables

**In CapRover Dashboard:**

1. Go to **Apps** → **rest-os**
2. Scroll to **App Configs** section
3. Click **Environment Variables** tab
4. Add these variables:

```bash
NEXT_PUBLIC_API_URL=https://rest-os.your-domain.com
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@srv-captain--rest-os-db:5432/postgres
REDIS_URL=redis://srv-captain--rest-os-cache:6379/0
ENVIRONMENT=production
LOG_LEVEL=INFO
CORS_ORIGINS=https://rest-os.your-domain.com
```

**Replace:**
- `YOUR_PASSWORD` with the PostgreSQL password from step 1
- `your-domain.com` with your actual domain

5. Click **Save & Update**

✅ CapRover will restart the app with new variables

---

## 4️⃣ Enable HTTPS & Domain

**In CapRover Dashboard (rest-os app):**

1. **HTTP Settings** section:
   - Toggle **Enable HTTPS** ✓

2. **Connect New Domain** button:
   - Enter: `rest-os.your-domain.com`
   - Toggle **Enable HTTPS** ✓
   - Toggle **Force HTTPS** ✓
   - Click **Connect**

✅ Wait for SSL certificate to be issued (1-2 minutes)

---

## 5️⃣ Run Database Migrations

**In CapRover Dashboard:**

1. Go to **Apps** → **rest-os**
2. Scroll to **Deployment** tab
3. Find **Execute Command** section
4. Enter this command:
   ```bash
   cd /app/backend && uv run alembic upgrade head
   ```
5. Click **Execute**

✅ You should see migrations applied successfully in the output

**Alternative (if you have SSH access):**
```bash
ssh root@your-server-ip
docker ps | grep rest-os
docker exec -it CONTAINER_ID sh
cd /app/backend && uv run alembic upgrade head
exit
```

---

## 6️⃣ Test Your App

Visit: `https://rest-os.your-domain.com`

You should see the REST-OS dashboard! 🎉

---

## 🔄 Updating Your App (After Initial Deploy)

When you make changes:

```bash
git add .
git commit -m "Your changes"
git push

# Deploy to CapRover
caprover deploy
# Select: rest-os
```

No need to set environment variables again - they persist!

---

## ❌ Common Issues & Solutions

### "App rest-os not found" when deploying

**Cause:** Typo in app name or you selected wrong server

**Fix:** Make sure you type the exact same app name each time you deploy

### "Unable to connect to database"

**Cause:** Wrong database URL or app name

**Fix:** Make sure:
- PostgreSQL app is named exactly `rest-os-db`
- Use `srv-captain--rest-os-db` in DATABASE_URL (not localhost)
- Password is correct

### "App shows 502 Bad Gateway"

**Cause:** App crashed, probably database connection issue

**Fix:**
```bash
# Check logs
caprover apps:logs -a rest-os

# Check environment variables are set correctly
# Restart app
caprover apps:restart -a rest-os
```

### Can't access via domain

**Cause:** Domain not connected or DNS not pointing to server

**Fix:**
- Make sure domain DNS points to your CapRover server IP
- Check HTTPS is enabled in app settings
- Try accessing via http first: `http://captain.rest-os.your-domain.com`

---

## 📝 Quick Commands

```bash
# Login
caprover login

# Deploy
caprover deploy

# View app in CapRover dashboard
# (No CLI command - use web dashboard)
```

**In CapRover Web Dashboard:**
- View logs: Apps → rest-os → View Logs
- Restart: Apps → rest-os → Save & Update
- Environment variables: Apps → rest-os → App Configs
- Domain settings: Apps → rest-os → HTTP Settings

---

## ✅ Checklist

Use this when deploying:

- [ ] PostgreSQL app created (`rest-os-db`)
- [ ] Redis app created (`rest-os-cache`)
- [ ] REST-OS app created (`rest-os`)
- [ ] Code deployed via `caprover deploy`
- [ ] Environment variables set (especially DATABASE_URL)
- [ ] HTTPS enabled
- [ ] Custom domain connected
- [ ] Database migrations run
- [ ] App accessible via domain

---

Done! Your REST-OS dashboard is now live on CapRover! 🚀

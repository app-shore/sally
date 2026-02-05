# SALLY POC - Quick Start Guide

**Status:** ✅ Ready to Run
**Last Updated:** 2026-01-29

---

## 🚀 Start Everything (3 Commands)

```bash
# Terminal 1: Start database
docker-compose up -d postgres redis

# Terminal 2: Start backend
cd apps/backend && npm run dev

# Terminal 3: Start frontend
cd apps/web && npm run dev
```

Then open: **http://localhost:3000**

---

## 🔑 First Time Setup

### 1. Install Dependencies (if needed)
```bash
# Root dependencies
npm install

# Backend dependencies
cd apps/backend && npm install

# Frontend dependencies
cd apps/web && npm install
```

### 2. Initialize Database
```bash
cd apps/backend

# Generate Prisma client
npx prisma generate

# Reset and seed database (creates 8 drivers, 8 vehicles, 3 alerts)
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma migrate reset --force
```

---

## 🎮 Quick Demo

### Login as Dispatcher
1. Go to http://localhost:3000
2. Click **"Login as Dispatcher"**
3. You'll see Dispatcher Dashboard with 3 tabs:
   - **Create Plan** (placeholder)
   - **Active Routes** (placeholder)
   - **Alerts** ← Click this!

### View Alerts
You should see 3 alerts:
- 🔴 Driver Not Moving (DRV-001)
- 🟡 HOS Approaching Limit (DRV-002)
- 🔴 Fuel Low (DRV-007)

Try clicking:
- **Acknowledge** button
- **Resolve** button

### Manage Configuration
1. Click **Config** in navigation
2. **Drivers Tab:**
   - See 8 drivers (DRV-001 through DRV-008)
   - Click **Add Driver** to create DRV-009
   - Edit or Delete existing drivers
3. **Vehicles Tab:**
   - See 8 vehicles (VEH-001 through VEH-008)
   - Click **Add Vehicle** to create new one

### Login as Driver
1. Logout (click user icon → Logout)
2. Click **"Login as Driver"**
3. Select **DRV-001 - John Smith**
4. You'll see Driver View with HOS status bars:
   - Drive time: 5.5h / 11h
   - Shift time: 5.8h / 14h
   - Cycle time remaining

---

## 🧪 Test API Endpoints

### Mock External APIs
```bash
# Get driver HOS (Mock Samsara)
curl http://localhost:8000/api/v1/external/hos/DRV-001

# Get fuel prices (Mock GasBuddy)
curl "http://localhost:8000/api/v1/external/fuel-prices?lat=32.7767&lon=-96.7970&radius=25"

# Get weather (Mock OpenWeatherMap)
curl "http://localhost:8000/api/v1/external/weather?lat=32.7767&lon=-96.7970"
```

### Alert Management
```bash
# List all alerts
curl http://localhost:8000/api/v1/alerts

# Acknowledge alert
curl -X POST http://localhost:8000/api/v1/alerts/ALT-001/acknowledge \
  -H "Content-Type: application/json" \
  -d '{"acknowledged_by": "dispatcher-001"}'

# Resolve alert
curl -X POST http://localhost:8000/api/v1/alerts/ALT-001/resolve
```

### Driver CRUD
```bash
# List drivers
curl http://localhost:8000/api/v1/drivers

# Create driver
curl -X POST http://localhost:8000/api/v1/drivers \
  -H "Content-Type: application/json" \
  -d '{"driver_id": "DRV-009", "name": "Test Driver"}'

# Delete driver
curl -X DELETE http://localhost:8000/api/v1/drivers/DRV-009
```

---

## 📚 Documentation

**Full Details:**
- `.specs/COMPLETION_SUMMARY.md` - Complete feature inventory
- `.specs/POC_ENHANCEMENT_PLAN.md` - Original implementation plan
- `.specs/blueprint.md` - Product vision
- `CLAUDE.md` - Project instructions for AI

**API Documentation:**
- http://localhost:8000/api - Swagger UI (when backend running)

---

## 🔍 What's Implemented

### ✅ Working Features
- Login/Logout (dispatcher & driver roles)
- Dispatcher Dashboard (Alerts tab fully functional)
- Driver View (HOS visualization)
- Configuration CRUD (Drivers & Vehicles)
- Mock External APIs (HOS, Fuel, Weather)
- Alert Management (Create, Acknowledge, Resolve)

### ⏰ Placeholder Features
- Dispatcher: Create Plan tab
- Dispatcher: Active Routes tab
- Driver: Route Timeline
- Config: Loads tab

---

## 🐛 Troubleshooting

**Backend won't start:**
```bash
# Check database is running
docker ps | grep postgres

# If not running
docker-compose up -d postgres redis
```

**Frontend errors:**
```bash
# Reinstall dependencies
cd apps/web
rm -rf node_modules package-lock.json
npm install
```

**Database issues:**
```bash
# Reset database
cd apps/backend
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" npx prisma migrate reset --force
```

**Port already in use:**
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

---

## 📊 Seed Data Summary

**8 Drivers:**
- DRV-001: John Smith
- DRV-002: Sarah Johnson (10.5h driven - critical HOS)
- DRV-003: Mike Williams (fresh, 0h driven)
- DRV-004: Jane Doe
- DRV-005: Bob Martinez
- DRV-006: Lisa Chen
- DRV-007: Tom Brown (low fuel alert)
- DRV-008: Emily Davis

**8 Vehicles:**
- VEH-001 through VEH-008
- Various fuel levels and MPG ratings

**3 Alerts:**
- ALT-001: Driver Not Moving (HIGH)
- ALT-002: HOS Approaching Limit (MEDIUM)
- ALT-003: Fuel Low (HIGH)

---

## 🎯 URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api
- PostgreSQL: localhost:5432 (sally / sally_user / sally_password)
- Redis: localhost:6379

---

## ✅ Quick Validation

Run these commands to verify everything works:

```bash
# 1. Check backend is running
curl http://localhost:8000/health

# 2. Check drivers exist
curl http://localhost:8000/api/v1/drivers | jq length
# Should return: 8

# 3. Check alerts exist
curl http://localhost:8000/api/v1/alerts | jq length
# Should return: 3

# 4. Check mock HOS API
curl http://localhost:8000/api/v1/external/hos/DRV-001 | jq .data_source
# Should return: "Samsara ELD (Mock)"
```

---

**That's it! You're ready to demo SALLY.** 🚀

For detailed implementation notes, see `.specs/COMPLETION_SUMMARY.md`

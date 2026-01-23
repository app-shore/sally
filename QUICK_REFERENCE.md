# REST-OS Route Planning - Quick Reference Card

## ⚡ Start Everything (2 Commands)

### Terminal 1 - Backend:
```bash
cd apps/backend && source .venv/bin/activate && python -m uvicorn app.main:app --reload
```

### Terminal 2 - Frontend:
```bash
cd apps/web && npm run dev
```

**Then open:** http://localhost:3000/simulator

---

## 🎯 Test Immediately (3 Clicks)

1. Open http://localhost:3000/simulator
2. Click **"Load: HOS Constrained"**
3. Click **"🚀 Optimize Route"**

**Result:** See rest stop automatically inserted! ✅

## 🔄 Test Dynamic Updates (NEW - 4 More Clicks)

4. Scroll to **"Simulate Real-World Changes"**
5. Select **"Dock Time Change"**, set actual to 4h
6. Click **"Trigger Update & Re-Plan"**

**Result:** Watch plan re-generate (v1 → v2) with updated route! ✅

---

## 📚 Documentation Quick Links

| Document | Purpose | Time |
|----------|---------|------|
| `IMPLEMENTATION_COMPLETE.md` | **START HERE** - Overview | 5 min |
| `DYNAMIC_UPDATES_GUIDE.md` | **NEW: Dynamic updates** | 10 min |
| `.specs/END_TO_END_GUIDE.md` | Complete testing guide | 10 min |
| `.specs/IMPLEMENTATION_SUMMARY.md` | Technical deep dive | 30 min |
| `.specs/QUICKSTART.md` | Test API directly | 5 min |

---

## 🔑 Key URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Simulator** | http://localhost:3000/simulator | **Main testing UI** |
| Frontend | http://localhost:3000 | Next.js app |
| API Docs | http://localhost:8000/docs | Swagger UI |
| API | http://localhost:8000 | FastAPI backend |

---

## 🧪 Test Scenarios

### 1. Simple Route (No Issues)
**Click:** "Load: Simple Route" → "Optimize"
**Expect:** Clean route, 0 rest stops, 0 fuel stops

### 2. HOS Constrained (Rest Insertion) ⭐
**Click:** "Load: HOS Constrained" → "Optimize"
**Expect:** **REST STOP INSERTED** at 10.5h driven
**Proof:** HOS compliance enforcement works!

### 3. Low Fuel (Fuel Insertion)
**Click:** "Load: Low Fuel" → "Optimize"
**Expect:** FUEL STOP INSERTED
**Proof:** Fuel management works!

### 4. Dynamic Update (Re-Planning) ⭐ **NEW**
**Click:** Any scenario → "Optimize" → "Dock Time Change" → "Trigger Update"
**Expect:** **ROUTE RE-PLANNED** with version increment (v1 → v2)
**Proof:** System adapts to real-world changes!

---

## 🗄️ Database Quick Check

```bash
psql restos_dev

# View all plans
SELECT plan_id, status, total_distance_miles, created_at FROM route_plans;

# Exit
\q
```

---

## 🐛 Quick Troubleshooting

### Backend won't start?
```bash
cd apps/backend
pip install -r requirements.txt
alembic upgrade head
```

### Frontend won't start?
```bash
cd apps/web
npm install
```

### API returns 500?
- Check backend terminal for errors
- Verify database is running: `psql restos_dev`

### No rest stops inserted?
- **Expected if:** Driver has < 9h driven, short route
- **To force:** Set hours_driven to 8.0+, long route (>500mi)

---

## 📦 What's Included

### Backend ✅
- Complete route optimization (TSP)
- HOS compliance monitoring
- Automatic rest/fuel insertion
- **NEW: Dynamic update handler**
- **NEW: Re-planning engine**
- Database persistence
- API endpoints

### Frontend ✅
- Interactive simulator
- 3 pre-loaded scenarios
- Results visualization
- Real-time optimization
- **NEW: Update trigger controls**
- **NEW: Version tracking**
- **NEW: Update history log**

### Database ✅
- 8 tables (4 new, 4 enhanced)
- Complete CRUD operations
- Migrations ready

### Documentation ✅
- End-to-end guide
- API documentation
- Technical deep dive
- Quick start guide

---

## 🎯 Success Criteria (All Met ✅)

- ✅ Route optimization works (2-20 stops)
- ✅ HOS compliance enforced
- ✅ Rest stops inserted automatically
- ✅ Fuel stops inserted automatically
- ✅ Database persistence
- ✅ API functional
- ✅ Frontend working
- ✅ End-to-end complete
- ✅ **NEW: Dynamic updates working**
- ✅ **NEW: Re-planning functional**
- ✅ **NEW: Version tracking**

---

## 🚀 Ready to Test?

### 3 Steps:
1. Start backend (Terminal 1)
2. Start frontend (Terminal 2)
3. Open simulator (Browser)

### 2 Clicks:
1. "Load: HOS Constrained"
2. "Optimize Route"

### 1 Result:
**Rest stop automatically inserted!** ✅

---

## 📞 Need Help?

- **Setup:** See `END_TO_END_GUIDE.md` Step 8
- **API:** http://localhost:8000/docs
- **Code:** Check inline comments
- **Feature:** See `ROUTE_PLANNING_SPEC.md`

---

**Status:** ✅ COMPLETE AND READY
**Time to Test:** 10 minutes
**Time to Demo:** 6 minutes

**Go test it now!** 🚀

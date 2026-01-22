# REST-OS Verification Checklist

Use this checklist to verify that your REST-OS installation is working correctly.

## ✅ Installation Verification

### Prerequisites Installed

- [ ] Node.js 20+ installed (`node --version`)
- [ ] npm 10+ installed (`npm --version`)
- [ ] Python 3.11+ installed (`python3 --version`)
- [ ] UV package manager installed (`uv --version`)
- [ ] Docker installed (optional) (`docker --version`)
- [ ] Docker Compose installed (optional) (`docker-compose --version`)

### Dependencies Installed

- [ ] Root dependencies installed (`node_modules/` exists in root)
- [ ] Backend dependencies installed (`apps/backend/.venv/` exists)
- [ ] Frontend dependencies installed (`apps/web/node_modules/` exists)

### Environment Configuration

- [ ] `apps/backend/.env` file exists
- [ ] `apps/web/.env.local` file exists
- [ ] Database URL configured in backend `.env`
- [ ] API URL configured in frontend `.env.local`

## ✅ Services Running

### Docker Setup

- [ ] All containers running (`docker-compose ps` shows 4 services)
- [ ] PostgreSQL container healthy
- [ ] Redis container healthy
- [ ] Backend container running
- [ ] Frontend container running

### Manual Setup

- [ ] PostgreSQL service running (`pg_isready` returns success)
- [ ] Redis service running (`redis-cli ping` returns PONG)
- [ ] Backend server running (Terminal shows FastAPI logs)
- [ ] Frontend server running (Terminal shows Next.js logs)

## ✅ Backend Verification

### Health & API

- [ ] Health endpoint responds: `curl http://localhost:8000/health`
  - Should return: `{"status": "healthy", ...}`
- [ ] Swagger UI accessible: http://localhost:8000/docs
- [ ] ReDoc accessible: http://localhost:8000/redoc
- [ ] OpenAPI JSON available: http://localhost:8000/openapi.json

### Database

- [ ] Database migrations applied (`alembic upgrade head` successful)
- [ ] Database seeded (optional): Sample data exists in database
- [ ] Can query database: `docker-compose exec postgres psql -U rest_os_user -d rest_os -c "\dt"`

### API Endpoints

Test each endpoint using curl or Swagger UI:

- [ ] **HOS Compliance Check** (`POST /api/v1/hos-rules/check`)
  ```bash
  curl -X POST http://localhost:8000/api/v1/hos-rules/check \
    -H "Content-Type: application/json" \
    -d '{"driver_id":"TEST-001","hours_driven":8.5,"on_duty_time":10.0,"hours_since_break":6.0}'
  ```
  - Should return compliance status with checks

- [ ] **Rest Optimization** (`POST /api/v1/optimization/recommend`)
  ```bash
  curl -X POST http://localhost:8000/api/v1/optimization/recommend \
    -H "Content-Type: application/json" \
    -d '{"driver_id":"TEST-001","hours_driven":8.5,"on_duty_time":10.0,"hours_since_break":6.0,"dock_duration_hours":12.0,"remaining_distance_miles":150.0,"destination":"Miami, FL"}'
  ```
  - Should return recommendation with reasoning

- [ ] **Drive Prediction** (`POST /api/v1/prediction/estimate`)
  ```bash
  curl -X POST http://localhost:8000/api/v1/prediction/estimate \
    -H "Content-Type: application/json" \
    -d '{"remaining_distance_miles":450.0,"destination":"Chicago, IL"}'
  ```
  - Should return estimated drive hours

### Backend Tests

- [ ] Unit tests pass: `cd apps/backend && uv run pytest tests/unit/`
- [ ] Integration tests pass: `cd apps/backend && uv run pytest tests/integration/`
- [ ] All tests pass: `cd apps/backend && uv run pytest tests/`
- [ ] Test coverage acceptable (aim for 80%+)

### Code Quality

- [ ] Type checking passes: `cd apps/backend && uv run mypy app/`
- [ ] Linting passes: `cd apps/backend && uv run ruff check app/`
- [ ] Formatting is correct: `cd apps/backend && uv run black --check app/`

## ✅ Frontend Verification

### Application Access

- [ ] Frontend loads: http://localhost:3000
- [ ] Page renders without errors in browser console
- [ ] Layout displays correctly (header + side-by-side panels)
- [ ] No TypeScript errors in IDE after `npm install`

### Dashboard Components

- [ ] **Control Panel (Left)** displays:
  - [ ] Driver Information section with inputs
  - [ ] Dock Information section with inputs
  - [ ] Route Information section with inputs
  - [ ] "Run Engine" button
  - [ ] "Clear" button

- [ ] **Visualization Area (Right)** displays:
  - [ ] Placeholder message before first run
  - [ ] Changes to recommendation after clicking "Run Engine"

### Functionality Testing

- [ ] **Form Input**: Can fill all form fields
- [ ] **Form Validation**: Invalid inputs show errors (e.g., negative hours)
- [ ] **Run Engine**:
  - [ ] Click "Run Engine" button
  - [ ] Loading spinner appears
  - [ ] Recommendation displays with color coding
  - [ ] Compliance status shows
  - [ ] Reasoning text displays
- [ ] **Clear Form**:
  - [ ] Click "Clear" button
  - [ ] All inputs reset to empty
  - [ ] Visualization area clears
- [ ] **Execution History**:
  - [ ] After multiple runs, history shows past executions
  - [ ] History displays driver ID and timestamps

### Test Scenarios

Complete at least one of each recommendation type:

- [ ] **Full Rest Recommendation** (🟢 Green)
  - Hours Driven: 8.5, On-Duty: 10, Break: 6
  - Dock Duration: 12, Distance: 150
  - Should recommend full rest

- [ ] **Partial Rest Recommendation** (🟡 Yellow)
  - Hours Driven: 9.0, On-Duty: 11, Break: 7
  - Dock Duration: 7, Distance: 300
  - May recommend partial rest

- [ ] **No Rest Recommendation** (🔵 Blue)
  - Hours Driven: 5.0, On-Duty: 7, Break: 3
  - Dock Duration: 2, Distance: 400
  - Should recommend no rest

### Frontend Tests

- [ ] Unit tests setup: `cd apps/web && npm run test`
- [ ] Type checking passes: `cd apps/web && npm run type-check`
- [ ] Linting passes: `cd apps/web && npm run lint`
- [ ] Build succeeds: `cd apps/web && npm run build`

## ✅ Integration Verification

### End-to-End Flow

Test the complete flow from frontend to backend:

1. [ ] Fill out form in dashboard
2. [ ] Click "Run Engine"
3. [ ] Network request sent to backend (check browser DevTools Network tab)
4. [ ] Backend processes request (check backend logs)
5. [ ] Response returned (check Network tab)
6. [ ] Frontend displays result
7. [ ] Result added to history

### Error Handling

Test error scenarios:

- [ ] **Invalid Input**:
  - Enter -5 for hours driven
  - Should show validation error

- [ ] **Backend Down**:
  - Stop backend: `docker-compose stop backend`
  - Try to run engine
  - Should show error message
  - Restart backend: `docker-compose start backend`

- [ ] **Network Error**:
  - Disconnect network (or simulate)
  - Should show connection error

### Performance

- [ ] API responses < 500ms (check Network tab)
- [ ] Page loads quickly
- [ ] No memory leaks after multiple runs
- [ ] Dashboard remains responsive

## ✅ Docker Verification

If using Docker:

- [ ] Can start services: `docker-compose up -d`
- [ ] Can stop services: `docker-compose down`
- [ ] Can view logs: `docker-compose logs -f`
- [ ] Can restart services: `docker-compose restart`
- [ ] Can exec into containers: `docker-compose exec backend bash`
- [ ] Volumes persist data: Stop/start doesn't lose database data

## ✅ Documentation Verification

- [ ] README.md exists and is readable
- [ ] QUICKSTART.md exists with quick setup
- [ ] SETUP.md exists with detailed instructions
- [ ] IMPLEMENTATION_SUMMARY.md exists with details
- [ ] Backend README exists at apps/backend/README.md
- [ ] Frontend README exists at apps/web/README.md
- [ ] All links in documentation work
- [ ] Code has comments where needed

## ✅ Development Workflow

- [ ] Can run both apps with: `npm run dev`
- [ ] Hot reload works (change code, see updates)
- [ ] Can run backend separately: `npm run backend:dev`
- [ ] Can run frontend separately: `npm run frontend:dev`
- [ ] Git is initialized (or can be)
- [ ] .gitignore excludes correct files

## ✅ Code Quality Standards

### Backend

- [ ] All Python files have type hints
- [ ] Docstrings present for public functions
- [ ] Error handling implemented
- [ ] Logging statements included
- [ ] No hardcoded credentials
- [ ] Environment variables used correctly

### Frontend

- [ ] All TypeScript files properly typed
- [ ] No `any` types (or minimal, justified)
- [ ] Components have proper props types
- [ ] Error boundaries implemented
- [ ] Loading states handled
- [ ] Accessibility considerations (ARIA labels, etc.)

## 🎯 Final Checklist

- [ ] All above checks completed
- [ ] Can successfully run a complete workflow end-to-end
- [ ] No critical errors in console logs
- [ ] Ready to start development
- [ ] Team members can set up following SETUP.md

## 📝 Notes

Use this section to note any issues or deviations:

```
[Add any notes here about issues encountered, workarounds used, etc.]
```

---

## Status Summary

**Date Verified**: ___________

**Verified By**: ___________

**Overall Status**:
- [ ] ✅ All checks passed - Ready for development
- [ ] ⚠️  Some issues - See notes above
- [ ] ❌ Significant issues - Needs troubleshooting

**Next Steps**:

```
[Note what to do next based on verification results]
```

---

If any checks fail, refer to:
- [QUICKSTART.md](./QUICKSTART.md) for basic setup
- [SETUP.md](./SETUP.md) for detailed instructions
- [SETUP.md#troubleshooting](./SETUP.md#troubleshooting) for common issues

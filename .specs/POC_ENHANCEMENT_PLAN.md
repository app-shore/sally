# SALLY POC Enhancement Plan: Dispatch & Driver Coordination Platform

**Status:** Implementation In Progress
**Created:** 2026-01-29
**Estimated Reading Time:** 12 minutes

---w

## Executive Summary

Transform SALLY from a route planning platform into a **comprehensive dispatch & driver coordination platform** with dual interfaces (dispatcher + driver views), continuous monitoring with automated alerts, and mock external system integrations for POC demonstration.

### Key Changes

1. **Product Vision Update**: Broaden from "route planning platform" to "dispatch & driver coordination platform"
2. **Dual User Interface**: Dispatcher dashboard + Driver view (session-based, no authentication for POC)
3. **Alert System**: Automated dispatcher notifications for events (driver not moving, HOS approaching, etc.)
4. **Mock External APIs**: Simulated responses for HOS (Samsara), fuel prices, weather, TMS
5. **Configuration Screen**: CRUD interface for managing mock drivers, vehicles, loads

---

## Updated Product Vision

### Current Vision (Too Narrow)
> "The first route planning platform built for truck drivers, not dispatchers"

### New Vision (Broader, More Accurate)
> "The intelligent dispatch & driver coordination platform that generates optimized end-to-end plans, continuously monitors real-world conditions, and simplifies communication between dispatchers and drivers through automated alerts and dynamic route updates."

### Core Value Propositions

**For Dispatchers:**
- Automated calculations (no manual HOS math)
- Proactive alerts when intervention needed
- Easy communication of updated plans to drivers
- Real-time monitoring of all active routes

**For Drivers:**
- Clear guidance on when to start, where to rest, where to fuel
- Automatic plan updates as conditions change
- Always know what to do next

### System Architecture

```
External Systems (Mocked for POC)
    ├── TMS (Load data)
    ├── Samsara ELD (HOS data)
    ├── Fuel Finder API (Fuel prices)
    └── Weather API

SALLY Core Engine
    ├── Route Planning (TSP, HOS simulation)
    ├── Continuous Monitoring (14 triggers, 60s interval)
    ├── Alert Engine (Dispatcher notifications)
    └── Dynamic Update Handler

User Interfaces
    ├── Dispatcher Dashboard
    └── Driver View
```

---

## Phase 1: Documentation Updates

### Files to Update

#### 1. Product Vision (.specs/blueprint.md)

**Changes:**
- Update one-line idea: "dispatch & driver coordination platform"
- Expand problem statement to include dispatcher pain points
- Add dispatcher as primary user persona
- Add alert system to core features
- Update product definition to emphasize coordination, not just planning

**New Sections:**
- Alert Types (driver not moving, HOS approaching limits, dock delays)
- Communication Flows (system auto-notify vs. dispatcher approval)
- Dispatcher Dashboard features

#### 2. API Specification (.specs/ROUTE_PLANNING_SPEC.md)

**New Endpoints:**
- `GET /api/v1/alerts` - List active alerts for dispatcher
- `POST /api/v1/alerts/{alert_id}/acknowledge` - Dispatcher acknowledges alert
- `POST /api/v1/alerts/{alert_id}/resolve` - Mark alert as resolved
- `GET /api/v1/monitoring/active-routes` - Get all routes being monitored
- `POST /api/v1/drivers/{driver_id}/notify` - Send notification to driver
- `GET /api/v1/external/hos/{driver_id}` - Mock Samsara HOS data
- `GET /api/v1/external/fuel-prices` - Mock fuel price data
- `GET /api/v1/external/weather` - Mock weather data

**Enhanced Endpoints:**
- `POST /api/v1/route-planning/optimize` - Add `dispatcher_approval_required` flag
- `POST /api/v1/route-planning/update` - Add `notify_driver` and `notify_dispatcher` flags

#### 3. Architecture Documentation (.docs/)

**New Diagrams:**
- Alert flow diagram (Event → Alert Engine → Dispatcher → Action)
- Mock data flow (Show external API mocking layer)
- Session management (Dispatcher/Driver view switching)

**Updated Diagrams:**
- C4 Level 1: Add "Dispatcher" and "Driver" as distinct users
- C4 Level 2: Add "Alert Service" container
- Sequence diagram: Add dispatcher approval step

#### 4. Project Instructions (CLAUDE.md)

**Updates:**
- Change primary framing from "route planning platform" to "dispatch & driver coordination platform"
- Update correct language examples
- Add alert system to Layer 2 (Continuous Monitoring)

---

## Phase 2: Backend Implementation

### 2.1 Mock External API Service

**New Service:** `/apps/backend/src/services/external-api-mock/`

**Responsibilities:**
- Return realistic mock data for external systems
- Simulate API latency (50-200ms delays)
- Support configuration of mock responses

**Mock APIs:**

```typescript
// Samsara ELD Mock
GET /api/v1/external/hos/:driverId
Response: {
  driver_id: "DRV-001",
  hours_driven: 8.5,
  on_duty_time: 11.2,
  hours_since_break: 7.8,
  duty_status: "on_duty_driving",
  last_updated: "2026-01-29T14:30:00Z",
  data_source: "Samsara ELD (Mock)"
}

// Fuel Finder Mock
GET /api/v1/external/fuel-prices?lat=32.7767&lon=-96.7970&radius=25
Response: {
  stations: [
    {
      name: "Pilot Travel Center",
      address: "Exit 45, I-35 South",
      price_per_gallon: 3.45,
      distance_miles: 12.3,
      amenities: ["truck_parking", "showers", "restaurant"]
    }
  ],
  data_source: "GasBuddy API (Mock)"
}

// Weather API Mock
GET /api/v1/external/weather?lat=32.7767&lon=-96.7970
Response: {
  conditions: "clear",
  temperature_f: 72,
  wind_speed_mph: 8,
  road_conditions: "good",
  alerts: [],
  data_source: "OpenWeatherMap (Mock)"
}

// TMS Load Mock
GET /api/v1/external/loads
Response: {
  loads: [...existing load structure...],
  data_source: "McLeod TMS (Mock)"
}
```

**Implementation:**
- Controller: `external-api-mock.controller.ts`
- Service: `external-api-mock.service.ts`
- Add artificial 100-150ms delay to simulate network latency

### 2.2 Alert Service

**New Service:** `/apps/backend/src/services/alert-engine/`

**Alert Types:**

```typescript
enum AlertType {
  DRIVER_NOT_MOVING = 'driver_not_moving',           // Driver hasn't moved in 2+ hours during drive segment
  HOS_APPROACHING_LIMIT = 'hos_approaching_limit',   // <1h drive time remaining
  HOS_VIOLATION = 'hos_violation',                   // Active violation detected
  DOCK_TIME_EXCEEDED = 'dock_time_exceeded',         // Actual > estimated by 1h+
  ROUTE_DELAY = 'route_delay',                       // ETA delay > 30min
  FUEL_LOW = 'fuel_low',                             // Fuel < 20%
  MISSED_APPOINTMENT = 'missed_appointment',         // Missed time window
  REST_NEEDED = 'rest_needed',                       // Rest recommended but not taken
}

enum AlertPriority {
  CRITICAL = 'critical',  // Red, immediate action required
  HIGH = 'high',          // Orange, action needed soon
  MEDIUM = 'medium',      // Yellow, awareness needed
  LOW = 'low',            // Blue, informational
}

interface Alert {
  alert_id: string;
  driver_id: string;
  route_plan_id: string;
  alert_type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  recommended_action: string;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;  // dispatcher_id
  resolved_at?: string;
  status: 'active' | 'acknowledged' | 'resolved';
}
```

**Database Model:**
- New table: `alerts` (alert_id, driver_id, plan_id, type, priority, title, message, status, timestamps)

**API Endpoints:**
- `GET /api/v1/alerts` - List all active alerts (filter by priority, driver_id)
- `GET /api/v1/alerts/:alert_id` - Get alert details
- `POST /api/v1/alerts/:alert_id/acknowledge` - Dispatcher acknowledges
- `POST /api/v1/alerts/:alert_id/resolve` - Mark resolved

**Alert Generation:**
- Called by Continuous Monitoring Service (Layer 2)
- Evaluated every 60 seconds for active routes
- Stores alerts in database
- Exposes via API for dispatcher dashboard

### 2.3 Enhanced Drivers/Vehicles Controllers

**Add CRUD Operations:**

**Drivers Controller:**
- `POST /api/v1/drivers` - Create new driver (basic info only)
- `PUT /api/v1/drivers/:driver_id` - Update driver basic info
- `DELETE /api/v1/drivers/:driver_id` - Soft delete (set isActive=false)
- `GET /api/v1/drivers/:driver_id/hos` - **Fetch live HOS from Samsara mock**

**Vehicles Controller:**
- `POST /api/v1/vehicles` - Create new mock vehicle
- `PUT /api/v1/vehicles/:vehicle_id` - Update vehicle state
- `DELETE /api/v1/vehicles/:vehicle_id` - Soft delete

**Database Changes:**

**Driver Model (Minimal - basic info only):**
```typescript
model Driver {
  id          Int      @id @default(autoincrement())
  driverId    String   @unique  // External ID
  name        String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // REMOVED: hours_driven_today, on_duty_time_today, hours_since_break, current_duty_status
  // These are pulled from Samsara mock API in real-time
}
```

**Request/Response Schemas:**

```typescript
// Create Driver (basic info only)
POST /api/v1/drivers
{
  driver_id: "DRV-004",
  name: "Jane Doe"
}

// Get Driver HOS (calls Samsara mock)
GET /api/v1/drivers/DRV-004/hos
Response: {
  driver_id: "DRV-004",
  name: "Jane Doe",
  hos_data: {
    hours_driven_today: 5.5,
    on_duty_time_today: 8.2,
    hours_since_break: 4.5,
    current_duty_status: "on_duty_driving",
    last_updated: "2026-01-29T14:30:00Z"
  },
  data_source: "Samsara ELD (Mock)"
}

// Create Vehicle
POST /api/v1/vehicles
{
  vehicle_id: "VEH-004",
  unit_number: "TRK-5678",
  fuel_capacity_gallons: 250,
  current_fuel_gallons: 200,
  mpg: 7.5
}
```

**Implementation Details:**

1. **Driver CRUD** stores only basic identity info in database
2. **HOS data** fetched on-demand from `/api/v1/external/hos/:driver_id` (Samsara mock)
3. **Route planning** always calls Samsara mock to get current HOS before generating plan
4. **Configuration screen** allows adding/editing basic driver info only
5. **Dispatcher Create Plan UI** shows live HOS when driver selected (API call to get HOS)

### 2.4 Session Management (Mock)

**Implementation:**
- No authentication for POC
- Session state stored in memory (Map)
- API: `POST /api/v1/session/login` (mock)
- Response includes session token (UUID) and user type

```typescript
POST /api/v1/session/login
{
  user_type: "dispatcher" | "driver",
  user_id?: "DRV-001"  // Required if user_type=driver
}

Response:
{
  session_id: "sess_abc123",
  user_type: "dispatcher",
  user_id: null,
  expires_at: "2026-01-30T14:30:00Z"
}
```

**Frontend Storage:**
- Store session in localStorage
- Include session_id in API calls (optional header: `X-Session-ID`)
- Not enforced for POC, just for demonstration

---

## Phase 3: Frontend Implementation

### 3.1 Session Management UI

**New Components:**

**LoginScreen** (`/components/auth/LoginScreen.tsx`)
- Two buttons: "Login as Dispatcher" | "Login as Driver"
- If driver selected: Dropdown to select driver from list
- On submit: Call `/api/v1/session/login`, store session in localStorage
- Redirect to appropriate dashboard

**Session State:**
- New Zustand store: `useSessionStore.ts`
- State: `{ user_type, user_id, session_id, is_authenticated }`
- Actions: `login(user_type, user_id)`, `logout()`

**Route Protection:**
- Wrap app in session check (redirect to login if no session)
- No actual authentication, just UI flow demonstration

### 3.2 Dispatcher Dashboard (Apple-level UX)

**Design Philosophy:**
- **Progressive workflow** - Natural left-to-right flow (Load → Driver → Vehicle → Optimize)
- **Information density** - Show what matters, hide what doesn't (until needed)
- **Glanceable status** - Use color, icons, and visual hierarchy over text
- **Contextual actions** - Actions appear where needed, when needed
- **Confidence through preview** - Show plan preview before committing

**New Page:** `/app/dispatcher/page.tsx`

**Three Tabs:**
1. **Create Plan** - Apple Card-based workflow for matching Load → Driver → Vehicle
2. **Active Routes** - Kanban-style status board showing all active routes
3. **Alerts** - Priority-based triage of active alerts

### 3.3 Driver View (Apple-level UX)

**Design Philosophy:**
- **Glanceable by default** - Driver sees entire plan in vertical timeline (one scroll)
- **Progressive disclosure** - Tap segment to expand for details/reasoning
- **Context-aware** - Current segment highlighted, past segments dimmed
- **Minimal cognitive load** - Icons > text, visual hierarchy > dense info
- **Thumb-friendly** - Large tap targets, bottom actions for one-handed use

**New Page:** `/app/driver/page.tsx`

**Two View Modes:**
1. **Timeline View** (Default) - Vertical timeline with time-based scale
2. **Details View** - Accordion-style expanded segments with reasoning

### 3.4 Configuration Screen

**New Page:** `/app/config/page.tsx`

**Three Tabs:**
1. **Drivers Tab** - CRUD for drivers (basic info only)
2. **Vehicles Tab** - CRUD for vehicles
3. **Loads Tab** - CRUD for loads

---

## Implementation Order

1. **Documentation First** (1-2 hours)
   - Update blueprint.md, ROUTE_PLANNING_SPEC.md, CLAUDE.md
   - Ensures clarity before coding

2. **Backend Foundation** (3-4 hours)
   - Add Alert model to Prisma schema
   - Create AlertEngine service
   - Create ExternalAPIMock service
   - Add CRUD to Drivers/Vehicles controllers

3. **Backend APIs** (2-3 hours)
   - Create Alerts controller endpoints
   - Create ExternalAPIMock controller endpoints
   - Create Session controller (mock)
   - Update seed data with more entities

4. **Frontend Session & Login** (1-2 hours)
   - Create SessionStore
   - Create LoginScreen component
   - Update routing to protect pages

5. **Frontend Dispatcher View** (4-5 hours)
   - Create dispatcher page
   - Create AlertsPanel, ActiveRoutesPanel, DriverListPanel
   - Integrate with alert API

6. **Frontend Driver View** (2-3 hours)
   - Create driver page
   - Create segment/HOS cards
   - Integrate with route API

7. **Frontend Configuration** (3-4 hours)
   - Create config page with tabs
   - Create CRUD forms for drivers/vehicles/loads
   - Integrate with CRUD APIs

8. **Testing & Polish** (2-3 hours)
   - Test all user flows
   - Fix bugs
   - Polish UI/UX
   - Verify documentation accuracy

**Total Estimated Time:** 18-26 hours

---

## Task Breakdown

1. Update documentation to reflect new product vision
2. Create database schema for alerts
3. Update Driver model to store basic info only
4. Create Mock External API service
5. Create Alert Engine service
6. Add CRUD operations to Drivers controller
7. Add CRUD operations to Vehicles controller
8. Create Session Management service (mock)
9. Update seed data with enhanced mock data
10. Create frontend session management
11. Create Dispatcher Dashboard UI
12. Create Driver View UI
13. Create Configuration Screen UI
14. Update navigation and branding
15. Create API client hooks and utilities
16. Test and validate all user flows

---

## Success Criteria

After implementation, verify:

- [ ] Can login as Dispatcher → See dispatcher dashboard
- [ ] Can login as Driver (select driver) → See driver view
- [ ] Dispatcher can view active alerts with priority colors
- [ ] Dispatcher can acknowledge/resolve alerts
- [ ] Dispatcher can view all active routes
- [ ] Dispatcher can add/edit/delete drivers via Configuration
- [ ] Dispatcher can add/edit/delete vehicles via Configuration
- [ ] Dispatcher can add/edit/delete loads via Configuration
- [ ] Driver can see current route with segments
- [ ] Driver can see HOS status bars with color coding
- [ ] Driver can see upcoming rest stops
- [ ] Mock HOS API returns realistic data with "Samsara ELD (Mock)" badge
- [ ] Mock fuel API returns stations with prices
- [ ] Mock weather API returns conditions
- [ ] Route planner still works (create route, optimize, view segments)
- [ ] REST optimizer still works (standalone component page)
- [ ] Documentation updated to reflect new vision

---

## Future Enhancements (Post-POC)

- Real authentication (JWT, role-based access)
- WebSocket for real-time alert notifications
- Map view showing driver locations
- SMS/Email notifications for critical alerts
- Mobile app for drivers (React Native)
- Integration with real Samsara/TMS APIs
- Advanced analytics dashboard
- Multi-tenant support (multiple carriers)

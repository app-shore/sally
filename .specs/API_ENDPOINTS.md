# SALLY API Endpoints Reference

**Base URL:** `http://localhost:8000/api/v1/`
**API Documentation:** `http://localhost:8000/api`

---

## Session Management

### Login (Mock)
```bash
POST /api/v1/session/login
```

**Request Body:**
```json
{
  "user_type": "dispatcher",  // or "driver"
  "user_id": "DRV-001"        // required if user_type is "driver"
}
```

**Response:**
```json
{
  "session_id": "abc-123-...",
  "user_type": "dispatcher",
  "user_id": null,
  "expires_at": "2026-01-30T...",
  "message": "Session created successfully (mock - no authentication)"
}
```

**Example:**
```bash
# Login as dispatcher
curl -X POST http://localhost:8000/api/v1/session/login \
  -H "Content-Type: application/json" \
  -d '{"user_type": "dispatcher"}'

# Login as driver
curl -X POST http://localhost:8000/api/v1/session/login \
  -H "Content-Type: application/json" \
  -d '{"user_type": "driver", "user_id": "DRV-001"}'
```

### Logout
```bash
POST /api/v1/session/logout
```

**Request Body:**
```json
{
  "session_id": "abc-123-..."
}
```

---

## Alerts

### List Alerts
```bash
GET /api/v1/alerts?status=active&priority=high&driver_id=DRV-001
```

**Query Parameters:**
- `status` (optional): active, acknowledged, resolved
- `priority` (optional): critical, high, medium, low
- `driver_id` (optional): Filter by driver

**Example:**
```bash
curl http://localhost:8000/api/v1/alerts
curl http://localhost:8000/api/v1/alerts?status=active
curl http://localhost:8000/api/v1/alerts?priority=critical
```

### Get Alert
```bash
GET /api/v1/alerts/:alert_id
```

**Example:**
```bash
curl http://localhost:8000/api/v1/alerts/ALT-001
```

### Acknowledge Alert
```bash
POST /api/v1/alerts/:alert_id/acknowledge
```

**Request Body:**
```json
{
  "acknowledged_by": "dispatcher-001"  // optional
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/alerts/ALT-001/acknowledge \
  -H "Content-Type: application/json" \
  -d '{"acknowledged_by": "dispatcher-001"}'
```

### Resolve Alert
```bash
POST /api/v1/alerts/:alert_id/resolve
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/alerts/ALT-001/resolve \
  -H "Content-Type: application/json"
```

---

## Drivers

### List Drivers
```bash
GET /api/v1/drivers
```

**Example:**
```bash
curl http://localhost:8000/api/v1/drivers
```

### Create Driver
```bash
POST /api/v1/drivers
```

**Request Body:**
```json
{
  "driver_id": "DRV-009",
  "name": "Test Driver"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/drivers \
  -H "Content-Type: application/json" \
  -d '{"driver_id": "DRV-009", "name": "Test Driver"}'
```

### Update Driver
```bash
PUT /api/v1/drivers/:driver_id
```

**Request Body:**
```json
{
  "name": "Updated Name"
}
```

**Example:**
```bash
curl -X PUT http://localhost:8000/api/v1/drivers/DRV-009 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

### Delete Driver (Soft Delete)
```bash
DELETE /api/v1/drivers/:driver_id
```

**Example:**
```bash
curl -X DELETE http://localhost:8000/api/v1/drivers/DRV-009
```

### Get Driver HOS
```bash
GET /api/v1/drivers/:driver_id/hos
```

**Example:**
```bash
curl http://localhost:8000/api/v1/drivers/DRV-001/hos
```

**Note:** This endpoint returns a reference to call the external HOS API. For actual HOS data, use:
```bash
curl http://localhost:8000/api/v1/external/hos/DRV-001
```

---

## Vehicles

### List Vehicles
```bash
GET /api/v1/vehicles
```

### Create Vehicle
```bash
POST /api/v1/vehicles
```

**Request Body:**
```json
{
  "vehicle_id": "VEH-009",
  "unit_number": "TRK-9999",
  "fuel_capacity_gallons": 200,
  "current_fuel_gallons": 150,
  "mpg": 6.5
}
```

### Update Vehicle
```bash
PUT /api/v1/vehicles/:vehicle_id
```

**Request Body:**
```json
{
  "current_fuel_gallons": 180,
  "mpg": 7.0
}
```

### Delete Vehicle (Soft Delete)
```bash
DELETE /api/v1/vehicles/:vehicle_id
```

---

## External Mock APIs

### Get Driver HOS (Mock Samsara ELD)
```bash
GET /api/v1/external/hos/:driver_id
```

**Response:**
```json
{
  "driver_id": "DRV-001",
  "hours_driven": 5.5,
  "on_duty_time": 8.2,
  "hours_since_break": 4.5,
  "duty_status": "on_duty_driving",
  "last_updated": "2026-01-29T14:30:00Z",
  "data_source": "Samsara ELD (Mock)"
}
```

**Example:**
```bash
curl http://localhost:8000/api/v1/external/hos/DRV-001
curl http://localhost:8000/api/v1/external/hos/DRV-002
```

**Available Drivers:**
- DRV-001: Mid-shift (5.5h driven, 8.2h on-duty)
- DRV-002: Critical (10.5h driven, 13.5h on-duty)
- DRV-003: Fresh (0h driven, 0h on-duty)
- DRV-004 through DRV-008: Various states

### Get Fuel Prices (Mock GasBuddy)
```bash
GET /api/v1/external/fuel-prices?lat=32.7767&lon=-96.7970&radius=25
```

**Query Parameters:**
- `lat` (required): Latitude
- `lon` (required): Longitude
- `radius` (optional): Search radius in miles (default: 25)

**Response:**
```json
{
  "stations": [
    {
      "name": "Pilot Travel Center",
      "address": "Exit 45, I-35 South",
      "price_per_gallon": 3.45,
      "distance_miles": 12.3,
      "amenities": ["truck_parking", "showers", "restaurant"]
    }
  ],
  "data_source": "GasBuddy API (Mock)",
  "search_location": { "lat": 32.7767, "lon": -96.797 },
  "search_radius_miles": 25
}
```

**Example:**
```bash
curl "http://localhost:8000/api/v1/external/fuel-prices?lat=32.7767&lon=-96.7970&radius=25"
```

### Get Weather (Mock OpenWeatherMap)
```bash
GET /api/v1/external/weather?lat=32.7767&lon=-96.7970
```

**Query Parameters:**
- `lat` (required): Latitude
- `lon` (required): Longitude

**Response:**
```json
{
  "conditions": "clear",
  "temperature_f": 72,
  "wind_speed_mph": 8,
  "road_conditions": "good",
  "alerts": [],
  "data_source": "OpenWeatherMap API (Mock)"
}
```

**Example:**
```bash
curl "http://localhost:8000/api/v1/external/weather?lat=32.7767&lon=-96.7970"
```

---

## Existing Endpoints (From Original SALLY)

### HOS Rules
```bash
POST /api/v1/hos-rules/validate
GET /api/v1/hos-rules/remaining-hours
```

### REST Optimization
```bash
POST /api/v1/optimization/recommend
```

### Prediction
```bash
POST /api/v1/prediction/drive-demand
POST /api/v1/prediction/dock-time
POST /api/v1/prediction/distance-matrix
```

### Route Planning
```bash
POST /api/v1/route-planning/optimize
POST /api/v1/route-planning/update
GET /api/v1/route-planning/status/:driver_id
```

### Loads
```bash
GET /api/v1/loads
GET /api/v1/loads/:load_id
```

### Scenarios
```bash
GET /api/v1/scenarios
GET /api/v1/scenarios/:scenario_id
POST /api/v1/scenarios/:scenario_id/run
```

---

## Testing Checklist

### Session Management
- [ ] POST /api/v1/session/login (dispatcher)
- [ ] POST /api/v1/session/login (driver with user_id)
- [ ] POST /api/v1/session/logout

### Alerts
- [ ] GET /api/v1/alerts (should return 3 alerts)
- [ ] GET /api/v1/alerts?status=active
- [ ] GET /api/v1/alerts/ALT-001
- [ ] POST /api/v1/alerts/ALT-001/acknowledge
- [ ] POST /api/v1/alerts/ALT-001/resolve

### Drivers
- [ ] GET /api/v1/drivers (should return 8 drivers)
- [ ] POST /api/v1/drivers (create DRV-009)
- [ ] PUT /api/v1/drivers/DRV-009 (update name)
- [ ] DELETE /api/v1/drivers/DRV-009 (soft delete)

### Vehicles
- [ ] GET /api/v1/vehicles (should return 8 vehicles)
- [ ] POST /api/v1/vehicles (create VEH-009)
- [ ] PUT /api/v1/vehicles/VEH-009 (update fuel)
- [ ] DELETE /api/v1/vehicles/VEH-009 (soft delete)

### External Mock APIs
- [ ] GET /api/v1/external/hos/DRV-001 (should show "Samsara ELD (Mock)")
- [ ] GET /api/v1/external/hos/DRV-002 (critical HOS state)
- [ ] GET /api/v1/external/fuel-prices (should return 3 stations)
- [ ] GET /api/v1/external/weather (should return mock weather)

---

## Error Handling

All endpoints return proper HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `409` - Conflict (duplicate driver_id/vehicle_id)
- `500` - Internal Server Error

Error responses follow this format:
```json
{
  "detail": "Error message here"
}
```

---

## Rate Limiting

Mock APIs simulate realistic latency:
- External APIs: 100-150ms delay
- All other endpoints: No artificial delay

---

## Notes

1. **No Authentication Required (POC):** All endpoints are open for testing
2. **Sessions Stored in Memory:** Will be lost on server restart
3. **Mock Data Only:** External APIs return static/semi-random data
4. **Soft Deletes:** Drivers and vehicles are marked inactive, not deleted from DB
5. **Global Prefix:** All endpoints use `/api/v1/` prefix

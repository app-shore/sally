# project44 TMS Integration Guide

**Purpose:** Integrate with project44 API to pull load/shipment data
**Date:** February 2, 2026

---

## Overview

project44 is a leading visibility platform offering comprehensive APIs for load and shipment management across multiple transportation modes (truck, rail, ocean, air, parcel).

**Why project44 instead of Truckbase:**
- ✅ Public API with excellent documentation
- ✅ OAuth 2.0 authentication (industry standard)
- ✅ Full CRUD operations on loads/shipments
- ✅ Real-time tracking and updates
- ✅ Multi-modal support
- ✅ Developer-friendly sandbox environment

---

## API Overview

### Base URLs

```
Production (NA): https://na12.api.project44.com/api/v4
Production (EU): https://eu12.api.project44.com/api/v4
Sandbox:         https://na12.api.sandbox.p-44.com/api/v4
```

### Authentication

**Method:** OAuth 2.0 (Client Credentials Grant)

```bash
POST /api/v4/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 43200,
  "scope": "api"
}
```

**Token Lifetime:** ~12 hours (43200 seconds)

**Rate Limit:** Maximum 5 token requests per minute

---

## Getting Started

### Step 1: Create project44 Developer Account

1. **Visit:** https://developers.project44.com/
2. **Sign Up:** Create a developer account
3. **Verify Email:** Confirm your registration
4. **Access Developer Portal:** Login to view documentation

### Step 2: Create OAuth Credentials

1. **Navigate to:** Developer Portal → Applications
2. **Create Application:**
   - Name: "SALLY Integration"
   - Description: "Fleet management and route planning"
   - Redirect URL: Not needed for server-to-server
3. **Get Credentials:**
   - Copy **Client ID**
   - Copy **Client Secret**
   - Store securely (never commit to code)

### Step 3: Test in Sandbox

Use sandbox environment for testing:

```bash
# Get access token (sandbox)
curl -X POST "https://na12.api.sandbox.p-44.com/api/v4/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"

# Save token
export P44_TOKEN="<access_token_from_response>"

# Test loads endpoint
curl -X GET "https://na12.api.sandbox.p-44.com/api/v4/loads" \
  -H "Authorization: Bearer $P44_TOKEN" \
  -H "Content-Type: application/json"
```

### Step 4: Configure in SALLY

**Via UI (Recommended):**
1. Open: http://localhost:3000
2. Navigate: Settings → Connections → Transportation Management
3. Click: "Add New Connection"
4. Select: "project44"
5. Fill in:
   - Display Name: "project44 Production"
   - API Key (Client ID): `<your-client-id>`
   - API Secret (Client Secret): `<your-client-secret>`
   - Sync Interval: 300 seconds (5 minutes)
6. Click: "Test Connection"
7. Click: "Save"

**Via API:**
```bash
# Login and get JWT
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sally.app", "password": "your-password"}'

export JWT_TOKEN="<token>"

# Create project44 integration
curl -X POST http://localhost:8000/api/v1/integrations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "integration_type": "TMS",
    "vendor": "PROJECT44_TMS",
    "display_name": "project44 Production",
    "credentials": {
      "apiKey": "your-client-id",
      "apiSecret": "your-client-secret"
    },
    "sync_interval_seconds": 300
  }'
```

---

## API Endpoints

### 1. Get All Active Loads

```bash
GET /api/v4/loads?status=active
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "data": [
    {
      "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
      "externalLoadNumber": "LOAD-2026-001",
      "description": "Electronics shipment",
      "status": "IN_TRANSIT",
      "pickupStopReference": {
        "stopId": "dd775241-8a00-4193-b07c-f3e4740fdc43",
        "address": "2000 Logistics Ave",
        "city": "Phoenix",
        "state": "AZ",
        "zip": "85001",
        "latitude": 33.4484,
        "longitude": -112.074,
        "appointmentTime": "2026-02-05T08:00:00Z"
      },
      "deliveryStopReference": {
        "stopId": "ee775241-8a00-4193-b07c-f3e4740fdc44",
        "address": "5500 Distribution Center",
        "city": "Las Vegas",
        "state": "NV",
        "zip": "89101",
        "latitude": 36.1699,
        "longitude": -115.1398,
        "appointmentTime": "2026-02-05T14:30:00Z"
      },
      "handlingUnits": [
        {
          "handlingUnitType": "PALLET",
          "quantity": 5,
          "weight": {
            "value": 2500.0,
            "unitOfMeasurement": "LBS"
          }
        }
      ],
      "createdDateTime": "2026-02-02T08:00:00Z"
    }
  ],
  "pagination": {
    "pageNumber": 1,
    "pageSize": 50,
    "totalRecords": 125
  }
}
```

### 2. Get Specific Load by ID

```bash
GET /api/v4/loads/{loadId}
Authorization: Bearer {access_token}
```

### 3. Create Load

```bash
POST /api/v4/loads
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "externalLoadNumber": "LOAD-2026-005",
  "description": "Freight shipment",
  "pickupStopReference": {
    "stopId": "stop-uuid-123",
    "appointmentTime": "2026-02-10T08:00:00Z"
  },
  "deliveryStopReference": {
    "stopId": "stop-uuid-456",
    "appointmentTime": "2026-02-10T16:00:00Z"
  }
}
```

---

## Data Schema

### Load Object Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | project44 load identifier | `497f6eca-6276-4993-bfeb-53cbbbba6f08` |
| `externalLoadNumber` | String | Load number from external TMS | `LOAD-2026-001` |
| `description` | String | Human-readable description | `Electronics shipment` |
| `status` | Enum | Load status | `IN_TRANSIT`, `DELIVERED`, `ACTIVE` |
| `pickupStopReference` | Object | Pickup location details | See Stop Object |
| `deliveryStopReference` | Object | Delivery location details | See Stop Object |
| `handlingUnits` | Array | Items/freight details | See Handling Unit Object |
| `createdDateTime` | ISO 8601 | When load was created | `2026-02-02T08:00:00Z` |

### Stop Object Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `stopId` | UUID | Stop identifier | `dd775241-8a00-4193-b07c-f3e4740fdc43` |
| `address` | String | Street address | `2000 Logistics Ave` |
| `city` | String | City name | `Phoenix` |
| `state` | String | State code | `AZ` |
| `zip` | String | ZIP/postal code | `85001` |
| `latitude` | Number | Latitude coordinate | `33.4484` |
| `longitude` | Number | Longitude coordinate | `-112.074` |
| `appointmentTime` | ISO 8601 | Scheduled time | `2026-02-05T08:00:00Z` |

### Status Values

- `CREATED` - Load created, not yet active
- `ACTIVE` - Load is active, awaiting assignment
- `IN_TRANSIT` - Driver is en route
- `DELIVERED` - Load delivered successfully
- `CANCELLED` - Load cancelled
- `PENDING` - Load pending approval

---

## SALLY Adapter Implementation

### Current Status

**File:** `apps/backend/src/services/adapters/tms/project44-tms.adapter.ts`

**Status:** ✅ Implemented with mock data

**Mode:** `useMockData = true` (returns 5 mock loads)

### Mock Data

The adapter currently returns 5 sample loads:

1. **Phoenix → Las Vegas** (297 miles)
   - Status: IN_TRANSIT
   - Driver: DRV-001

2. **Los Angeles → San Diego** (120 miles)
   - Status: ASSIGNED
   - Driver: DRV-002

3. **Dallas → Houston** (239 miles)
   - Status: ASSIGNED
   - Driver: DRV-003

4. **Atlanta → Charlotte** (244 miles)
   - Status: ASSIGNED
   - Driver: Not assigned

5. **Seattle → Portland** (173 miles)
   - Status: DELIVERED
   - Driver: DRV-005

### Switching to Real API

To enable real API calls:

```typescript
// apps/backend/src/services/adapters/tms/project44-tms.adapter.ts
private useMockData = false; // Change to false
```

Then restart the backend:
```bash
cd apps/backend
npm run start:dev
```

### Features Implemented

✅ **OAuth 2.0 Authentication**
- Token caching (12-hour expiration)
- Automatic token refresh on 401 errors
- Rate limit compliance (5 tokens/minute)

✅ **Load Operations**
- `getActiveLoads()` - Fetch all active loads
- `getLoad(loadId)` - Fetch specific load
- `syncAllLoads()` - Sync and return load IDs
- `testConnection()` - Validate credentials

✅ **Data Transformation**
- Converts project44 format → SALLY LoadData format
- Maps status values (`IN_TRANSIT`, `DELIVERED`, etc.)
- Calculates distances (Haversine formula)
- Adds `data_source: 'project44_tms'` tag

✅ **Error Handling**
- Graceful fallback on API errors
- Detailed error logging
- Retry logic via RetryService

---

## Testing

### Method 1: Via UI (Recommended)

1. Start backend: `cd apps/backend && npm run start:dev`
2. Open UI: http://localhost:3000
3. Go to: Settings → Connections → Transportation Management
4. Click: "Add New Connection"
5. Select: "project44"
6. Enter credentials (Client ID/Secret)
7. Click: "Test Connection" → Should show "Connection successful"
8. Click: "Save"
9. Click: "Manual Sync" → Check sync history

### Method 2: Via API

```bash
# Test with real credentials
curl -X POST http://localhost:8000/api/v1/integrations/$INTEGRATION_ID/test \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected response
{"success": true, "message": "Connection successful"}

# Trigger manual sync
curl -X POST http://localhost:8000/api/v1/integrations/$INTEGRATION_ID/sync \
  -H "Authorization: Bearer $JWT_TOKEN"

# View sync history
curl -X GET "http://localhost:8000/api/v1/integrations/$INTEGRATION_ID/sync-history?limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Method 3: Direct Adapter Test

Create test script: `apps/backend/test-project44.ts`

```typescript
import { Project44TMSAdapter } from './src/services/adapters/tms/project44-tms.adapter';

async function testProject44() {
  const adapter = new Project44TMSAdapter();

  const clientId = 'your-client-id';
  const clientSecret = 'your-client-secret';

  console.log('🔍 Testing project44 connection...');

  try {
    // Test connection
    const isConnected = await adapter.testConnection(clientId, clientSecret);
    console.log(`   Connection: ${isConnected ? '✅ Success' : '❌ Failed'}`);

    // Get active loads
    const loads = await adapter.getActiveLoads(clientId, clientSecret);
    console.log(`\n📦 Found ${loads.length} active loads\n`);

    if (loads.length > 0) {
      console.log('Sample Load:');
      console.log(JSON.stringify(loads[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProject44();
```

Run:
```bash
cd apps/backend
npx ts-node test-project44.ts
```

---

## Troubleshooting

### Issue: "OAuth token request failed: 401"

**Cause:** Invalid Client ID or Secret

**Solution:**
1. Verify credentials in project44 developer portal
2. Check for extra spaces or line breaks
3. Ensure credentials are not expired
4. Try generating new OAuth credentials

### Issue: "Rate limit exceeded"

**Cause:** Too many token requests (>5 per minute)

**Solution:**
- Adapter automatically caches tokens for 12 hours
- Ensure you're not creating new adapter instances frequently
- Check token cache is working: `this.tokenCache`

### Issue: "No active loads returned []"

**Possible Causes:**
1. No active loads in your project44 account
2. Wrong status filter
3. Sandbox environment has no test data

**Solution:**
- Create test loads in project44 dashboard
- Try without status filter: `GET /api/v4/loads`
- Check if using correct environment (sandbox vs production)

### Issue: "Connection test successful but sync fails"

**Debugging Steps:**
```bash
# Check backend logs
tail -f apps/backend/logs/*.log | grep project44

# Test OAuth token manually
curl -X POST "https://na12.api.project44.com/api/v4/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"

# Test loads endpoint with token
curl -X GET "https://na12.api.project44.com/api/v4/loads" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Rate Limits & Best Practices

### Rate Limits

| Endpoint | Limit | Notes |
|----------|-------|-------|
| OAuth Token | 5 tokens/min | Cache tokens for 12 hours |
| Loads API | Not specified | Standard rate limiting applies |

### Best Practices

1. **Token Caching**
   - Always cache OAuth tokens
   - Reuse for full 12-hour lifetime
   - Only refresh on 401 errors

2. **Error Handling**
   - Implement exponential backoff
   - Log all API errors
   - Fall back to cached data when possible

3. **Sync Frequency**
   - Default: 5 minutes (300 seconds)
   - Adjust based on business needs
   - Don't sync more frequently than necessary

4. **Data Validation**
   - Validate load data before storing
   - Check required fields (pickup, delivery)
   - Verify coordinate ranges

5. **Security**
   - Never log Client Secret
   - Encrypt credentials in database
   - Use environment-specific credentials (dev/prod)

---

## Production Readiness Checklist

Before going to production:

- [ ] **Credentials Obtained**
  - [ ] Production Client ID from project44
  - [ ] Production Client Secret from project44
  - [ ] Credentials stored securely (not in code)

- [ ] **Configuration**
  - [ ] Set `useMockData = false` in adapter
  - [ ] Use production base URL (not sandbox)
  - [ ] Configure appropriate sync interval
  - [ ] Verify credentials are encrypted

- [ ] **Testing**
  - [ ] Test connection succeeds
  - [ ] Loads can be fetched
  - [ ] Data transformation works correctly
  - [ ] OAuth token caching verified
  - [ ] Error handling tested

- [ ] **Monitoring**
  - [ ] Sync success rate monitored
  - [ ] Alert on 3+ consecutive failures
  - [ ] Token refresh working
  - [ ] Rate limits not exceeded

- [ ] **Documentation**
  - [ ] Team trained on project44 integration
  - [ ] Support contact information available
  - [ ] Troubleshooting guide accessible

---

## API Documentation Links

**Official Resources:**
- Developer Portal: https://developers.project44.com/
- API Reference: https://developers.project44.com/api-reference
- OAuth Guide: https://developers.project44.com/api-reference/authentication
- Load API: https://developers.project44.com/api-reference/api-docs/shipment:-loads

**Support:**
- Email: support@project44.com
- Documentation: https://developers.project44.com/docs

---

## Migration from Mock to Real API

### Step-by-Step Migration

**1. Obtain Production Credentials**
```
Visit: https://developers.project44.com/
Create: Production application
Copy: Client ID and Client Secret
```

**2. Update Adapter**
```typescript
// apps/backend/src/services/adapters/tms/project44-tms.adapter.ts
private useMockData = false; // Enable real API
```

**3. Configure Integration**
- Add integration via UI with production credentials
- Test connection
- Verify loads are fetched correctly

**4. Monitor Initial Sync**
```bash
# Watch logs
tail -f apps/backend/logs/*.log | grep project44

# Check sync history
curl -X GET "http://localhost:8000/api/v1/integrations/$ID/sync-history" \
  -H "Authorization: Bearer $JWT"
```

**5. Validate Data**
- Compare fetched loads with project44 dashboard
- Verify all required fields present
- Check coordinate accuracy
- Confirm appointment times correct

---

## Summary

**project44 Integration Status:** ✅ Ready (using mock data)

**Next Steps:**
1. Sign up for project44 developer account
2. Get OAuth Client ID and Secret
3. Test in sandbox environment
4. Switch adapter to real API (`useMockData = false`)
5. Configure in SALLY UI
6. Monitor sync success rate

**Key Advantages:**
- Full CRUD operations on loads
- Real-time tracking
- OAuth 2.0 security
- Excellent documentation
- Multi-modal support

**Ready for production when credentials are obtained!** 🚀

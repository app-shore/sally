# Truckbase Integration Testing Guide

**Purpose:** Test Truckbase TMS integration to pull fleet drivers and loads
**Date:** January 31, 2026

---

## Prerequisites

Before testing, ensure you have:

1. **Truckbase Account**
   - Sign up at: https://app.truckbase.io
   - Note: Truckbase may require partner/enterprise access for API

2. **API Credentials**
   - API Key
   - API Secret
   - Both are required for Truckbase authentication

3. **Backend Running**
   ```bash
   cd apps/backend
   npm run start:dev
   ```

---

## Testing Methods

### Method 1: Via UI (Recommended)

This is the easiest way to test and how users will actually use the integration.

#### Step 1: Access Settings

1. Open the web app: http://localhost:3000
2. Login as an admin user
3. Navigate to: **Settings** → **Connections** tab

#### Step 2: Add Truckbase Integration

1. Click the **Transportation Management** card
2. Click **"Add New Connection"**
3. Select **"Truckbase"** from the list
4. Fill in the form:
   ```
   Display Name: My Truckbase Account
   API Key: [your-truckbase-api-key]
   API Secret: [your-truckbase-api-secret]
   Sync Interval: 300 seconds (5 minutes)
   ```

#### Step 3: Test Connection

1. Click **"Test Connection"** button
2. Wait for response
3. Expected results:
   - ✅ **Success**: "Connection successful" message
   - ❌ **Failure**: Error message with details

#### Step 4: Save Integration

1. Click **"Save"**
2. Integration is now saved to database
3. Credentials are encrypted automatically

#### Step 5: Trigger Manual Sync

1. Find your Truckbase integration card
2. Click **"Manual Sync"** button
3. Check backend logs for sync activity

#### Step 6: View Sync History

1. Click **"Configure"** on the Truckbase card
2. Click **"Sync History"** tab
3. View:
   - Total syncs
   - Success rate
   - Recent sync logs
   - Records processed

---

### Method 2: Via API (For Developers)

Test the integration programmatically using curl or Postman.

#### Step 1: Login and Get JWT Token

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sally.app",
    "password": "your-password"
  }'

# Save the access_token from response
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Step 2: Create Truckbase Integration

```bash
curl -X POST http://localhost:8000/api/v1/integrations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "integration_type": "TMS",
    "vendor": "TRUCKBASE_TMS",
    "display_name": "Truckbase API Test",
    "credentials": {
      "apiKey": "your-truckbase-api-key",
      "apiSecret": "your-truckbase-api-secret"
    },
    "sync_interval_seconds": 300
  }'

# Save the integration ID from response
export INTEGRATION_ID="abc123..."
```

#### Step 3: Test Connection

```bash
curl -X POST http://localhost:8000/api/v1/integrations/$INTEGRATION_ID/test \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Connection successful"
}
```

#### Step 4: Trigger Manual Sync

```bash
curl -X POST http://localhost:8000/api/v1/integrations/$INTEGRATION_ID/sync \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Sync started"
}
```

#### Step 5: Get Sync History

```bash
curl -X GET "http://localhost:8000/api/v1/integrations/$INTEGRATION_ID/sync-history?limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "log-123",
    "sync_type": "manual",
    "status": "success",
    "started_at": "2026-01-31T10:30:00Z",
    "completed_at": "2026-01-31T10:30:05Z",
    "duration_ms": 5000,
    "records_processed": 15,
    "records_created": 5,
    "records_updated": 10
  }
]
```

#### Step 6: Get Sync Statistics

```bash
curl -X GET "http://localhost:8000/api/v1/integrations/$INTEGRATION_ID/sync-history/stats" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response:**
```json
{
  "total_syncs": 10,
  "successful_syncs": 9,
  "failed_syncs": 1,
  "success_rate": 90.0
}
```

---

### Method 3: Direct Adapter Testing (Developers)

Test the adapter directly without going through the full integration API.

#### Create Test Script

**File:** `apps/backend/test-truckbase.ts`

```typescript
import { TruckbaseTMSAdapter } from './src/services/adapters/tms/truckbase-tms.adapter';

async function testTruckbase() {
  const adapter = new TruckbaseTMSAdapter();

  // Your Truckbase credentials
  const apiKey = 'your-truckbase-api-key';
  const apiSecret = 'your-truckbase-api-secret';

  console.log('🔍 Testing Truckbase connection...');

  try {
    // Test 1: Connection
    console.log('\n1️⃣ Testing connection...');
    const isConnected = await adapter.testConnection(apiKey, apiSecret);
    console.log(`   Result: ${isConnected ? '✅ Connected' : '❌ Failed'}`);

    if (!isConnected) {
      console.error('   Connection failed. Check your credentials.');
      return;
    }

    // Test 2: Get Active Loads
    console.log('\n2️⃣ Fetching active loads...');
    const loads = await adapter.getActiveLoads(apiKey, apiSecret);
    console.log(`   Found ${loads.length} active loads`);

    if (loads.length > 0) {
      console.log('\n   Sample Load:');
      console.log(JSON.stringify(loads[0], null, 2));
    }

    // Test 3: Get Specific Load (if available)
    if (loads.length > 0) {
      const loadId = loads[0].load_id;
      console.log(`\n3️⃣ Fetching specific load: ${loadId}...`);
      const load = await adapter.getLoad(apiKey, apiSecret, loadId);
      console.log('   Load details:');
      console.log(`   - Pickup: ${load.pickup_location.city}, ${load.pickup_location.state}`);
      console.log(`   - Delivery: ${load.delivery_location.city}, ${load.delivery_location.state}`);
      console.log(`   - Status: ${load.status}`);
      console.log(`   - Driver: ${load.assigned_driver_id || 'Not assigned'}`);
    }

    // Test 4: Sync All Loads
    console.log('\n4️⃣ Syncing all loads...');
    const loadIds = await adapter.syncAllLoads(apiKey, apiSecret);
    console.log(`   Synced ${loadIds.length} loads`);
    console.log(`   Load IDs: ${loadIds.join(', ')}`);

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

testTruckbase();
```

#### Run Test Script

```bash
cd apps/backend
npx ts-node test-truckbase.ts
```

#### Expected Output

```
🔍 Testing Truckbase connection...

1️⃣ Testing connection...
   Result: ✅ Connected

2️⃣ Fetching active loads...
   Found 3 active loads

   Sample Load:
   {
     "load_id": "TB-12345",
     "pickup_location": {
       "address": "123 Warehouse St",
       "city": "Dallas",
       "state": "TX",
       "zip": "75201",
       "latitude": 32.7767,
       "longitude": -96.7970
     },
     "delivery_location": {
       "address": "456 Distribution Way",
       "city": "Houston",
       "state": "TX",
       "zip": "77002",
       "latitude": 29.7604,
       "longitude": -95.3698
     },
     "pickup_appointment": "2026-02-01T08:00:00Z",
     "delivery_appointment": "2026-02-01T16:00:00Z",
     "assigned_driver_id": "DRV-001",
     "status": "IN_TRANSIT",
     "total_miles": 239,
     "data_source": "truckbase_tms"
   }

3️⃣ Fetching specific load: TB-12345...
   Load details:
   - Pickup: Dallas, TX
   - Delivery: Houston, TX
   - Status: IN_TRANSIT
   - Driver: DRV-001

4️⃣ Syncing all loads...
   Synced 3 loads
   Load IDs: TB-12345, TB-12346, TB-12347

✅ All tests passed!
```

---

## What Gets Pulled from Truckbase

### Load Data

For each load, the adapter fetches:

| Field | Description | Example |
|-------|-------------|---------|
| `load_id` | Unique load identifier | "TB-12345" |
| `pickup_location` | Origin details | Address, city, state, coordinates |
| `delivery_location` | Destination details | Address, city, state, coordinates |
| `pickup_appointment` | Scheduled pickup time | "2026-02-01T08:00:00Z" |
| `delivery_appointment` | Scheduled delivery time | "2026-02-01T16:00:00Z" |
| `assigned_driver_id` | Driver assigned to load | "DRV-001" |
| `status` | Load status | ASSIGNED, IN_TRANSIT, DELIVERED |
| `total_miles` | Distance in miles | 239 |
| `data_source` | Source identifier | "truckbase_tms" |

### Driver Data

**Note:** The current adapter focuses on **loads only**. To pull driver/fleet data, you would need to:

1. Add a new method to the adapter:
   ```typescript
   async getDrivers(apiKey: string, apiSecret: string): Promise<Driver[]>
   ```

2. Call Truckbase drivers endpoint:
   ```
   GET /drivers
   ```

3. Transform the response to SALLY's driver format

---

## Truckbase API Endpoints Used

Based on the implementation:

| Endpoint | Method | Purpose | Headers |
|----------|--------|---------|---------|
| `/loads` | GET | List all loads | X-API-Key, X-API-Secret |
| `/loads?status=active` | GET | Get active loads only | X-API-Key, X-API-Secret |
| `/loads/{id}` | GET | Get specific load | X-API-Key, X-API-Secret |

---

## Troubleshooting

### Issue: "Connection failed"

**Possible Causes:**
1. Invalid API credentials
2. Truckbase API not accessible (partner-only)
3. Network connectivity issues
4. Incorrect base URL

**Debug Steps:**
```bash
# Check if base URL is accessible
curl https://api.truckbase.io/v1/loads

# Check your credentials format
echo $TRUCKBASE_API_KEY  # Should not be empty
echo $TRUCKBASE_API_SECRET  # Should not be empty
```

### Issue: "Truckbase API error: 401 Unauthorized"

**Solution:**
- Verify your API Key and Secret are correct
- Check if credentials are active in Truckbase dashboard
- Ensure you have API access enabled

### Issue: "Truckbase API error: 404 Not Found"

**Solution:**
- Truckbase may not have a public API
- Contact Truckbase support for API access
- Verify the base URL in your .env or adapter code

### Issue: "Failed to fetch loads: Network error"

**Solution:**
- Check your internet connection
- Verify firewall isn't blocking requests
- Check if Truckbase API is down (status page)

### Issue: Empty loads array `[]`

**Possible Causes:**
- No active loads in your Truckbase account
- Wrong status filter
- Permissions issue with API key

**Debug:**
```typescript
// Try without status filter
const response = await fetch(`${this.baseUrl}/loads`, {
  headers: {
    'X-API-Key': apiKey,
    'X-API-Secret': apiSecret,
  },
});
```

---

## Data Flow Diagram

```
User (UI or API)
    ↓
POST /api/v1/integrations (Create integration)
    ↓
Database: IntegrationConfig (credentials encrypted)
    ↓
POST /api/v1/integrations/:id/sync (Trigger sync)
    ↓
IntegrationManagerService
    ↓
Get credentials from database (decrypt)
    ↓
TruckbaseTMSAdapter.getActiveLoads(apiKey, apiSecret)
    ↓
HTTP GET https://api.truckbase.io/v1/loads?status=active
    ↓
Transform response to SALLY format
    ↓
Store in database (loads table)
    ↓
Create IntegrationSyncLog entry
    ↓
Return success to user
```

---

## Important Notes

### 1. Truckbase API Access

⚠️ **Truckbase may require partner/enterprise access for API**

- Not all Truckbase accounts have API access
- May need to contact Truckbase sales
- API documentation: https://app.truckbase.io/settings/integrations

### 2. Authentication

Truckbase uses **dual authentication**:
- API Key (X-API-Key header)
- API Secret (X-API-Secret header)

Both are required for all requests.

### 3. Rate Limiting

- Check Truckbase API documentation for rate limits
- The adapter includes retry logic (exponential backoff)
- If rate limited, wait and retry

### 4. Data Transformation

The adapter transforms Truckbase format → SALLY format:
- Handles multiple field name variations
- Normalizes location data
- Maps status values
- Adds `data_source: 'truckbase_tms'` tag

---

## Next Steps After Testing

Once Truckbase integration is working:

1. **Enable Automatic Sync**
   - Set sync interval (default: 5 minutes)
   - Scheduler runs automatically
   - Monitors `IntegrationSyncLog` for failures

2. **Monitor Sync Health**
   - Check sync history UI
   - Review success rates
   - Alert triggers on 3+ failures

3. **Use Load Data**
   - Loads available in route planning
   - Driver assignments synced
   - Real-time status updates

4. **Add More Vendors**
   - Follow same pattern for other TMS systems
   - Implement same interface: `ITMSAdapter`
   - Add to UI vendor list

---

## Support & Resources

**Truckbase:**
- Dashboard: https://app.truckbase.io
- API Settings: https://app.truckbase.io/settings/integrations
- Support: support@truckbase.io

**SALLY Implementation:**
- Adapter: `apps/backend/src/services/adapters/tms/truckbase-tms.adapter.ts`
- Interface: `apps/backend/src/services/adapters/tms/tms-adapter.interface.ts`
- Integration Manager: `apps/backend/src/services/integration-manager/integration-manager.service.ts`
- UI: `apps/web/src/components/settings/ConnectionsTab.tsx`

---

**Happy Testing! 🚛**

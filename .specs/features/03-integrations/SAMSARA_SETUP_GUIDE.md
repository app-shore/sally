# Samsara API Key Setup Guide

**Purpose:** Get Samsara API credentials for HOS/ELD integration
**Date:** February 2, 2026

---

## Overview

Samsara is a leading fleet management platform providing ELD (Electronic Logging Device) compliance, GPS tracking, and Hours of Service (HOS) data. Their API allows you to pull driver HOS data, vehicle locations, and compliance information.

---

## Step-by-Step: Getting Samsara API Key

### Option 1: Free Trial Account (Recommended for Testing)

#### Step 1: Sign Up for Free Trial

1. **Visit:** https://www.samsara.com/free-trial
   - Or: https://cloud.samsara.com/signup

2. **Fill Out the Form:**
   ```
   First Name: [Your Name]
   Last Name: [Your Name]
   Email: [Your Work Email]
   Phone: [Your Phone]
   Company Name: [Your Company]
   Fleet Size: [Select appropriate size]
   ```

3. **Select Trial Type:**
   - Choose: "Fleet Operations" or "ELD Compliance"
   - Trial Duration: 30 days free
   - No credit card required for trial

4. **Verify Email:**
   - Check your email inbox
   - Click verification link
   - Complete account setup

#### Step 2: Access Samsara Dashboard

1. **Login:** https://cloud.samsara.com/login
2. **Complete Onboarding:**
   - Add your organization details
   - Set up your first vehicle (optional)
   - Configure basic settings

#### Step 3: Generate API Token

1. **Navigate to API Settings:**
   ```
   Dashboard → Settings (gear icon) → Organization → API Tokens
   ```

   **Direct URL:** https://cloud.samsara.com/settings/api

2. **Create New API Token:**
   - Click: **"Create New Token"** button
   - Token Name: `SALLY Integration`
   - Description: `Fleet management and route planning integration`
   - Permissions: Select all needed scopes (see Permissions section below)

3. **Copy API Token:**
   ```
   IMPORTANT: Copy the token immediately!
   You won't be able to see it again after closing the dialog.

   Format: samsara_api_1234567890abcdef...
   Length: ~100+ characters
   ```

4. **Store Securely:**
   - Save to password manager (1Password, LastPass, etc.)
   - Or save to secure `.env` file (never commit to git)
   - **DO NOT** share publicly or commit to code

---

### Option 2: Existing Samsara Account

If you already have a Samsara account:

#### Step 1: Login

1. Visit: https://cloud.samsara.com/login
2. Enter your credentials
3. Select your organization (if multiple)

#### Step 2: Generate API Token

1. **Navigate to:**
   ```
   Settings → Organization → API Tokens
   ```

2. **Create Token:**
   - Click "Create New Token"
   - Name: `SALLY Integration`
   - Select permissions (see below)
   - Click "Create"

3. **Copy and Save Token**

---

### Option 3: Request from Fleet Manager

If you're not the account admin:

1. **Contact your Samsara administrator:**
   ```
   Hi [Admin Name],

   I need a Samsara API token for our SALLY fleet management integration.

   Required permissions:
   - Read access to HOS data
   - Read access to driver information
   - Read access to vehicle data

   Can you create an API token named "SALLY Integration" and share it with me?

   Thanks!
   ```

2. **Receive Token:**
   - Admin creates token
   - Admin shares securely (encrypted email, Slack, password manager)

---

## API Token Permissions (Scopes)

When creating the API token, select these permissions:

### Required Scopes:

✅ **Driver (Read)**
- View driver information
- Access driver profiles
- Read driver status

✅ **HOS (Hours of Service) (Read)**
- View HOS logs
- Read duty status
- Access available drive time
- View violations

✅ **Vehicle (Read)**
- View vehicle information
- Access vehicle locations
- Read vehicle status

### Optional (But Recommended):

⚠️ **GPS/Locations (Read)**
- Real-time vehicle tracking
- Historical location data

⚠️ **Safety Events (Read)**
- Harsh braking, acceleration
- Collision detection

⚠️ **Documents (Read)**
- Driver documents
- Compliance records

---

## API Token Format

**What it looks like:**
```
samsara_api_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqr
```

**Characteristics:**
- Starts with: `samsara_api_`
- Length: ~100+ characters
- Contains: Letters (upper/lower case), numbers
- Case-sensitive
- No spaces or special characters

---

## Testing Your API Token

### Method 1: Via cURL (Quick Test)

```bash
# Set your API token
export SAMSARA_API_TOKEN="samsara_api_lgUZIbVRbztwD0VbBVaYhO3FRzfZMn"

# Test: Get list of drivers
curl -X GET "https://api.samsara.com/fleet/drivers" \
  -H "Authorization: Bearer $SAMSARA_API_TOKEN" \
  -H "Accept: application/json"

# Expected Response (Success):
# {
#   "data": [
#     {
#       "id": "123456",
#       "name": "John Smith",
#       "username": "jsmith",
#       ...
#     }
#   ]
# }

# Expected Response (Invalid Token):
# {
#   "message": "Invalid authorization credentials"
# }
```

### Method 2: Via Samsara API Explorer

1. **Visit:** https://developers.samsara.com/reference
2. **Click:** "Authorize" button (top right)
3. **Enter:** Your API token
4. **Try:** Any endpoint (e.g., "List Drivers")
5. **Verify:** 200 OK response

### Method 3: Via SALLY Integration UI

1. **Open SALLY:** http://localhost:3000
2. **Navigate:** Settings → Connections → Hours of Service (ELD)
3. **Click:** "Add New Connection"
4. **Select:** "Samsara"
5. **Enter:**
   - Display Name: `Samsara Production`
   - API Key: `[paste your token]`
6. **Click:** "Test Connection"
7. **Expected:** ✅ "Connection successful"

---

## Samsara API Endpoints Used by SALLY

### 1. Get Driver HOS Data
```
GET /fleet/drivers/{driverId}/hos/logs
```
**Returns:** HOS logs, duty status, available drive time

### 2. List All Drivers
```
GET /fleet/drivers
```
**Returns:** All drivers in your fleet

### 3. Get Vehicle Locations
```
GET /fleet/vehicles/locations
```
**Returns:** Real-time vehicle GPS coordinates

### 4. Get HOS Daily Logs
```
GET /fleet/hos/logs
```
**Returns:** Daily HOS logs for all drivers

---

## API Limits & Pricing

### Free Trial:
- **Duration:** 30 days
- **API Rate Limit:** 30 requests per second
- **Full API Access:** Yes
- **Data Retention:** 30 days
- **Devices:** Up to 5 test devices

### Production Account:
- **Pricing:** Contact Samsara sales
- **Rate Limit:** Higher limits (custom)
- **Data Retention:** Configurable
- **Support:** Priority support

### API Rate Limits:
```
Standard: 30 requests/second
Burst: Up to 100 requests in 10 seconds
Daily: Unlimited (within rate limits)
```

**Best Practice:** Cache HOS data for 5 minutes to stay well under limits

---

## Configuring in SALLY

### Via UI (Recommended)

1. **Start Backend:**
   ```bash
   cd apps/backend
   npm run start:dev
   ```

2. **Open Browser:**
   ```
   http://localhost:3000
   ```

3. **Navigate to Settings:**
   ```
   Settings → Connections → Hours of Service (ELD)
   ```

4. **Add Integration:**
   ```
   Click: "Add New Connection"
   Select: "Samsara"
   Display Name: "Samsara Production"
   API Key: [paste your token]
   Sync Interval: 300 seconds (5 minutes)
   ```

5. **Test & Save:**
   ```
   Click: "Test Connection" → Should show success
   Click: "Save" → Integration stored with encrypted token
   ```

6. **Manual Sync:**
   ```
   Click: "Manual Sync" → Pulls HOS data for all drivers
   ```

### Via API

```bash
# Login to SALLY
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sally.app",
    "password": "your-password"
  }'

# Save JWT token
export JWT_TOKEN="<token-from-response>"

# Create Samsara integration
curl -X POST http://localhost:8000/api/v1/integrations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "integration_type": "HOS_ELD",
    "vendor": "SAMSARA_ELD",
    "display_name": "Samsara Production",
    "credentials": {
      "apiKey": "samsara_api_your_actual_token"
    },
    "sync_interval_seconds": 300
  }'

# Test connection
curl -X POST http://localhost:8000/api/v1/integrations/$INTEGRATION_ID/test \
  -H "Authorization: Bearer $JWT_TOKEN"

# Trigger manual sync
curl -X POST http://localhost:8000/api/v1/integrations/$INTEGRATION_ID/sync \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## Troubleshooting

### Issue: "Invalid authorization credentials"

**Cause:** Invalid or expired API token

**Solution:**
1. Verify token is copied correctly (no extra spaces)
2. Check token hasn't been deleted in Samsara dashboard
3. Generate new token if needed
4. Ensure token starts with `samsara_api_`

### Issue: "Insufficient permissions"

**Cause:** API token doesn't have required scopes

**Solution:**
1. Go to Samsara dashboard → API Tokens
2. Delete old token
3. Create new token with all required permissions:
   - Driver (Read)
   - HOS (Read)
   - Vehicle (Read)

### Issue: "Rate limit exceeded"

**Cause:** Too many API requests

**Solution:**
- Default sync interval is 5 minutes (safe)
- Don't trigger manual syncs too frequently
- SALLY caches HOS data automatically

### Issue: "No drivers found"

**Possible Causes:**
1. No drivers added to Samsara account
2. Drivers not activated
3. Wrong organization selected

**Solution:**
1. Add test driver in Samsara dashboard
2. Activate driver
3. Verify driver appears in Samsara UI
4. Try sync again

---

## Security Best Practices

### DO:
✅ Store API token in environment variables
✅ Use password manager for backup
✅ Encrypt token in database (SALLY does this automatically)
✅ Rotate tokens every 90 days
✅ Use separate tokens for dev/staging/production
✅ Monitor token usage in Samsara dashboard

### DON'T:
❌ Commit token to git repository
❌ Share token in Slack/email (use encrypted method)
❌ Use production token in development
❌ Log full token in application logs
❌ Store token in plain text files
❌ Share same token across multiple apps

---

## Samsara Resources

**Official Links:**
- Homepage: https://www.samsara.com
- Free Trial: https://www.samsara.com/free-trial
- Login: https://cloud.samsara.com/login
- API Documentation: https://developers.samsara.com
- API Reference: https://developers.samsara.com/reference
- Support: https://www.samsara.com/support

**Developer Resources:**
- API Explorer: https://developers.samsara.com/reference
- API Changelog: https://developers.samsara.com/changelog
- Rate Limits: https://developers.samsara.com/docs/rate-limits
- Authentication Guide: https://developers.samsara.com/docs/authentication

**Support Contacts:**
- Sales: sales@samsara.com
- Support: support@samsara.com
- Phone: 1-415-985-2400

---

## Quick Reference

### Essential Information

| Item | Value |
|------|-------|
| **API Base URL** | `https://api.samsara.com` |
| **Authentication** | Bearer Token |
| **Token Format** | `samsara_api_[100+ chars]` |
| **Rate Limit** | 30 requests/second |
| **Data Retention (Trial)** | 30 days |
| **Trial Duration** | 30 days free |
| **Primary Use Case** | HOS/ELD compliance data |

### Quick Start Checklist

- [ ] Sign up for Samsara free trial
- [ ] Verify email and login
- [ ] Navigate to Settings → API Tokens
- [ ] Create new token named "SALLY Integration"
- [ ] Select permissions: Driver, HOS, Vehicle (all Read)
- [ ] Copy and save token securely
- [ ] Test token with cURL or API Explorer
- [ ] Add integration in SALLY UI
- [ ] Test connection in SALLY
- [ ] Trigger manual sync
- [ ] Verify HOS data appears in SALLY dashboard

---

## What HOS Data You'll Get

Once integrated, SALLY pulls:

### Driver HOS Data:
- **Duty Status:** ON_DUTY, DRIVING, SLEEPER_BERTH, OFF_DUTY
- **Available Hours:**
  - Drive time remaining (11-hour limit)
  - Shift time remaining (14-hour limit)
  - Cycle time remaining (60/70-hour limit)
- **Current Location:** GPS coordinates, city, state
- **Violations:** HOS violations if any
- **Logs:** Historical duty status logs

### Example HOS Response:
```json
{
  "driver_id": "123456",
  "driver_name": "John Smith",
  "current_status": "DRIVING",
  "hours_remaining": {
    "drive": 7.5,
    "shift": 9.0,
    "cycle": 45.5
  },
  "current_location": {
    "latitude": 33.4484,
    "longitude": -112.074,
    "city": "Phoenix",
    "state": "AZ"
  },
  "last_updated": "2026-02-02T18:30:00Z",
  "data_source": "samsara_eld"
}
```

---

## Summary

**To get started with Samsara:**

1. **Sign up:** https://www.samsara.com/free-trial (30 days free)
2. **Generate token:** Settings → API Tokens → Create New Token
3. **Copy token:** Starts with `samsara_api_`
4. **Add to SALLY:** Settings → Connections → Samsara
5. **Test & Sync:** Connection test → Manual sync
6. **Done!** HOS data now pulling every 5 minutes

**Need help?** Contact Samsara support at support@samsara.com or visit https://www.samsara.com/support

---

**Ready to integrate Samsara with SALLY!** 🚛📋

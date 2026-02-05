# Google Maps API Setup Guide

## Overview

SALLY supports two methods for calculating distances between stops:

1. **Haversine Formula** (Default) - Fast, free, no API needed
   - Calculates straight-line distance with 1.2x road factor
   - ~10-15% error vs actual road distance
   - Perfect for development and testing
   - No configuration required

2. **Google Maps Distance Matrix API** (Optional) - More accurate
   - Follows actual roads
   - Real-time traffic considerations available
   - Requires API key and billing setup
   - ~$0.005-0.010 USD per request

## When to Use Google Maps API

**Use Haversine (default) when:**
- Developing and testing
- Running in demo/staging environments
- Distance accuracy within 10-15% is acceptable
- Want to avoid API costs

**Use Google Maps when:**
- Production deployment with customers
- Need road-accurate distances
- Planning routes through complex road networks (mountains, rivers, etc.)
- Budget allows for API costs (~$5-10 per 1000 routes)

## Google Maps API Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name: **"SALLY Route Planning"** (or your preferred name)
4. Click **"Create"**
5. Wait for project creation (takes ~30 seconds)

### Step 2: Enable Distance Matrix API

1. In the Cloud Console, navigate to **"APIs & Services"** → **"Library"**
2. Search for: **"Distance Matrix API"**
3. Click on it
4. Click **"Enable"**
5. Wait for activation (~10 seconds)

### Step 3: Enable Billing (Required)

⚠️ **Important:** Distance Matrix API requires a billing account even for free tier usage.

1. Go to **"Billing"** in Google Cloud Console
2. Click **"Link a billing account"** or **"Create billing account"**
3. Enter payment information (credit card required)
4. **Recommended:** Set up budget alerts to avoid surprise charges:
   - Go to **"Billing"** → **"Budgets & alerts"**
   - Create a budget (e.g., $20/month)
   - Set alert threshold at 50%, 90%, 100%

### Step 4: Create API Key

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"API Key"**
3. Copy the API key (starts with `AIza...`)
4. **DO NOT COMMIT THIS KEY TO VERSION CONTROL!**

### Step 5: Restrict API Key (Highly Recommended)

Unrestricted keys can be stolen and abused, leading to large bills.

1. Click **"Edit API key"** (pencil icon)
2. Under **"API restrictions"**, select **"Restrict key"**
3. Check **"Distance Matrix API"**
4. Under **"Application restrictions"** (optional but recommended):
   - For local development: Select "IP addresses" and add your server IP
   - For production: Select "HTTP referrers" and add your domain
5. Click **"Save"**

### Step 6: Configure SALLY Backend

1. Open `apps/backend/.env` (create from `.env.example` if needed)
2. Add your API key:

```bash
# Distance Calculation Configuration
DISTANCE_CALCULATION_METHOD=google_maps

# Google Maps API Key
GOOGLE_MAPS_API_KEY=AIza...your_key_here
```

3. Restart the backend server

### Step 7: Verify Setup

Test the API integration:

```bash
# From the backend directory
npm run test:distance-calc
```

Or make a test request to your running backend:

```bash
curl -X POST http://localhost:3001/api/v1/routes/plan \
  -H "Content-Type: application/json" \
  -d '{
    "driver_state": { "hours_driven": 0, "on_duty_time": 0, "hours_since_break": 0 },
    "vehicle_state": { "fuel_capacity_gallons": 200, "current_fuel_gallons": 150, "mpg": 6.5 },
    "stops": [
      { "stop_id": "STP-001", "name": "Dallas DC", "lat": 32.7767, "lon": -96.7970, "is_origin": true },
      { "stop_id": "STP-002", "name": "Houston DC", "lat": 29.7604, "lon": -95.3698, "is_destination": true }
    ]
  }'
```

Check the logs - you should see:
```
Distance calculated via Google Maps: 239.4 mi, 3.85 hrs
```

## Cost Estimation

### Pricing (as of January 2026)

- **Distance Matrix API:** $0.005 - $0.010 per element
- **Free tier:** $200 credit per month (~20,000-40,000 requests)

### Cost Examples

**Development/Testing:**
- 100 routes/day × 3 stops average = 300 elements/day
- Cost: ~$1.50 - $3.00 per day
- Monthly: ~$45 - $90

**Production (Small Fleet):**
- 500 routes/day × 4 stops average = 2,000 elements/day
- Cost: ~$10 - $20 per day
- Monthly: ~$300 - $600

**Production (Large Fleet):**
- 2,000 routes/day × 5 stops average = 10,000 elements/day
- Cost: ~$50 - $100 per day
- Monthly: ~$1,500 - $3,000

### Cost Optimization Tips

1. **Cache results:** Store distance calculations in Redis for common routes
2. **Use Haversine for estimation:** Switch to Google Maps only for final plan
3. **Batch requests:** Calculate multiple routes in parallel
4. **Monitor usage:** Set up billing alerts to catch issues early

## Switching Between Methods

You can switch calculation methods without code changes:

### Use Haversine (Free)
```bash
DISTANCE_CALCULATION_METHOD=haversine
# GOOGLE_MAPS_API_KEY not needed
```

### Use Google Maps
```bash
DISTANCE_CALCULATION_METHOD=google_maps
GOOGLE_MAPS_API_KEY=AIza...your_key_here
```

The system will automatically fall back to Haversine if:
- Google Maps API key is not configured
- API request fails (timeout, rate limit, etc.)
- API returns an error

## Troubleshooting

### Error: "GOOGLE_MAPS_API_KEY not configured"

**Solution:** Add the API key to your `.env` file or switch to Haversine method.

### Error: "Google Maps API error: REQUEST_DENIED"

**Possible causes:**
1. Billing not enabled on Google Cloud project
2. Distance Matrix API not enabled
3. API key restrictions blocking the request

**Solution:**
1. Verify billing is active: [Billing Console](https://console.cloud.google.com/billing)
2. Verify API is enabled: [API Library](https://console.cloud.google.com/apis/library)
3. Check API key restrictions aren't too strict

### Error: "No route found: ZERO_RESULTS"

**Cause:** Google Maps couldn't find a route between the coordinates (e.g., across ocean).

**Solution:** Check your stop coordinates are valid and on connected roads.

### Slow Response Times

**Cause:** Google Maps API adds ~100-500ms per request.

**Solution:**
1. Enable response caching
2. Use Haversine for initial planning, Google Maps for final plan
3. Calculate distances in parallel using `Promise.all()`

## Security Best Practices

1. **Never commit API keys to git**
   - Add `.env` to `.gitignore` (already done)
   - Use environment variables in production

2. **Restrict API keys**
   - Enable API restrictions (Distance Matrix only)
   - Enable application restrictions (IP or HTTP referrer)

3. **Monitor usage**
   - Set up billing alerts
   - Review Google Cloud Console weekly
   - Log all API requests for audit trail

4. **Rotate keys periodically**
   - Create new key every 6-12 months
   - Delete old keys after rotation

## Support

For issues with:
- **Google Maps API:** [Google Maps Platform Support](https://developers.google.com/maps/support)
- **SALLY Integration:** Create an issue in the repository

## References

- [Google Maps Distance Matrix API Documentation](https://developers.google.com/maps/documentation/distance-matrix/overview)
- [Google Cloud Billing](https://cloud.google.com/billing/docs)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)

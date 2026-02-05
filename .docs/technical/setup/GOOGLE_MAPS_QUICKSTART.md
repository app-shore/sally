# Google Maps API - Quick Setup (5 Minutes)

## When Do You Need This?

**You DON'T need this for:**
- ✅ Development and testing (Haversine works great!)
- ✅ Demo environment
- ✅ If distance accuracy within 10-15% is acceptable

**You NEED this for:**
- ⚠️ Production with real customers
- ⚠️ Need exact road distances
- ⚠️ Planning through complex terrain

---

## Quick Setup (5 Steps)

### 1. Create Google Cloud Project (1 minute)
1. Go to: https://console.cloud.google.com/
2. Click "New Project"
3. Name: "SALLY Route Planning"
4. Click "Create"

### 2. Enable Distance Matrix API (30 seconds)
1. Go to: "APIs & Services" → "Library"
2. Search: "Distance Matrix API"
3. Click "Enable"

### 3. Set Up Billing (2 minutes)
⚠️ **Required even for free tier**

1. Go to: "Billing"
2. Link credit card
3. **Set budget alert:** $20/month to avoid surprises

### 4. Create API Key (30 seconds)
1. Go to: "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the key (starts with `AIza...`)

### 5. Restrict API Key (1 minute)
🔒 **Critical for security!**

1. Click "Edit API key"
2. Under "API restrictions":
   - Select "Restrict key"
   - Check "Distance Matrix API" only
3. Click "Save"

---

## Configure SALLY

Add to `apps/backend/.env`:

```bash
DISTANCE_CALCULATION_METHOD=google_maps
GOOGLE_MAPS_API_KEY=AIza...your_key_here
```

Restart backend:
```bash
cd apps/backend
npm run start:dev
```

---

## Verify It Works

Check backend logs when generating a route plan:

✅ **Success:**
```
[DistanceCalculator] Distance calculated via Google Maps: 239.4 mi, 3.85 hrs
```

❌ **Failed (falls back to Haversine):**
```
[DistanceCalculator] Google Maps API failed, falling back to Haversine
[DistanceCalculator] Distance calculated via Haversine: 239.4 mi, 4.3 hrs
```

---

## Cost Estimate

### Free Tier
- $200 credit/month = ~20,000-40,000 requests
- Good for: Small fleets, light usage

### Paid Usage
- **Small fleet:** 500 routes/day = ~$300-600/month
- **Medium fleet:** 1,500 routes/day = ~$900-1,800/month
- **Large fleet:** 3,000 routes/day = ~$1,800-3,600/month

---

## Need Help?

**Full guide:** See `.docs/GOOGLE_MAPS_SETUP.md`

**Common issues:**
- "REQUEST_DENIED" → Billing not enabled or API not activated
- "ZERO_RESULTS" → Invalid coordinates
- Still using Haversine → Check `.env` file and restart backend

**Switch back to free Haversine:**
```bash
DISTANCE_CALCULATION_METHOD=haversine
# Remove or comment out GOOGLE_MAPS_API_KEY
```

---

## Security Checklist

- ✅ API key restricted to Distance Matrix API only
- ✅ Billing alerts configured
- ✅ `.env` file in `.gitignore` (already done)
- ✅ API key never committed to git

---

**That's it!** 🎉

SALLY will now use Google Maps for accurate road distances.

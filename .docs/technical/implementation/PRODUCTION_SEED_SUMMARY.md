# Production Seed Summary

## What Gets Seeded in Production Mode

When you run `npm run db:seed` in production mode (`SEED_MODE=production` or no SEED_MODE set), the following data is created:

### 1. Super Admin User
- **Email:** `admin@sally.com`
- **Password:** Value from `SUPER_ADMIN_PASSWORD` env var (default: `Sally@Admin123!`)
- **Role:** `SUPER_ADMIN`
- **Firebase UID:** Automatically created and linked
- **Email Verified:** `true`
- **User Preferences:** Created automatically

### 2. Sample Alerts (3)
For testing the dispatcher dashboard alert system:

| Alert ID | Type | Priority | Title | Created |
|----------|------|----------|-------|---------|
| ALT-SAMPLE-001 | DRIVER_NOT_MOVING | high | Sample Alert: Driver Not Moving | 2 hours ago |
| ALT-SAMPLE-002 | HOS_APPROACHING_LIMIT | medium | Sample Alert: HOS Approaching Limit | 30 minutes ago |
| ALT-SAMPLE-003 | FUEL_LOW | high | Sample Alert: Fuel Low | 15 minutes ago |

**Note:** These alerts have no tenant or driver association (for testing purposes).

### 3. Feature Flags
All application feature flags are seeded from `apps/backend/prisma/seeds/feature-flags.seed.ts`.

---

## What is NOT Seeded

The following are intentionally NOT created in production mode:

- ❌ No tenants (fleet companies)
- ❌ No drivers
- ❌ No vehicles
- ❌ No loads, stops, or load stops
- ❌ No scenarios
- ❌ No test users (dispatchers, drivers)
- ❌ No dispatcher/driver preferences

**Why?** Real tenants register themselves through the registration flow.

---

## User Registration Flow After Seeding

### Step 1: Super Admin Login
```
URL: https://sally.apps.appshore.in
Email: admin@sally.com
Password: <SUPER_ADMIN_PASSWORD>
```

### Step 2: Fleet Company Registration
- Fleet companies register via `/register` page
- Provides: Company name, DOT number, contact info, admin credentials
- Status: `PENDING_APPROVAL`
- Super admin reviews and approves

### Step 3: User Invitations
- After approval, fleet admin can login
- Fleet admin invites dispatchers and drivers
- Users receive invitation emails
- Users complete registration
- Automatically linked to Firebase

---

## Database Schema After Seeding

```
Users Table:
┌────────────────────────┬──────────────┬──────────────┬───────────┐
│ email                  │ role         │ firebaseUid  │ isActive  │
├────────────────────────┼──────────────┼──────────────┼───────────┤
│ admin@sally.com        │ SUPER_ADMIN  │ xyz123...    │ true      │
└────────────────────────┴──────────────┴──────────────┴───────────┘

Alerts Table:
┌────────────────────────┬───────────────────────┬──────────┬──────────┐
│ alertId                │ alertType             │ priority │ status   │
├────────────────────────┼───────────────────────┼──────────┼──────────┤
│ ALT-SAMPLE-001         │ DRIVER_NOT_MOVING     │ high     │ active   │
│ ALT-SAMPLE-002         │ HOS_APPROACHING_LIMIT │ medium   │ active   │
│ ALT-SAMPLE-003         │ FUEL_LOW              │ high     │ active   │
└────────────────────────┴───────────────────────┴──────────┴──────────┘

Feature Flags: (multiple records based on feature-flags.seed.ts)
```

---

## Verification Commands

After seeding, verify the data:

### Check Super Admin
```bash
psql $DATABASE_URL -c "SELECT email, role, \"firebaseUid\", \"isActive\" FROM \"User\" WHERE role = 'SUPER_ADMIN';"
```

Expected:
```
       email       |    role     | firebaseUid  | isActive
-------------------+-------------+--------------+----------
 admin@sally.com   | SUPER_ADMIN | xyz123...    | t
```

### Check Alerts
```bash
psql $DATABASE_URL -c "SELECT \"alertId\", \"alertType\", priority, status FROM \"Alert\";"
```

Expected:
```
    alertId     |      alertType        | priority | status
----------------+----------------------+----------+--------
 ALT-SAMPLE-001 | DRIVER_NOT_MOVING     | high     | active
 ALT-SAMPLE-002 | HOS_APPROACHING_LIMIT | medium   | active
 ALT-SAMPLE-003 | FUEL_LOW              | high     | active
```

### Check Feature Flags
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"FeatureFlag\";"
```

---

## Clean and Minimal

**Total records created:**
- 1 user (super admin)
- 1 user preferences
- 3 alerts
- N feature flags (varies based on application features)

**No test data clutter.** This is a clean production seed that:
- ✅ Allows super admin to login immediately
- ✅ Allows real tenants to register
- ✅ Provides sample alerts for dashboard testing
- ✅ Configures all feature flags

---

## Run Command

```bash
cd apps/backend
export DATABASE_URL='postgresql://sally_user:sally_password@sally-postgres.apps.appshore.in:5432/sally'
export FIREBASE_SERVICE_ACCOUNT_KEY='<your-firebase-key>'
export SUPER_ADMIN_PASSWORD='YourSecurePassword!'
npm run db:seed
```

**That's it!** Clean, minimal, production-ready seeding.

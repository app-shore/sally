# Seed CapRover Database (Manual SQL)

## ✅ SQL Script Tested and Working

The SQL seed script has been tested locally and works perfectly!

---

## Quick Command (CapRover)

```bash
# From your local machine, run:
cat scripts/seed-database.sql | docker exec -i sally-postgres psql -U sally_user -d sally
```

**Or if you're SSH'd into the CapRover server:**

```bash
docker exec -i sally-postgres psql -U sally_user -d sally < /path/to/seed-database.sql
```

---

## What Gets Seeded

✅ **Super Admin User**
- Email: `admin@sally.com`
- User ID: `user_sally_superadmin_001`
- Role: `SUPER_ADMIN`
- Firebase UID: NULL (set manually after creating Firebase user)

✅ **User Preferences**
- Created for super admin

✅ **Feature Flags (10)**
```
 external_integrations_enabled | External Integrations     | admin
 fleet_management_enabled      | Fleet Management          | admin
 alerts_system_enabled         | Automated Alert System    | dispatcher
 command_center_enabled        | Dispatcher Command Center | dispatcher
 continuous_monitoring_enabled | Continuous Monitoring     | dispatcher
 live_tracking_enabled         | Live Route Tracking       | dispatcher
 route_planning_enabled        | Route Planning            | dispatcher
 driver_current_route_enabled  | Driver Current Route View | driver
 driver_dashboard_enabled      | Driver Dashboard          | driver
 driver_messages_enabled       | Driver Messages           | driver
```

All features are **disabled by default** (enabled = false).

---

## After Seeding: Link Firebase User

### Step 1: Create Firebase User

Via **Firebase Console** (easiest):

1. Go to https://console.firebase.google.com/
2. Select project: `sally-c5d82`
3. **Authentication** > **Users** > **Add User**
4. Enter:
   - Email: `admin@sally.com`
   - Password: `SallyAdmin@2026` (or your choice)
5. Click **Add User**
6. **Copy the UID** (e.g., `xyz123abc456...`)

### Step 2: Update Database with Firebase UID

```bash
docker exec -it sally-postgres psql -U sally_user -d sally
```

```sql
UPDATE users
SET firebase_uid = 'xyz123abc456...'  -- Replace with actual UID from Firebase
WHERE email = 'admin@sally.com';

-- Verify
SELECT email, role, firebase_uid FROM users WHERE role = 'SUPER_ADMIN';
```

### Step 3: Test Login

1. Go to https://sally.apps.appshore.in
2. Login:
   - Email: `admin@sally.com`
   - Password: `SallyAdmin@2026`

✅ **Done!**

---

## Verification Queries

The script automatically runs verification at the end, but you can run these manually:

```sql
-- Check super admin
SELECT user_id, email, role, firebase_uid, is_active, created_at
FROM users
WHERE role = 'SUPER_ADMIN';

-- Count feature flags
SELECT COUNT(*) FROM feature_flags;

-- List all feature flags
SELECT key, name, enabled, category
FROM feature_flags
ORDER BY category, key;
```

---

## Script Location

**Full path:** `/Users/ajay-admin/sally/scripts/seed-database.sql`

**Contains:**
- Super admin creation (with idempotency check)
- User preferences
- 10 feature flags (with conflict handling)
- Verification queries
- Next steps instructions

---

## Idempotent & Safe

✅ Script can be run multiple times safely
✅ Uses `ON CONFLICT DO NOTHING` for feature flags
✅ Checks if super admin exists before creating
✅ No data deletion or destructive operations

---

## Summary

```bash
# 1. Seed database
cat scripts/seed-database.sql | docker exec -i sally-postgres psql -U sally_user -d sally

# 2. Create Firebase user (via Firebase Console)
#    Email: admin@sally.com
#    Password: SallyAdmin@2026

# 3. Link Firebase UID
docker exec -it sally-postgres psql -U sally_user -d sally -c \
  "UPDATE users SET firebase_uid = 'your-uid' WHERE email = 'admin@sally.com';"

# 4. Login at https://sally.apps.appshore.in
```

🚀 **Ready to use!**

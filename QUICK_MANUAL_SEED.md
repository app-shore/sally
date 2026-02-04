# Quick Manual Seed (CapRover)

## One Command to Seed Everything

```bash
docker exec -it sally-postgres psql -U sally_user -d sally -f /path/to/seed-database.sql
```

**Or copy-paste the script:**

```bash
# Connect to database
docker exec -it sally-postgres psql -U sally_user -d sally

# Then paste the entire contents of scripts/seed-database.sql
```

---

## What Gets Seeded

✅ **Super Admin User**
- Email: `admin@sally.com`
- Role: `SUPER_ADMIN`
- User preferences created
- **Note:** Firebase UID is NULL (set manually after creating Firebase user)

✅ **Feature Flags (10)**
- Dispatcher features (5): route planning, live tracking, command center, alerts, monitoring
- Driver features (3): dashboard, current route, messages
- Admin features (2): external integrations, fleet management
- All disabled by default

---

## After Seeding: Link Firebase User

### Step 1: Create Firebase User

**Via Firebase Console (Easiest):**
1. Go to https://console.firebase.google.com/
2. Select project: `sally-c5d82`
3. **Authentication** > **Users** > **Add User**
4. Email: `admin@sally.com`
5. Password: `SallyAdmin@2026`
6. **Copy the UID** (e.g., `xyz123abc456...`)

### Step 2: Link Firebase UID to Database

```sql
UPDATE users
SET firebase_uid = 'xyz123abc456...'  -- Replace with actual UID
WHERE email = 'admin@sally.com';
```

### Step 3: Verify

```sql
SELECT email, role, firebase_uid FROM users WHERE role = 'SUPER_ADMIN';
```

---

## Test Login

1. Go to https://sally.apps.appshore.in
2. Login:
   - Email: `admin@sally.com`
   - Password: `SallyAdmin@2026`

✅ **Done!**

---

## Full Script Location

The complete SQL script is at: `scripts/seed-database.sql`

Contains:
- Super admin creation
- User preferences
- 10 feature flags
- Verification queries

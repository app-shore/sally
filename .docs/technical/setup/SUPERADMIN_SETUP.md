# Manual Super Admin Setup (CapRover)

## Step 1: Connect to CapRover PostgreSQL

```bash
docker exec -it sally-postgres psql -U sally_user -d sally
```

---

## Step 2: Run the SQL Script

Copy and paste this entire script into the PostgreSQL prompt:

```sql
-- Create Super Admin User
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE role = 'SUPER_ADMIN') THEN
        RAISE NOTICE 'Super admin already exists. Skipping.';
    ELSE
        -- Insert super admin user
        INSERT INTO users (
            user_id,
            email,
            first_name,
            last_name,
            role,
            tenant_id,
            firebase_uid,
            is_active,
            email_verified,
            created_at,
            updated_at
        ) VALUES (
            'user_sally_superadmin_001',
            'admin@sally.com',
            'SALLY',
            'Admin',
            'SUPER_ADMIN',
            NULL,
            NULL,
            true,
            true,
            NOW(),
            NOW()
        );

        -- Create user preferences
        INSERT INTO user_preferences (
            user_id,
            created_at,
            updated_at
        ) VALUES (
            (SELECT id FROM users WHERE email = 'admin@sally.com'),
            NOW(),
            NOW()
        );

        RAISE NOTICE 'Super admin created successfully!';
    END IF;
END $$;
```

---

## Step 3: Verify Creation

```sql
SELECT
    user_id,
    email,
    role,
    firebase_uid,
    is_active,
    created_at
FROM users
WHERE role = 'SUPER_ADMIN';
```

Expected output:
```
         user_id          |      email      |    role     | firebase_uid | is_active |         created_at
--------------------------+-----------------+-------------+--------------+-----------+----------------------------
 user_sally_superadmin_001| admin@sally.com | SUPER_ADMIN |              | t         | 2026-02-04 12:00:00.000000
```

---

## Step 4: Create Firebase User Manually

The super admin is now in PostgreSQL, but you need to create the Firebase user and link them.

### Option A: Via Firebase Console (EASIEST)

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: `sally-c5d82`
3. Go to **Authentication** > **Users**
4. Click **Add User**
5. Enter:
   - Email: `admin@sally.com`
   - Password: `SallyAdmin@2026` (or your choice)
6. Click **Add User**
7. **Copy the UID** that Firebase generates (e.g., `xyz123abc456...`)

### Option B: Via Firebase Admin SDK (if you prefer)

Create a script `create-firebase-user.js`:

```javascript
const admin = require('firebase-admin');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'sally-c5d82',
    clientEmail: 'firebase-adminsdk-fbsvc@sally-c5d82.iam.gserviceaccount.com',
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

// Create user
admin.auth().createUser({
  email: 'admin@sally.com',
  password: 'SallyAdmin@2026',
  displayName: 'SALLY Admin',
  emailVerified: true,
})
.then((userRecord) => {
  console.log('✅ Firebase user created!');
  console.log('UID:', userRecord.uid);
  console.log('Email:', userRecord.email);
  process.exit(0);
})
.catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
```

Then run:
```bash
FIREBASE_PRIVATE_KEY="<your-key>" node create-firebase-user.js
```

---

## Step 5: Link Firebase UID to PostgreSQL User

After creating the Firebase user, update the PostgreSQL record with the Firebase UID:

```sql
UPDATE users
SET firebase_uid = 'xyz123abc456...'  -- Replace with actual UID from Firebase
WHERE email = 'admin@sally.com';
```

Verify:
```sql
SELECT email, role, firebase_uid FROM users WHERE role = 'SUPER_ADMIN';
```

---

## Step 6: Test Login

1. Go to https://sally.apps.appshore.in
2. Login with:
   - Email: `admin@sally.com`
   - Password: `SallyAdmin@2026` (or whatever you set in Firebase)

---

1. Create super admin in PostgreSQL (Step 2 above)
2. Don't create Firebase user
3. Use mock login endpoint instead:

```bash
# Login via mock endpoint (doesn't require Firebase)
curl -X POST https://sally-api.apps.appshore.in/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_sally_superadmin_001"}'
```

**Note:** This only works if mock login is enabled in your backend.

---

# CapRover Seed Deployment Guide

## ✅ Local Seed Successful

Your local seed just completed successfully:
- ✓ Super admin created in PostgreSQL
- ✓ Firebase user created (UID: I4ebj2qOIPSUOnDhZwCPkFy9O3p1)
- ✓ Linked together via `firebaseUid`
- ✓ Feature flags seeded
- ✓ Password: `SallyAdmin@2026`

Now let's deploy this to CapRover.

---

## Option 1: Run Seed from Your Local Machine (RECOMMENDED)

Connect to the remote CapRover database from your local machine and run the seed.

### Step 1: Set Remote Database URL

```bash
cd apps/backend

# Create .env.caprover file
cat > .env.caprover << 'EOF'
DATABASE_URL=postgresql://sally_user:sally_password@sally-postgres.apps.appshore.in:5432/sally
FIREBASE_PROJECT_ID=sally-c5d82
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@sally-c5d82.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCVk0bF9c3Q2gff
IXoqQwe6rBz5fPqdB7WqmiTf/eneXlQCwXwTx/mWzO3U3jggsG6ToNGWz6gO/0Kl
JWwMiavxjrfTIhTj4HRqJLbcwkLy9xZ5aAHLcabKXxsZkxk0L41aIGhhwHgXcz5J
V+hAsukx7eTDbwH63OuYMPWGE75g0cJliQ8a0nDmt+dMLf/UvSrfMjpQ8ZbghRZt
04P5Bx+x2HVugUlKrNb3Zs2d4xfE2EfkDCkA9aQyU6/SMxEbm4RVGKrY8TAXflL1
+/Ymrn2MPIdA/W34foe/zho6sOuT8EezuvvRTl3AlZeDkLyLFGohTL+GBejegvw+
YXa4LfxHAgMBAAECggEAEqZb5zf4Uye0Xo5yiI12C8EFFdiO+QBqltyEZ4dl3yuc
xwEwAtlm1fY0W1vf3LeS+gZNy8OVnVUXjrblS4To8wQMCJ/Rwf4NFeUBBfKU3W2Q
mE+vFZpUpRwJqX0tYdPiCJBM449Xifj9FbEHzPVh3S9f3Dxdn1VnbMECBBc3ICQm
a4sH/s4VgasG7q/8y6+ucdj5NBdBI9QoFCax8N3b/TkHDtpz7gP3xgPyW7iP6FtF
QLmhX+ddG4l3TvNZWAriyFZzYh9hs2JIIkijOGJUl9Eb32ETSqR1tDdPj1yY9uMk
IAh9eOBKd7ITbjnzbjtbQ11zsy9zc2pLb5pJ27vibQKBgQDTQZR4HQZcWPcouwXA
1c8TdtujlZCw4+Ro1fw04p8wsA97UShtnvL2PMKU8VPCGkf7p4Kqc4Gg0cjMDN79
HRvzypFmphZ4dFE5YhkUGCrQ/kkiu8rG3ynmLRmMCdjjZRPzSt3I7QeG3V8DP06C
HiKw4bWHgx+wzI1Cnl3PaIfSRQKBgQC1QVPLrNuX//GhFI0Pt0BbD3JMEwlkFL3A
9clNYNEzmRHCfqseGomvi0QcHOvz+KDh/IFokxm5cfl32NtUSI0qp3fwnLhrFAGF
hILcgsnBokbMb91nHpn/PU26G5kpTDJHXx4IYh1ZjwhNnJPBZfLyEjhuxOFH0R44
wkfPSRQDGwKBgCQBj26Rc94Vg7q7dZWSW4LzxSeyfEDJ9sovfpb88Sj5OQpJoNxe
NQbnADsmjqIMnKw1tr2ahkOEvfaZUwBND9CTfAjE0huhp55iK+gS3mlUjd6Pp1YR
/zAuC6aknwTS232iCv8N9zRzUphZF+ZxgHQpZCk+ng4iLwlluJN7O3sJAoGAe/a/
7q68SQq9ISPDDhqQoza/PxRN+erNlGkFUiyDJ7zqjpC/S4lu3WZsIKYPIf7LWYOu
pezlTRWMPtFLwCsWkTOULjWhU2qNV9m2/kVc41evACcJz3r4a75rqHszlzELuhBt
o+ImnJfcX+hUjZLCQ5j+i5OPV+THvJ3zKuuaCj0CgYBksqLsWpG2YepFs6eIOimg
QhTtScsHseerx6zdN+a4CquljYuToUCQsNLs8rTC1rn6r6zsm2IoHnTqT6v+TXtE
XQUNRkXiZQn8KWGT4X+wQ9pbSqWBS/bsFBOcFM+yt/u4LlP7K25SleAqd6ydrhrF
20CJawRVJ+3uW65nq5BIig==
-----END PRIVATE KEY-----
"
SUPER_ADMIN_PASSWORD=YourSecurePassword2026!
EOF
```

### Step 2: Run Seed Against Remote Database

```bash
# Load .env.caprover and run seed
dotenv -e .env.caprover -- npm run db:seed
```

**Or manually:**

```bash
export $(cat .env.caprover | xargs)
npm run db:seed
```

### Step 3: Verify

```bash
# Check if super admin was created
docker exec sally-postgres psql -U sally_user -d sally -c "SELECT email, role, firebase_uid FROM users WHERE role = 'SUPER_ADMIN';"
```

Expected output:
```
       email       |    role     |           firebase_uid
-------------------+-------------+----------------------------------
 admin@sally.com   | SUPER_ADMIN | xyz123...
```

---

## Option 2: Run Seed Inside CapRover Container

SSH into the CapRover container and run the seed script.

### Step 1: Find the Container

```bash
# SSH into your CapRover server first
ssh root@your-caprover-server

# Find the sally-api container
docker ps | grep sally-api
```

### Step 2: Execute Seed Inside Container

```bash
# Get container ID from above
CONTAINER_ID=<your-container-id>

# Run seed script
docker exec -it $CONTAINER_ID npm run db:seed
```

**Note:** The container already has the environment variables set in CapRover, so Firebase should work automatically.

---

## Option 3: Add Seed to CapRover App Settings

Add a post-deployment hook in CapRover to automatically run the seed on first deploy.

### Step 1: Go to CapRover Dashboard

1. Open CapRover dashboard
2. Navigate to `sally-api` app
3. Go to "Deployment" tab

### Step 2: Add Pre-Deploy Script

Add this to the "Pre Deploy Function" section:

```bash
#!/bin/bash
# Run seed only if super admin doesn't exist
docker exec $CAPTAIN_CONTAINER_NAME node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
    .then(user => {
      if (!user) {
        require('child_process').execSync('npm run db:seed', { stdio: 'inherit' });
      } else {
        console.log('Super admin already exists - skipping seed');
      }
    })
    .finally(() => prisma.\$disconnect());
"
```

---

## Environment Variables Required on CapRover

Make sure these are set in CapRover > sally-api > App Configs:

```bash
DATABASE_URL=postgresql://sally_user:sally_password@srv-captain--sally-postgres:5432/sally

FIREBASE_PROJECT_ID=sally-c5d82
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@sally-c5d82.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCVk0bF9c3Q2gff
... (full key)
-----END PRIVATE KEY-----

SUPER_ADMIN_PASSWORD=YourSecurePassword2026!
```

**Important:** Use the full Firebase private key (with newlines). CapRover will handle the escaping.

---

## Verification After Seeding

### Check Database

```bash
docker exec sally-postgres psql -U sally_user -d sally -c "SELECT email, role, firebase_uid, is_active FROM users;"
```

### Test Login

1. Go to https://sally.apps.appshore.in
2. Login with:
   - Email: `admin@sally.com`
   - Password: `YourSecurePassword2026!` (or whatever you set)

### Check Firebase Console

1. Go to Firebase Console > Authentication > Users
2. You should see `admin@sally.com` listed

---

## Troubleshooting

### "Firebase not configured" Warning

**Cause:** Environment variables not loaded

**Fix:**
- Check that `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are set
- Make sure `FIREBASE_PRIVATE_KEY` includes the full key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Verify newlines are preserved (use quotes around the key)

### "Super admin already exists"

**Cause:** Seed has already run

**Fix:**
- This is normal! The seed script is idempotent
- If you want to re-seed, delete the super admin first:
```bash
docker exec sally-postgres psql -U sally_user -d sally -c "DELETE FROM user_preferences WHERE user_id IN (SELECT id FROM users WHERE role = 'SUPER_ADMIN'); DELETE FROM users WHERE role = 'SUPER_ADMIN';"
```

### Connection Refused to Database

**Cause:** Database not accessible from your machine

**Fix:**
- Make sure port 5432 is open on your CapRover server
- Or use Option 2 (run inside container) instead

---

## Summary

**Recommended Approach:** Option 1 (run from local machine)

```bash
# Create .env.caprover with remote DATABASE_URL and Firebase credentials
# Then run:
export $(cat apps/backend/.env.caprover | xargs)
cd apps/backend && npm run db:seed
```

**Result:**
- ✓ Super admin created in CapRover database
- ✓ Firebase user created and linked
- ✓ Feature flags seeded
- ✓ Ready to login at https://sally.apps.appshore.in

**Login:**
- Email: `admin@sally.com`
- Password: `YourSecurePassword2026!`

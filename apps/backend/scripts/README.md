# Backend Scripts

## Firebase User Creation Script

### Overview
This script creates Firebase authentication accounts for all users defined in the database seed. This allows users to log in with email/password authentication.

### Prerequisites

1. **Firebase Admin SDK Credentials**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Navigate to: **Project Settings** > **Service Accounts**
   - Click **Generate New Private Key**
   - Save the JSON file as `firebase-admin-sdk.json` in `apps/backend/`

2. **Environment Variable (Optional)**
   ```bash
   export FIREBASE_ADMIN_SDK_PATH=/path/to/firebase-admin-sdk.json
   ```

### Usage

```bash
# From apps/backend directory
npm run firebase:create-users
```

### What It Does

Creates Firebase accounts for:
- **SUPER_ADMIN**: `admin@sally.com`
- **JYC Carriers**: 11 users (1 admin, 2 dispatchers, 8 drivers)
- **XYZ Logistics**: 5 users (1 admin, 1 dispatcher, 3 drivers)
- **Test User**: `test@example.com` (multi-tenant)

**Total**: 18 Firebase accounts

### Default Password

All accounts are created with the password: **`Sally@2026!`**

### Features

- ✅ Auto-verifies email addresses
- ✅ Sets custom claims with user roles
- ✅ Skips existing users (idempotent)
- ✅ Provides detailed output with UIDs
- ✅ Error handling per user

### Example Output

```
🔥 Firebase User Creation Script
=====================================

📁 Using service account: /path/to/firebase-admin-sdk.json

🔧 Default password for all accounts: Sally@2026!

Creating Firebase accounts...

✅ CREATED: admin@sally.com
   UID: abc123xyz789
   Role: SUPER_ADMIN
   Password: Sally@2026!

✅ CREATED: admin@jyc.com
   UID: def456uvw012
   Role: ADMIN
   Password: Sally@2026!

⏭️  SKIP: test@example.com (already exists with UID: ghi789rst345)

=====================================
📊 Summary:
   ✅ Created: 17
   ⏭️  Skipped: 1
   ❌ Errors: 0
=====================================

🎉 Firebase accounts created successfully!

🔑 Login Credentials:
─────────────────────────────────────
SUPER_ADMIN: admin@sally.com / Sally@2026!
JYC Admin:   admin@jyc.com / Sally@2026!
XYZ Admin:   admin@xyzlogistics.com / Sally@2026!
─────────────────────────────────────
```

### Security Notes

⚠️ **IMPORTANT**: This script is for **development and testing only**.

For production:
1. Use strong, unique passwords for each account
2. Disable the script or add authentication checks
3. Consider using Firebase email verification flow
4. Implement password reset functionality

### Troubleshooting

**Error: Firebase Admin SDK credentials not found**
```
Solution: Place firebase-admin-sdk.json in apps/backend/ or set FIREBASE_ADMIN_SDK_PATH
```

**Error: auth/email-already-exists**
```
Solution: Script automatically skips existing users. This is expected behavior.
```

**Error: auth/invalid-password**
```
Solution: Ensure password meets Firebase requirements (min 6 characters)
```

### Related Files

- `/apps/backend/scripts/create-firebase-users.ts` - Main script
- `/apps/backend/prisma/seed.ts` - Database seed (defines user list)
- `/apps/web/src/lib/firebase.ts` - Frontend Firebase config

### Next Steps

After running this script:
1. ✅ Users can log in at `/login`
2. ✅ SUPER_ADMIN can approve tenants at `/admin/tenants`
3. ✅ Admins can invite users at `/users`
4. ✅ Admins can activate drivers at `/drivers`

#!/usr/bin/env tsx

/**
 * Firebase User Creation Script
 *
 * Creates Firebase accounts for all users in the database seed data.
 * This allows users to log in with Firebase authentication.
 *
 * Usage:
 *   npm run firebase:create-users
 *
 * Default password for all accounts: "Sally@2026!"
 * (You should change passwords in production)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';

// Default password for all test accounts
const DEFAULT_PASSWORD = 'Sally@2026!';

// User accounts to create (matching seed.ts)
const users = [
  // SUPER_ADMIN
  {
    email: 'admin@sally.com',
    password: DEFAULT_PASSWORD,
    displayName: 'SALLY Admin',
    role: 'SUPER_ADMIN',
  },

  // JYC Carriers
  {
    email: 'admin@jyc.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Admin JYC',
    role: 'ADMIN',
  },
  {
    email: 'dispatcher1@jyc.com',
    password: DEFAULT_PASSWORD,
    displayName: 'James Wilson',
    role: 'DISPATCHER',
  },
  {
    email: 'dispatcher2@jyc.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Jessica Taylor',
    role: 'DISPATCHER',
  },
  {
    email: 'john.smith@jyc.com',
    password: DEFAULT_PASSWORD,
    displayName: 'John Smith',
    role: 'DRIVER',
  },
  {
    email: 'sarah.johnson@jyc.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Sarah Johnson',
    role: 'DRIVER',
  },
  {
    email: 'mike.williams@jyc.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Mike Williams',
    role: 'DRIVER',
  },
  {
    email: 'jane.doe@jyc.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Jane Doe',
    role: 'DRIVER',
  },
  {
    email: 'bob.martinez@jyc.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Bob Martinez',
    role: 'DRIVER',
  },
  {
    email: 'lisa.chen@jyc.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Lisa Chen',
    role: 'DRIVER',
  },
  {
    email: 'tom.brown@jyc.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Tom Brown',
    role: 'DRIVER',
  },
  {
    email: 'emily.davis@jyc.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Emily Davis',
    role: 'DRIVER',
  },

  // XYZ Logistics
  {
    email: 'admin@xyzlogistics.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Admin XYZ',
    role: 'ADMIN',
  },
  {
    email: 'dispatcher1@xyzlogistics.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Robert Anderson',
    role: 'DISPATCHER',
  },
  {
    email: 'carlos.rodriguez@xyzlogistics.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Carlos Rodriguez',
    role: 'DRIVER',
  },
  {
    email: 'maria.garcia@xyzlogistics.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Maria Garcia',
    role: 'DRIVER',
  },
  {
    email: 'david.lee@xyzlogistics.com',
    password: DEFAULT_PASSWORD,
    displayName: 'David Lee',
    role: 'DRIVER',
  },

  // Multi-tenant test user
  {
    email: 'test@example.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Multi Tenant',
    role: 'DISPATCHER',
  },
];

async function main() {
  console.log('🔥 Firebase User Creation Script');
  console.log('=====================================\n');

  // Initialize Firebase Admin SDK
  const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH ||
    path.join(__dirname, '../firebase-admin-sdk.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ ERROR: Firebase Admin SDK credentials not found!');
    console.error(`   Looking for: ${serviceAccountPath}`);
    console.error('\nPlease do ONE of the following:');
    console.error('1. Set FIREBASE_ADMIN_SDK_PATH environment variable');
    console.error('2. Place firebase-admin-sdk.json in apps/backend/');
    console.error('\nDownload from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key');
    process.exit(1);
  }

  console.log(`📁 Using service account: ${serviceAccountPath}\n`);

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  const auth = getAuth();

  console.log(`🔧 Default password for all accounts: ${DEFAULT_PASSWORD}\n`);
  console.log('Creating Firebase accounts...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    try {
      // Check if user already exists
      try {
        const existingUser = await auth.getUserByEmail(user.email);
        console.log(`⏭️  SKIP: ${user.email} (already exists with UID: ${existingUser.uid})`);
        skipped++;
        continue;
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
        // User doesn't exist, proceed to create
      }

      // Create user
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        emailVerified: true, // Auto-verify for test accounts
      });

      // Set custom claims for role
      await auth.setCustomUserClaims(userRecord.uid, {
        role: user.role,
      });

      console.log(`✅ CREATED: ${user.email}`);
      console.log(`   UID: ${userRecord.uid}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password: ${user.password}\n`);
      created++;
    } catch (error: any) {
      console.error(`❌ ERROR creating ${user.email}:`, error.message);
      errors++;
    }
  }

  console.log('\n=====================================');
  console.log('📊 Summary:');
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('=====================================\n');

  if (created > 0) {
    console.log('🎉 Firebase accounts created successfully!\n');
    console.log('🔑 Login Credentials:');
    console.log('─────────────────────────────────────');
    console.log(`SUPER_ADMIN: admin@sally.com / ${DEFAULT_PASSWORD}`);
    console.log(`JYC Admin:   admin@jyc.com / ${DEFAULT_PASSWORD}`);
    console.log(`XYZ Admin:   admin@xyzlogistics.com / ${DEFAULT_PASSWORD}`);
    console.log('─────────────────────────────────────\n');
    console.log('💡 TIP: All accounts use the same password for testing.');
    console.log('   Change passwords in Firebase Console for production.\n');
  }

  if (errors > 0) {
    console.error('⚠️  Some accounts failed to create. Check errors above.');
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

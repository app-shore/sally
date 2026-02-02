#!/usr/bin/env tsx

/**
 * Link Firebase UIDs to Database Users
 *
 * Updates database user records with their corresponding Firebase UIDs.
 * This is required after creating Firebase accounts so the auth service can find users.
 *
 * Usage:
 *   npm run firebase:link-uids
 */

import { PrismaClient } from '@prisma/client';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as path from 'path';
import * as fs from 'fs';

const connectionString = process.env.DATABASE_URL || 'postgresql://sally_user:sally_password@localhost:5432/sally';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔗 Firebase UID Linking Script');
  console.log('=====================================\n');

  // Initialize Firebase Admin SDK
  const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH ||
    path.join(__dirname, '../firebase-admin-sdk.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ ERROR: Firebase Admin SDK credentials not found!');
    console.error(`   Looking for: ${serviceAccountPath}`);
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

  console.log('Fetching all users from database...\n');

  // Get all users from database
  const dbUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firebaseUid: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(`Found ${dbUsers.length} users in database\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const dbUser of dbUsers) {
    try {
      // Skip if already linked
      if (dbUser.firebaseUid) {
        console.log(`⏭️  SKIP: ${dbUser.email} (already linked to ${dbUser.firebaseUid})`);
        skipped++;
        continue;
      }

      // Look up Firebase user by email
      try {
        const firebaseUser = await auth.getUserByEmail(dbUser.email);

        // Update database with Firebase UID
        await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            firebaseUid: firebaseUser.uid,
            emailVerified: firebaseUser.emailVerified,
          },
        });

        console.log(`✅ LINKED: ${dbUser.email}`);
        console.log(`   Database ID: ${dbUser.id}`);
        console.log(`   Firebase UID: ${firebaseUser.uid}\n`);
        updated++;
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.log(`⚠️  NOT FOUND: ${dbUser.email} (no Firebase account)`);
          notFound++;
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error(`❌ ERROR processing ${dbUser.email}:`, error.message);
    }
  }

  console.log('\n=====================================');
  console.log('📊 Summary:');
  console.log(`   ✅ Linked: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped} (already linked)`);
  console.log(`   ⚠️  Not Found: ${notFound} (no Firebase account)`);
  console.log('=====================================\n');

  if (updated > 0) {
    console.log('🎉 Firebase UIDs linked successfully!');
    console.log('   Users can now log in with Firebase authentication.\n');
  }

  if (notFound > 0) {
    console.log('💡 TIP: Run "npm run firebase:create-users" to create Firebase accounts for missing users.\n');
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
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

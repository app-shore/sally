#!/usr/bin/env tsx

/**
 * Bootstrap Super Admin User
 *
 * Creates the first SUPER_ADMIN user in the database.
 * This user is needed to approve tenant registrations.
 *
 * Usage:
 *   npm run bootstrap:super-admin
 *
 * Environment Variables:
 *   SUPER_ADMIN_EMAIL - Email for super admin (default: admin@sally.com)
 *   SUPER_ADMIN_PASSWORD - Password (you'll set this in Firebase)
 *   SUPER_ADMIN_FIREBASE_UID - Firebase UID (optional, can link later)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as readline from 'readline';

const connectionString = process.env.DATABASE_URL || 'postgresql://sally_user:sally_password@localhost:5432/sally';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('🚀 SALLY Super Admin Bootstrap');
  console.log('=====================================\n');

  // Get super admin details
  const email = process.env.SUPER_ADMIN_EMAIL || await question('Enter super admin email (default: admin@sally.com): ') || 'admin@sally.com';
  const firstName = await question('Enter first name (default: SALLY): ') || 'SALLY';
  const lastName = await question('Enter last name (default: Admin): ') || 'Admin';
  const firebaseUid = process.env.SUPER_ADMIN_FIREBASE_UID || await question('Enter Firebase UID (optional, press Enter to skip): ') || undefined;

  console.log('\n📝 Creating SUPER_ADMIN user with:');
  console.log(`   Email: ${email}`);
  console.log(`   Name: ${firstName} ${lastName}`);
  console.log(`   Firebase UID: ${firebaseUid || 'Not linked (can link later)'}`);
  console.log('');

  const confirm = await question('Proceed? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('❌ Cancelled');
    process.exit(0);
  }

  // Check if super admin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (existingSuperAdmin) {
    console.log('\n⚠️  WARNING: A SUPER_ADMIN already exists:');
    console.log(`   Email: ${existingSuperAdmin.email}`);
    console.log(`   Name: ${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);

    const overwrite = await question('\nCreate another SUPER_ADMIN anyway? (yes/no): ');

    if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
      console.log('❌ Cancelled');
      process.exit(0);
    }
  }

  // Check if email already exists
  const existingUser = await prisma.user.findFirst({
    where: { email },
  });

  if (existingUser) {
    console.log('\n❌ ERROR: A user with this email already exists!');
    console.log(`   Email: ${existingUser.email}`);
    console.log(`   Role: ${existingUser.role}`);
    console.log('\nTo convert this user to SUPER_ADMIN, run:');
    console.log(`   UPDATE users SET role = 'SUPER_ADMIN' WHERE email = '${email}';`);
    process.exit(1);
  }

  // Generate userId
  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Create SUPER_ADMIN user
  const superAdmin = await prisma.user.create({
    data: {
      userId,
      email,
      firstName,
      lastName,
      role: 'SUPER_ADMIN',
      firebaseUid: firebaseUid || null,
      emailVerified: true,
      isActive: true,
      tenantId: null, // SUPER_ADMIN is not tied to any tenant
    },
  });

  console.log('\n✅ SUPER_ADMIN created successfully!');
  console.log('=====================================');
  console.log(`   Database ID: ${superAdmin.id}`);
  console.log(`   User ID: ${superAdmin.userId}`);
  console.log(`   Email: ${superAdmin.email}`);
  console.log(`   Role: ${superAdmin.role}`);
  console.log(`   Firebase UID: ${superAdmin.firebaseUid || 'Not linked'}`);
  console.log('=====================================\n');

  if (!firebaseUid) {
    console.log('⚠️  NEXT STEPS:');
    console.log('   1. Create Firebase user for this email:');
    console.log(`      - Email: ${email}`);
    console.log('      - Set a password in Firebase Console');
    console.log('');
    console.log('   2. Link Firebase UID to this user:');
    console.log('      - Get the Firebase UID from Firebase Console');
    console.log('      - Run: npm run firebase:link-uids');
    console.log('      - Or manually update:');
    console.log(`        UPDATE users SET firebase_uid = 'YOUR_FIREBASE_UID' WHERE email = '${email}';`);
  } else {
    console.log('✅ User is linked to Firebase UID');
    console.log('   You can now log in with this email and Firebase password');
  }

  console.log('\n🎉 Bootstrap complete!');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
    await pool.end();
  });

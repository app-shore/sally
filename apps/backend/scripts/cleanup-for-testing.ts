import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Setup Prisma with pg adapter
const connectionString = process.env.DATABASE_URL || 'postgresql://sally_user:sally_password@localhost:5432/sally';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const SUPER_ADMIN_EMAIL = 'admin@sally.com';
const SUPER_ADMIN_USER_ID = 'user_sally_superadmin_001';

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    // Get super admin user
    const superAdmin = await prisma.user.findUnique({
      where: { userId: SUPER_ADMIN_USER_ID },
    });

    if (!superAdmin) {
      console.error('❌ Super admin not found!');
      return;
    }

    console.log(`✅ Found super admin: ${superAdmin.email} (${superAdmin.userId})\n`);

    // 1. Delete all user invitations (skip super admin's if any exist)
    const invitations = await prisma.userInvitation.deleteMany({
      where: {
        NOT: {
          email: SUPER_ADMIN_EMAIL,
        },
      },
    });
    console.log(`🗑️  Deleted ${invitations.count} user invitations`);

    // 2. Delete ALL refresh tokens (including super admin's for a clean slate)
    // Super admin will just need to log in again
    const refreshTokens = await prisma.refreshToken.deleteMany({});
    console.log(`🗑️  Deleted ${refreshTokens.count} refresh tokens (super admin will need to log in again)`);

    // 3. Get all users except super admin
    const usersToDelete = await prisma.user.findMany({
      where: {
        NOT: {
          email: SUPER_ADMIN_EMAIL,
        },
      },
      select: {
        id: true,
        userId: true,
        email: true,
        firebaseUid: true,
      },
    });

    console.log(`\n📋 Found ${usersToDelete.length} users to delete:`);
    usersToDelete.forEach((u) => console.log(`   - ${u.email} (${u.userId})`));

    // 4. Delete all drivers (cascades to driver-related data)
    const drivers = await prisma.driver.deleteMany({});
    console.log(`\n🗑️  Deleted ${drivers.count} drivers`);

    // 5. Delete all tenant-related data before deleting tenants
    // Use raw SQL to handle cascading deletes more efficiently
    console.log('\n🗑️  Deleting all tenant-related data...');

    // Delete in correct order to avoid foreign key violations
    await prisma.$executeRaw`DELETE FROM load_stops`;
    await prisma.$executeRaw`DELETE FROM route_segments`;
    await prisma.$executeRaw`DELETE FROM route_plans`;
    await prisma.$executeRaw`DELETE FROM loads`;
    await prisma.$executeRaw`DELETE FROM vehicles`;
    await prisma.$executeRaw`DELETE FROM alerts`;

    console.log('✅ Deleted all tenant-related data');

    // 6. Delete all users except super admin
    const users = await prisma.user.deleteMany({
      where: {
        NOT: {
          email: SUPER_ADMIN_EMAIL,
        },
      },
    });
    console.log(`🗑️  Deleted ${users.count} users from database`);

    // 7. Delete all tenants (now safe to delete)
    const tenants = await prisma.tenant.deleteMany({});
    console.log(`🗑️  Deleted ${tenants.count} tenants`);

    console.log('\n✅ Database cleanup complete!\n');

    return usersToDelete;
  } catch (error) {
    console.error('❌ Database cleanup error:', error);
    throw error;
  }
}

async function cleanupFirebase(usersToDelete: Array<{ firebaseUid: string | null; email: string }>) {
  console.log('🔥 Starting Firebase cleanup...\n');

  try {
    let deletedCount = 0;
    let errorCount = 0;

    for (const user of usersToDelete) {
      if (!user.firebaseUid) {
        console.log(`⚠️  Skipping ${user.email} (no Firebase UID)`);
        continue;
      }

      try {
        await admin.auth().deleteUser(user.firebaseUid);
        console.log(`✅ Deleted Firebase user: ${user.email}`);
        deletedCount++;
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.log(`⚠️  Firebase user not found: ${user.email} (already deleted)`);
        } else {
          console.error(`❌ Error deleting Firebase user ${user.email}:`, error.message);
          errorCount++;
        }
      }
    }

    console.log(`\n✅ Firebase cleanup complete!`);
    console.log(`   - Deleted: ${deletedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Skipped: ${usersToDelete.length - deletedCount - errorCount}\n`);
  } catch (error) {
    console.error('❌ Firebase cleanup error:', error);
    throw error;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🧪 CLEANUP SCRIPT - Reset to Clean Slate for Testing');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`⚠️  This will delete ALL tenants and users except:`);
  console.log(`   ${SUPER_ADMIN_EMAIL}\n`);
  console.log('📍 This includes:');
  console.log('   - All tenants and their data');
  console.log('   - All users (except super admin)');
  console.log('   - All drivers');
  console.log('   - All user invitations');
  console.log('   - All refresh tokens');
  console.log('   - All Firebase users (except super admin)\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Cleanup database first
    const usersToDelete = await cleanupDatabase();

    // Then cleanup Firebase
    if (usersToDelete && usersToDelete.length > 0) {
      await cleanupFirebase(usersToDelete);
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   ✅ CLEANUP COMPLETE - Database is now in clean state');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('You can now test tenant registration and user management!\n');
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

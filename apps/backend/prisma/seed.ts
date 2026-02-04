import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { seedFeatureFlags } from './seeds/feature-flags.seed';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// Initialize Prisma Client with pg adapter (same as the app)
const connectionString = process.env.DATABASE_URL || 'postgresql://sally_user:sally_password@localhost:5432/sally';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Configuration
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SallyAdmin@2026';

// Initialize Firebase Admin (if configured)
let firebaseAuth: admin.auth.Auth | null = null;
try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    // Use JSON service account key (for CapRover deployment)
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseAuth = admin.auth();
    console.log('✓ Firebase Admin initialized (via service account JSON)');
  } else if (projectId && clientEmail && privateKey) {
    // Use separate env vars (for local development)
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    firebaseAuth = admin.auth();
    console.log('✓ Firebase Admin initialized (via env vars)');
  } else {
    console.log('⚠️  Firebase not configured - skipping Firebase user creation');
  }
} catch (error: any) {
  console.log(`⚠️  Firebase initialization failed: ${error.message}`);
}

/**
 * Create or update Firebase user
 */
async function createFirebaseUser(
  email: string,
  password: string,
  displayName: string
): Promise<string | null> {
  if (!firebaseAuth) {
    return null;
  }

  try {
    // Check if user already exists
    let firebaseUser;
    try {
      firebaseUser = await firebaseAuth.getUserByEmail(email);
      console.log(`   ⏭️  Firebase user exists (UID: ${firebaseUser.uid})`);
      return firebaseUser.uid;
    } catch (err: any) {
      if (err.code !== 'auth/user-not-found') {
        throw err;
      }
    }

    // Create new Firebase user
    firebaseUser = await firebaseAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });

    console.log(`   ✅ Firebase user created (UID: ${firebaseUser.uid})`);
    return firebaseUser.uid;
  } catch (error: any) {
    console.error(`   ❌ Firebase user creation failed:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Check if super admin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (existingSuperAdmin) {
    console.log('⏭️  Super admin already exists - skipping seed');
    console.log(`   Email: ${existingSuperAdmin.email}`);
    console.log(`   Created: ${existingSuperAdmin.createdAt}\n`);
    console.log('✅ Database already seeded. Nothing to do.\n');
    return;
  }

  console.log('📝 Database is empty - seeding super admin and initial data...\n');

  // ============================================================================
  // CREATE SUPER ADMIN (ALWAYS)
  // ============================================================================
  console.log('Creating SUPER_ADMIN user...');

  // Create Firebase user first
  const superAdminFirebaseUid = await createFirebaseUser(
    'admin@sally.com',
    SUPER_ADMIN_PASSWORD,
    'SALLY Admin'
  );

  const superAdmin = await prisma.user.create({
    data: {
      userId: 'user_sally_superadmin_001',
      email: 'admin@sally.com',
      firstName: 'SALLY',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      tenantId: null,
      firebaseUid: superAdminFirebaseUid,
      isActive: true,
      emailVerified: true,
    },
  });

  // Create user preferences for super admin
  await prisma.userPreferences.create({
    data: { userId: superAdmin.id },
  });

  console.log(`✓ Created SUPER_ADMIN user: ${superAdmin.email}`);
  if (superAdminFirebaseUid) {
    console.log(`✓ Linked to Firebase UID: ${superAdminFirebaseUid}`);
  }
  console.log('');

  // Seed feature flags
  await seedFeatureFlags();

  // Final summary
  console.log('\n✅ Database seeded successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Super Admin Credentials');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Email:    admin@sally.com`);
  console.log(`Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 What was seeded:');
  console.log('  ✓ Super admin user (with Firebase auth)');
  console.log('  ✓ Feature flags\n');
  console.log('📝 Next Steps:');
  console.log('  1. Login as super admin');
  console.log('  2. Review/approve tenant registrations');
  console.log('  3. All other users register via the app\n');
}



main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

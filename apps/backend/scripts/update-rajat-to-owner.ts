import { PrismaClient } from '@prisma/client';

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Looking for rajat@sally.com...');

  // Find Rajat's user record
  const user = await prisma.user.findFirst({
    where: {
      email: 'rajat@sally.com',
    },
    include: {
      tenant: true,
    },
  });

  if (!user) {
    console.log('❌ User rajat@sally.com not found');
    return;
  }

  console.log(`\n✅ Found user:`);
  console.log(`   ID: ${user.userId}`);
  console.log(`   Name: ${user.firstName} ${user.lastName}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Current Role: ${user.role}`);
  console.log(`   Tenant: ${user.tenant?.companyName || 'N/A'}`);

  if (user.role === 'OWNER') {
    console.log('\n✅ User is already OWNER. No update needed.');
    return;
  }

  // Update to OWNER role
  console.log(`\n🔄 Updating ${user.email} from ${user.role} to OWNER...`);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'OWNER' },
  });

  console.log('✅ Successfully updated user role to OWNER!');
  console.log(`\n📋 Updated record:`);
  console.log(`   ID: ${updatedUser.userId}`);
  console.log(`   Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
  console.log(`   Email: ${updatedUser.email}`);
  console.log(`   New Role: ${updatedUser.role}`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

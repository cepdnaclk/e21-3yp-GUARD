import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const username = process.env.SUPER_ADMIN_USERNAME;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SUPER_ADMIN_FULLNAME || 'Super Admin';

  if (!email || !username || !password) {
    console.error('⚠️ Skipping Super Admin creation: SUPER_ADMIN_EMAIL, SUPER_ADMIN_USERNAME, or SUPER_ADMIN_PASSWORD not set in .env');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'SUPER_ADMIN',
        emailVerified: true
      },
      create: {
        email,
        username,
        password: hashedPassword,
        fullName,
        role: 'SUPER_ADMIN',
        emailVerified: true
      }
    });

    console.log(`✅ Super Admin configured properly in database: ${user.email} (${user.username})`);
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

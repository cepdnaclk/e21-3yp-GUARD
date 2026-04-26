
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'ravinduashan9999@gmail.com';
  const username = 'ravindu_admin';
  const password = 'AdminPassword123!'; // User can change it later or I can provide it
  const fullName = 'Ravindu Ashan';

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'ADMIN',
        emailVerified: true // Set to true so they can login immediately
      },
      create: {
        email,
        username,
        password: hashedPassword,
        fullName,
        role: 'ADMIN',
        emailVerified: true
      }
    });

    console.log('✅ Admin user created/updated:', user.email);
    console.log('👤 Username:', username);
    console.log('🔑 Password:', password);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

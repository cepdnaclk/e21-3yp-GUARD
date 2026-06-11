// Quick debug script to test login directly without HTTP
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const username = 'superadmin';
const password = 'abcd@1234';

console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 30));
console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);

try {
  console.log('Connecting to database...');
  await prisma.$connect();
  console.log('✅ Connected!');
  
  console.log('Finding user:', username);
  const user = await prisma.user.findUnique({ where: { username } });
  
  if (!user) {
    console.log('❌ User not found!');
    process.exit(1);
  }
  
  console.log('✅ User found:', { id: user.id, username: user.username, role: user.role, emailVerified: user.emailVerified, email: user.email });
  
  const passwordMatch = await bcrypt.compare(password, user.password);
  console.log('Password match:', passwordMatch);
  
  if (!passwordMatch) {
    // Try ChangeMe123!
    const match2 = await bcrypt.compare('ChangeMe123!', user.password);
    console.log('Match with "ChangeMe123!":', match2);
    // Try original password
    const match3 = await bcrypt.compare('3yp_admin_pass', user.password);
    console.log('Match with "3yp_admin_pass":', match3);
  }
  
} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err);
} finally {
  await prisma.$disconnect();
}

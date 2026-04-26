import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({
        where: { email: 'ravinduashan9999@gmail.com' }
    });
    if (admin) {
        console.log(`USERNAME=${admin.username}`);
        console.log(`ROLE=${admin.role}`);
    } else {
        console.log("USER_NOT_FOUND");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

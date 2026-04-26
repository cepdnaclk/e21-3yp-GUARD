import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });
    if (admin) {
        console.log(`ADMIN_USERNAME=${admin.username}`);
        console.log(`ADMIN_EMAIL=${admin.email}`);
    } else {
        console.log("NO_ADMIN_FOUND");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

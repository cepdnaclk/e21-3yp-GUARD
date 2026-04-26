import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Try raw find to see what's in the collection
    const raw = await prisma.$runCommandRaw({
        find: 'Alert',
        filter: {},
        limit: 10
    });
    console.log(JSON.stringify(raw, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

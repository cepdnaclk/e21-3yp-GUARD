import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Delete legacy alert records that use the old 'deviceId' field schema
    // (from a previous branch — incompatible with the current schema)
    const result = await prisma.$runCommandRaw({
        delete: 'Alert',
        deletes: [
            {
                q: { tankId: { $exists: false } }, // old records don't have tankId
                limit: 0  // 0 = delete all matches
            }
        ]
    });

    console.log(`✅ Deleted ${result.n} legacy alert record(s).`);

    const remaining = await prisma.alert.count();
    console.log(`📊 ${remaining} clean alert record(s) remain.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

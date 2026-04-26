import prisma from '../src/lib/prisma.js';

async function main() {
    const admin = await prisma.user.findUnique({ where: { username: 'ravindu_admin' } });
    if (!admin) {
        console.error('ravindu_admin not found');
        return;
    }

    // Update all USER role accounts to be owned by ravindu_admin
    const result = await prisma.user.updateMany({
        where: { role: 'USER' },
        data: { adminId: admin.id }
    });

    console.log(`✅ Updated ${result.count} worker(s) to be owned by ravindu_admin (ID: ${admin.id})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

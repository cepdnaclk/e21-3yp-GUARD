import prisma from '../src/lib/prisma.js';

async function testUnassign() {
    const tankId = 'GUARD-101';
    const username = 'analytics_worker_1';
    const adminUsername = 'ravindu_admin';

    const admin = await prisma.user.findUnique({ where: { username: adminUsername } });
    const worker = await prisma.user.findUnique({ where: { username } });
    const tank = await prisma.tank.findUnique({ where: { tankId } });

    console.log(`Testing unassign for ${username} (${worker.id}) from ${tankId} (${tank.id}) by ${adminUsername} (${admin.id})`);

    // Simulate the controller logic
    const foundTank = await prisma.tank.findFirst({
        where: { tankId, adminId: admin.id },
    });

    if (!foundTank) {
        console.log('❌ Tank not found for this admin.');
        return;
    }

    const foundWorker = await prisma.user.findFirst({
        where: { id: worker.id, role: "USER", adminId: admin.id },
    });

    if (!foundWorker) {
        console.log('❌ Worker not found under this admin.');
        return;
    }

    console.log('✅ Permissions verified. Proceeding with unassign...');

    const nextWorkerIds = (foundTank.workerIds || []).filter(id => id !== worker.id);
    const nextAssignedTankIds = (foundWorker.assignedTankIds || []).filter(id => id !== foundTank.id);

    await prisma.tank.update({
        where: { id: foundTank.id },
        data: { workerIds: nextWorkerIds },
    });

    await prisma.user.update({
        where: { id: foundWorker.id },
        data: { assignedTankIds: nextAssignedTankIds },
    });

    console.log('🎉 Unassign successful!');
}

testUnassign().catch(console.error).finally(() => prisma.$disconnect());

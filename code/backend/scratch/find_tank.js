import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const tank = await prisma.tank.findFirst({
        include: { admin: true }
    });
    if (tank) {
        console.log(`TANK_ID=${tank.tankId}`);
        console.log(`ADMIN_EMAIL=${tank.admin.email}`);
    } else {
        console.log("NO_TANK_FOUND");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

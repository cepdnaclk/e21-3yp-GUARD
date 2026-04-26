import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma.js';

async function main() {
  console.log("🌱 Seeding database...");

  // Clean in dependency-safe order.
  await prisma.tank.deleteMany();

  // Break ADMIN -> USER self-relation before deleting all users.
  await prisma.user.updateMany({
    where: { adminId: { not: null } },
    data: { adminId: null },
  });

  await prisma.user.deleteMany();

  const defaultPassword = 'ChangeMe123!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // ==========================================
  // 👑 SUPER ADMIN
  // ==========================================
  const superAdmin = await prisma.user.create({
    data: {
      username: "superadmin",
      email: "super@guard.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      fullName: "System Creator",
    },
  });

  // ==========================================
  // 🏢 ADMINS
  // ==========================================
  const admin1 = await prisma.user.create({
    data: {
      username: "admin1",
      email: "admin1@guard.com",
      password: hashedPassword,
      role: "ADMIN",
      fullName: "Admin One",
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      username: "admin2",
      email: "admin2@guard.com",
      password: hashedPassword,
      role: "ADMIN",
      fullName: "Admin Two",
    },
  });

  // ==========================================
  // 👷 USERS (Workers under admins)
  // ==========================================
  const user1 = await prisma.user.create({
    data: {
      username: "worker1",
      email: "worker1@guard.com",
      password: hashedPassword,
      role: "USER",
      fullName: "Worker One",
      adminId: admin1.id,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: "worker2",
      email: "worker2@guard.com",
      password: hashedPassword,
      role: "USER",
      fullName: "Worker Two",
      adminId: admin1.id,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      username: "worker3",
      email: "worker3@guard.com",
      password: hashedPassword,
      role: "USER",
      fullName: "Worker Three",
      adminId: admin2.id,
    },
  });

  // ==========================================
  // 🐠 TANKS (owned by admins)
  // ==========================================
  const tank1 = await prisma.tank.create({
    data: {
      tankId: "GUARD-001",
      name: "Main Tank",
      adminId: admin1.id,
      workerIds: [user1.id, user2.id],
      status: "online",
    },
  });

  const tank2 = await prisma.tank.create({
    data: {
      tankId: "GUARD-002",
      name: "Secondary Tank",
      adminId: admin2.id,
      workerIds: [user3.id],
      status: "offline",
    },
  });

  // ==========================================
  // 🔗 Assign tanks to users (Many-to-Many sync)
  // ==========================================
  await prisma.user.update({
    where: { id: user1.id },
    data: {
      assignedTankIds: [tank1.id],
    },
  });

  await prisma.user.update({
    where: { id: user2.id },
    data: {
      assignedTankIds: [tank1.id],
    },
  });

  await prisma.user.update({
    where: { id: user3.id },
    data: {
      assignedTankIds: [tank2.id],
    },
  });

  // ==========================================
  // 🔄 Update latest tank values
  // ==========================================
  await prisma.tank.update({
    where: { id: tank1.id },
    data: {
      lastTemp: 27.1,
      lastPh: 7.0,
      lastTds: 360,
      lastTurb: 12,
      lastWaterLevel: 78,
      status: "online",
    },
  });

  await prisma.tank.update({
    where: { id: tank2.id },
    data: {
      lastTemp: 25.0,
      lastPh: 6.8,
      lastTds: 300,
      lastTurb: 8,
      lastWaterLevel: 85,
      status: "online",
    },
  });

  console.log("✅ Seeding finished!");
  console.log(`Default seeded password: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
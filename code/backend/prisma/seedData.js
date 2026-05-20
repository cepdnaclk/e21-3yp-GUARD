import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Generating Seed Data...');

  // Common password used for all accounts in this seed
  const COMMON_PASSWORD = 'user1234'; 
  const hashedPassword = await bcrypt.hash(COMMON_PASSWORD, 10);

  // 1. Create Admins
  console.log('👤 Creating Admins...');
  const admin1 = await prisma.user.upsert({
    where: { email: 'admin1@guard.com' },
    update: {},
    create: {
      email: 'admin1@guard.com',
      username: 'admin1',
      password: hashedPassword, // Uses "user1234"
      fullName: 'Farm Manager 1',
      role: 'ADMIN',
      emailVerified: true,
      phoneNumber: '+1234567890',
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: 'admin2@guard.com' },
    update: {},
    create: {
      email: 'admin2@guard.com',
      username: 'admin2',
      password: hashedPassword, // Uses "user1234"
      fullName: 'Farm Manager 2',
      role: 'ADMIN',
      emailVerified: true,
      phoneNumber: '+0987654321',
    },
  });

  // 2. Create Workers (Users) assigned strictly to Admin 1
  console.log('👷 Creating Workers...');
  const worker1 = await prisma.user.upsert({
    where: { email: 'worker1@guard.com' },
    update: {},
    create: {
      email: 'worker1@guard.com',
      username: 'worker1',
      password: hashedPassword, // Uses "user1234"
      fullName: 'Worker John',
      role: 'USER',
      emailVerified: true,
      adminId: admin1.id,
    },
  });

  const worker2 = await prisma.user.upsert({
    where: { email: 'worker2@guard.com' },
    update: {},
    create: {
      email: 'worker2@guard.com',
      username: 'worker2',
      password: hashedPassword, // Uses "user1234"
      fullName: 'Worker Doe',
      role: 'USER',
      emailVerified: true,
      adminId: admin1.id,
    },
  });

  // 3. Create Tanks (Owned by Admin 1, Assigned to Workers)
  console.log('🐟 Creating Tanks...');
  const tank1 = await prisma.tank.upsert({
    where: { tankId: 'GUARD-TEST-001' },
    update: {},
    create: {
      tankId: 'GUARD-TEST-001',
      productKey: 'A1B2-C3D4-E5F6-0001',
      name: 'Main Nursery Tank',
      isRegistered: true,
      adminId: admin1.id,
      workerIds: [worker1.id, worker2.id],
      tempMin: 22.0, tempMax: 28.0,
      phMin: 6.5, phMax: 8.0,
      tdsMin: 300, tdsMax: 600,
      turbidityMax: 15.0,
      waterLevelThreshold: 75.0,
      waterStopThreshold: 10.0,
      lastTemp: 25.5, lastPh: 7.2, lastTds: 450, lastTurb: 5.4, lastWaterLevel: 60.0,
      status: 'online',
    },
  });

  const tank2 = await prisma.tank.upsert({
    where: { tankId: 'GUARD-TEST-002' },
    update: {},
    create: {
      tankId: 'GUARD-TEST-002',
      productKey: 'A1B2-C3D4-E5F6-0002',
      name: 'Breeding Tank B',
      isRegistered: true,
      adminId: admin1.id,
      workerIds: [worker1.id], // Only John can view
      status: 'offline',
    },
  });

  const tank3 = await prisma.tank.upsert({
    where: { tankId: 'GUARD-TEST-003' },
    update: {},
    create: {
      tankId: 'GUARD-TEST-003',
      productKey: 'A1B2-C3D4-E5F6-0003',
      name: 'Grow-out Tank A',
      isRegistered: true,
      adminId: admin1.id,
      workerIds: [worker1.id, worker2.id],
      tempMin: 20.0, tempMax: 26.0,
      phMin: 6.8, phMax: 7.8,
      tdsMin: 350, tdsMax: 500,
      turbidityMax: 10.0,
      waterLevelThreshold: 80.0,
      waterStopThreshold: 15.0,
      lastTemp: 23.5, lastPh: 7.4, lastTds: 410, lastTurb: 3.2, lastWaterLevel: 65.0,
      status: 'online',
    },
  });

  const tank4 = await prisma.tank.upsert({
    where: { tankId: 'GUARD-TEST-004' },
    update: {},
    create: {
      tankId: 'GUARD-TEST-004',
      productKey: 'A1B2-C3D4-E5F6-0004',
      name: 'Grow-out Tank B',
      isRegistered: true,
      adminId: admin1.id,
      workerIds: [worker2.id],
      tempMin: 22.0, tempMax: 28.0,
      phMin: 6.5, phMax: 8.0,
      tdsMin: 300, tdsMax: 600,
      turbidityMax: 15.0,
      waterLevelThreshold: 75.0,
      waterStopThreshold: 10.0,
      lastTemp: 26.1, lastPh: 7.0, lastTds: 460, lastTurb: 8.1, lastWaterLevel: 55.0,
      status: 'online',
    },
  });

  // Assign the tanks back to the users assignedTankIds string array (MongoDB specific relation requirement in Prisma schema)
  await prisma.user.update({
    where: { id: worker1.id },
    data: { assignedTankIds: { push: [tank1.id, tank2.id, tank3.id] } }
  });
  await prisma.user.update({
    where: { id: worker2.id },
    data: { assignedTankIds: { push: [tank1.id, tank3.id, tank4.id] } }
  });

  // 4. Create sample alerts for the tanks
  console.log('🚨 Creating Alerts...');
  await prisma.alert.create({
    data: {
      tankId: tank1.tankId,
      tankInternalId: tank1.id,
      type: 'temperature',
      message: 'CRITICAL HIGH Temp detected',
      value: 29.5,
      resolved: false,
    }
  });

  await prisma.alert.create({
    data: {
      tankId: tank1.tankId,
      tankInternalId: tank1.id,
      type: 'ph',
      message: 'LOW pH detected',
      value: 6.1,
      resolved: true,
    }
  });

  // 5. Create Sample Device Commands
  console.log('⚡ Creating Commands...');
  await prisma.deviceCommand.create({
    data: {
      tankId: tank1.tankId,
      command: 'feed',
      issuedBy: admin1.id,
      status: 'sent',
    }
  });

  console.log('✅ Seeding Complete! Enjoy testing with password "user1234".');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
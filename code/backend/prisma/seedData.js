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

  // 6. Seed Fish Species
  console.log('🐠 Seeding Fish Species...');
  const FISH_SPECIES = [
    { name: "Nile Tilapia", scientificName: "Oreochromis niloticus", description: "Hardy, fast-growing freshwater fish widely farmed across tropical regions and Sri Lankan inland aquaculture.", phMin: 6.0, phMax: 9.0, tempMin: 20, tempMax: 35, tdsMin: 100, tdsMax: 2000, turbidityMax: 100 },
    { name: "Koi Carp", scientificName: "Cyprinus rubrofuscus", description: "Ornamental carp prized for vivid colour patterns. Extremely popular in Sri Lankan garden ponds and large display aquariums.", phMin: 6.8, phMax: 8.2, tempMin: 15, tempMax: 25, tdsMin: 100, tdsMax: 1000, turbidityMax: 40 },
    { name: "Guppy", scientificName: "Poecilia reticulata", description: "One of the most popular tropical fish, known for vibrant colours and peaceful temperament. Widely bred for export in Sri Lanka.", phMin: 6.8, phMax: 7.8, tempMin: 22, tempMax: 28, tdsMin: 100, tdsMax: 400, turbidityMax: 10 },
    { name: "Betta Fish", scientificName: "Betta splendens", description: "Famous for striking flowing fins and bold personality. Bettas prefer warm, low-flow water and dense aquatic vegetation.", phMin: 6.5, phMax: 7.5, tempMin: 24, tempMax: 30, tdsMin: 50, tdsMax: 300, turbidityMax: 8 },
    { name: "Molly", scientificName: "Poecilia sphenops", description: "Hardy, versatile livebearers that adapt well to a wide range of water conditions. Well-suited for community tanks.", phMin: 7.0, phMax: 8.0, tempMin: 22, tempMax: 28, tdsMin: 150, tdsMax: 600, turbidityMax: 15 },
    { name: "Platy", scientificName: "Xiphophorus maculatus", description: "Colourful and peaceful livebearers that thrive in active community aquariums. Easy to care for and highly prolific.", phMin: 7.0, phMax: 8.0, tempMin: 20, tempMax: 26, tdsMin: 150, tdsMax: 500, turbidityMax: 12 },
    { name: "Neon Tetra", scientificName: "Paracheirodon innesi", description: "Iconic schooling fish with a brilliant blue-red lateral stripe. Thrives in soft, slightly acidic tropical waters.", phMin: 6.0, phMax: 7.0, tempMin: 20, tempMax: 26, tdsMin: 50, tdsMax: 200, turbidityMax: 5 },
    { name: "Goldfish", scientificName: "Carassius auratus", description: "Classic coldwater ornamental species. Produces higher organic load and requires clean, well-oxygenated water.", phMin: 7.0, phMax: 8.0, tempMin: 12, tempMax: 24, tdsMin: 100, tdsMax: 400, turbidityMax: 20 },
    { name: "Angelfish", scientificName: "Pterophyllum scalare", description: "Statuesque cichlid native to the Amazon basin. Requires tall aquariums, gentle filtration, and stable temperature.", phMin: 6.5, phMax: 7.5, tempMin: 24, tempMax: 30, tdsMin: 100, tdsMax: 400, turbidityMax: 10 },
    { name: "Discus", scientificName: "Symphysodon spp.", description: "Prized 'King of the Aquarium'. Highly sensitive species demanding warm, soft, pristine water conditions.", phMin: 5.5, phMax: 7.0, tempMin: 28, tempMax: 32, tdsMin: 50, tdsMax: 200, turbidityMax: 5 },
    { name: "Corydoras Catfish", scientificName: "Corydoras paleatus", description: "Peaceful bottom-dwellers that act as a natural clean-up crew. Social fish that prefer sandy substrates.", phMin: 6.0, phMax: 7.5, tempMin: 20, tempMax: 26, tdsMin: 100, tdsMax: 400, turbidityMax: 15 },
    { name: "Zebra Danio", scientificName: "Danio rerio", description: "Hardy and active schooling fish with distinctive horizontal stripes. Ideal for beginners due to their resilience.", phMin: 6.5, phMax: 7.5, tempMin: 18, tempMax: 26, tdsMin: 50, tdsMax: 400, turbidityMax: 15 },
    { name: "Common Carp (Grass / Mirror Carp)", scientificName: "Cyprinus carpio", description: "Robust freshwater species widely cultured in Sri Lankan commercial aquaculture and outdoor display ponds.", phMin: 6.5, phMax: 8.5, tempMin: 18, tempMax: 28, tdsMin: 100, tdsMax: 500, turbidityMax: 25 },
    { name: "Walking Catfish (Clarias)", scientificName: "Clarias batrachus", description: "Air-breathing freshwater catfish native to South Asia. Highly resilient to low oxygen levels and turbid waters.", phMin: 6.5, phMax: 8.0, tempMin: 22, tempMax: 30, tdsMin: 80, tdsMax: 450, turbidityMax: 30 },
    { name: "Dwarf Gourami", scientificName: "Trichogaster lalius", description: "Peaceful labyrinth fish with brilliant turquoise and orange stripes. Popular centerpiece for Sri Lankan planted aquariums.", phMin: 6.0, phMax: 7.5, tempMin: 22, tempMax: 28, tdsMin: 50, tdsMax: 300, turbidityMax: 10 },
    { name: "Giant Gourami", scientificName: "Osphronemus goramy", description: "Impressive, intelligent freshwater giant widespread in Sri Lankan large exhibition tanks and commercial culture.", phMin: 6.5, phMax: 7.8, tempMin: 24, tempMax: 30, tdsMin: 100, tdsMax: 500, turbidityMax: 15 },
    { name: "Silver Arowana", scientificName: "Osteoglossum bicirrhosum", description: "Prehistoric surface predator known as the 'Dragon Fish'. Demands large aquariums and tight-fitting covers.", phMin: 6.0, phMax: 7.2, tempMin: 24, tempMax: 30, tdsMin: 50, tdsMax: 300, turbidityMax: 8 },
    { name: "Tiger Barb", scientificName: "Puntigrus tetrazona", description: "Active, fast-swimming schooling barb with distinct black vertical bands. Heavily exported from Sri Lankan fish farms.", phMin: 6.0, phMax: 7.5, tempMin: 22, tempMax: 26, tdsMin: 50, tdsMax: 350, turbidityMax: 12 },
    { name: "Rainbow Shark", scientificName: "Epalzeorhynchos frenatum", description: "Sleek, semi-aggressive bottom swimmer featuring a dark grey body with vivid red/orange fins.", phMin: 6.5, phMax: 7.8, tempMin: 24, tempMax: 28, tdsMin: 100, tdsMax: 400, turbidityMax: 10 },
    { name: "Oscar Fish", scientificName: "Astronotus ocellatus", description: "Intelligent, highly responsive South American cichlid popular in Sri Lanka for its strong personality and bright markings.", phMin: 6.5, phMax: 7.5, tempMin: 23, tempMax: 28, tdsMin: 100, tdsMax: 450, turbidityMax: 12 }
  ];

  for (const s of FISH_SPECIES) {
    await prisma.fishSpecies.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
  }

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
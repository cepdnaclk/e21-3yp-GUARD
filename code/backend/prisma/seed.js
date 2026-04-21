const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const deviceIds = [101, 102, 103, 150];
  
  // Create sensor types if they don't exist
  let sensorTypes = await prisma.sensorType.findMany();
  
  if (sensorTypes.length === 0) {
    console.log('Creating sensor types...');
    const sensorTypesData = [
      { sensorName: 'temperature', frequency: 'hourly' },
      { sensorName: 'ph', frequency: 'hourly' },
      { sensorName: 'turbidity', frequency: 'hourly' },
      { sensorName: 'water_level', frequency: 'hourly' },
      { sensorName: 'tds', frequency: 'hourly' },
    ];
    
    for (const st of sensorTypesData) {
      await prisma.sensorType.create({ data: st });
    }
    
    sensorTypes = await prisma.sensorType.findMany();
    console.log(`Created ${sensorTypes.length} sensor types.`);
  }

  console.log(`Seeding readings for ${deviceIds.length} devices, ${sensorTypes.length} sensor types...`);

  // Generate 24 hours of readings (1 per hour per sensor per device)
  const readings = [];
  const now = new Date();
  
  for (const deviceId of deviceIds) {
    for (const st of sensorTypes) {
      for (let hoursAgo = 24; hoursAgo >= 0; hoursAgo--) {
        const time = new Date(now.getTime() - hoursAgo * 3600000);
        let value;
        
        switch (st.sensorName) {
          case 'temperature':
            value = 25 + Math.sin(hoursAgo / 4) * 4 + (Math.random() - 0.5) * 2;
            break;
          case 'ph':
            value = 7.2 + Math.sin(hoursAgo / 6) * 0.8 + (Math.random() - 0.5) * 0.3;
            break;
          case 'turbidity':
            value = 30 + Math.sin(hoursAgo / 3) * 15 + (Math.random() - 0.5) * 5;
            break;
          case 'water_level':
            value = 60 + Math.sin(hoursAgo / 8) * 20 + (Math.random() - 0.5) * 5;
            break;
          case 'tds':
            value = 350 + Math.sin(hoursAgo / 5) * 50 + (Math.random() - 0.5) * 20;
            break;
          default:
            value = 50 + Math.random() * 20;
        }
        
        readings.push({
          deviceId,
          sensorId: st.id,
          value: parseFloat(value.toFixed(2)),
          readingTime: time,
        });
      }
    }
  }

  await prisma.sensorReading.createMany({ data: readings });
  console.log(`Created ${readings.length} sensor readings.`);

  // Create alerts — mix of active and resolved
  const alerts = [
    { deviceId: 101, type: 'TEMP_HIGH', message: 'Temperature 33.5°C exceeds maximum threshold of 32°C', value: 33.5, resolved: false },
    { deviceId: 101, type: 'PH_HIGH', message: 'pH 8.9 exceeds maximum threshold of 8.5', value: 8.9, resolved: false },
    { deviceId: 102, type: 'TURBIDITY_HIGH', message: 'Turbidity 55.3 NTU exceeds maximum threshold of 50 NTU', value: 55.3, resolved: false },
    { deviceId: 102, type: 'TEMP_LOW', message: 'Temperature 18.2°C is below minimum threshold of 20°C', value: 18.2, resolved: true, resolvedAt: new Date() },
    { deviceId: 103, type: 'WATER_LEVEL_LOW', message: 'Water level 15.4% is below minimum threshold of 20%', value: 15.4, resolved: false },
    { deviceId: 150, type: 'TEMP_HIGH', message: 'Temperature 34.1°C exceeds maximum threshold of 32°C', value: 34.1, resolved: true, resolvedAt: new Date() },
    { deviceId: 150, type: 'PH_LOW', message: 'pH 6.1 is below minimum threshold of 6.5', value: 6.1, resolved: false },
    { deviceId: 103, type: 'TEMP_HIGH', message: 'Temperature 32.8°C exceeds maximum threshold of 32°C', value: 32.8, resolved: true, resolvedAt: new Date(now.getTime() - 3600000) },
  ];

  for (const a of alerts) {
    await prisma.alert.create({
      data: {
        deviceId: a.deviceId,
        type: a.type,
        message: a.message,
        value: a.value,
        resolved: a.resolved,
      },
    });
  }
  console.log(`Created ${alerts.length} alerts (${alerts.filter(a => !a.resolved).length} active, ${alerts.filter(a => a.resolved).length} resolved).`);

  console.log('\nDone! Test data seeded successfully.');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

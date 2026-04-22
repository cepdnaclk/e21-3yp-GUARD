import prisma from './src/lib/prisma.js'; 

async function seedDatabase() {
    console.log("🌱 Booting up Database Seeder...");

    const NUM_TANKS = 10;
    const STARTING_ID = 200; 
    
    // THE FIX: Your exact User ID from the database
    const TARGET_USER_ID = "69e8d3cfd9a4e082f4d04efa"; 

    for (let i = 0; i < NUM_TANKS; i++) {
        const currentTankId = (STARTING_ID + i).toString(); 

        try {
            await prisma.tank.upsert({
                where: { tankId: currentTankId },
                update: {}, 
                create: {
                    tankId: currentTankId,
                    name: `Virtual Tank ${currentTankId}`,
                    status: "offline",
                    
                    // Link the tank to your user account
                    userId: TARGET_USER_ID,

                    // Seed the default threshold limits so your UI doesn't break
                    tempMin: 24,
                    tempMax: 28,
                    phMin: 6.5,
                    phMax: 8.5,
                    tdsMin: 200,
                    tdsMax: 600,
                    turbidityMax: 20
                }
            });
            console.log(`✅ Successfully initialized Tank [${currentTankId}]`);
        } catch (error) {
            console.error(`❌ Error seeding Tank [${currentTankId}]:`, error.message);
        }
    }

    console.log("\n🎉 Seeding complete! Your database is ready for the data flood.");
}

seedDatabase()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
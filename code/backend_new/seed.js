import bcrypt from "bcryptjs";
import prisma from "./src/lib/prisma.js";

async function seedDatabase() {
    console.log("🌱 Booting up database seeder...");

    const username = process.env.SUPER_ADMIN_USERNAME || "superadmin";
    const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@example.com";
    const password = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123!";
    const fullName = process.env.SUPER_ADMIN_FULLNAME || "Super Admin";

    try {
        const existing = await prisma.user.findFirst({
            where: {
                role: "SUPER_ADMIN",
                OR: [{ username }, { email }],
            },
        });

        if (existing) {
            console.log(`ℹ️ SUPER_ADMIN already exists: ${existing.username}`);
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const superAdmin = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: "SUPER_ADMIN",
                fullName,
            },
        });

        console.log(`✅ Created SUPER_ADMIN: ${superAdmin.username}`);
        console.log(`   Username: ${username}`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
    } catch (error) {
        console.error("❌ Seeder error:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

seedDatabase();
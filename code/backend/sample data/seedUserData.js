import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple CSV parser to handle basic CSV files without external dependencies.
 * Handles commas inside quotes.
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || null;
    });
    return obj;
  });
}

async function main() {
  console.log("🌱 Booting up database seeder from CSV...");

  try {
    // 1. Clean the database in dependency-safe order
    console.log("🧹 Cleaning existing data...");
    await prisma.alert.deleteMany();
    await prisma.tank.deleteMany();
    
    // Break ADMIN -> USER self-relation before deleting all users
    await prisma.user.updateMany({
      where: { adminId: { not: null } },
      data: { adminId: null },
    });
    await prisma.user.deleteMany();

    const defaultPassword = 'ChangeMe123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // 2. Read CSV files
    console.log("📂 Reading CSV files...");
    const usersData = parseCSV(path.join(__dirname, 'users_export.csv'));
    const tanksData = parseCSV(path.join(__dirname, 'tanks_export.csv'));
    const alertsData = parseCSV(path.join(__dirname, 'alerts_export.csv'));

    // 3. Seed Users
    console.log(`👤 Seeding ${usersData.length} users...`);
    for (const u of usersData) {
      await prisma.user.create({
        data: {
          id: u.id,
          username: u.username,
          email: u.email,
          password: hashedPassword,
          role: u.role,
          fullName: u.fullName,
          address: u.address || null,
          phoneNumber: u.phoneNumber || null,
          createdAt: new Date(u.createdAt),
          emailVerified: u.emailVerified === 'true',
        }
      });
    }

    // 4. Seed Tanks
    console.log(`🐠 Seeding ${tanksData.length} tanks...`);
    for (const t of tanksData) {
      const workerIds = t.workerIds ? t.workerIds.split(';').filter(id => id !== '') : [];
      await prisma.tank.create({
        data: {
          id: t.id,
          tankId: t.tankId,
          productKey: t.productKey,
          name: t.name,
          isRegistered: t.isRegistered === 'true',
          adminId: t.adminId || null,
          workerIds: workerIds,
          tempMin: parseFloat(t.tempMin) || 24,
          tempMax: parseFloat(t.tempMax) || 28,
          phMin: parseFloat(t.phMin) || 6.5,
          phMax: parseFloat(t.phMax) || 8.5,
          tdsMin: parseFloat(t.tdsMin) || 200,
          tdsMax: parseFloat(t.tdsMax) || 600,
          turbidityMax: parseFloat(t.turbidityMax) || 20,
          lastTemp: t.lastTemp ? parseFloat(t.lastTemp) : null,
          lastPh: t.lastPh ? parseFloat(t.lastPh) : null,
          lastTds: t.lastTds ? parseFloat(t.lastTds) : null,
          lastTurb: t.lastTurb ? parseFloat(t.lastTurb) : null,
          lastWaterLevel: t.lastWaterLevel ? parseFloat(t.lastWaterLevel) : null,
          status: t.status || "offline",
          updatedAt: new Date(t.updatedAt),
          createdAt: new Date(t.createdAt),
        }
      });
    }

    // 5. Sync assignedTankIds for users (Many-to-Many)
    console.log("🔗 Syncing user tank assignments...");
    for (const t of tanksData) {
      const workerIds = t.workerIds ? t.workerIds.split(';').filter(id => id !== '') : [];
      for (const wId of workerIds) {
        await prisma.user.update({
          where: { id: wId },
          data: {
            assignedTankIds: {
              push: t.id
            }
          }
        });
      }
    }

    // 6. Seed Alerts
    console.log(`🚨 Seeding ${alertsData.length} alerts...`);
    for (const a of alertsData) {
      await prisma.alert.create({
        data: {
          id: a.id,
          tankId: a.tankId || null,
          tankInternalId: a.tankInternalId,
          type: a.type,
          message: a.message,
          value: parseFloat(a.value),
          resolved: a.resolved === 'true',
          createdAt: new Date(a.createdAt),
        }
      });
    }

    console.log("✅ Seeding finished successfully!");
    console.log(`ℹ️ Default password for all users: ${defaultPassword}`);

  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
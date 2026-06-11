import 'dotenv/config';
import jwt from 'jsonwebtoken';
import prisma from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

const BASE_URL = process.env.FRONTEND_URL ? 'http://localhost:5000/api' : 'http://localhost:5000/api';
const SECRET = process.env.JWT_SECRET || 'your-strong-secret-here';

async function generateToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, SECRET, { expiresIn: '1h' });
}

async function cleanupTestData() {
  console.log("🧹 Cleaning up old test data...");
  try {
    const tanks = await prisma.tank.findMany({
      where: { tankId: { startsWith: '_TEST_' } },
      select: { tankId: true }
    });
    for (const t of tanks) {
      await prisma.tank.delete({ where: { tankId: t.tankId } }).catch(() => {});
    }

    const users = await prisma.user.findMany({
      where: { username: { startsWith: '_TEST_' } },
      select: { id: true }
    });
    for (const u of users) {
      await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
    }
  } catch (err) {
    console.warn("⚠️ Error cleaning up test data:", err.message);
  }
}

async function runFunctionalTests() {
  console.log("🧪 Starting G.U.A.R.D End-to-End Functional Tests...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, expectedMsg) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} (Expected: ${expectedMsg})`);
      failed++;
    }
  }

  try {
    await cleanupTestData();

    // 1. SETUP: Create Test Users in Database
    console.log("⚙️  Setting up test users in database...");
    const hash = await bcrypt.hash('password123', 10);
    
    const superAdmin = await prisma.user.create({
      data: { username: '_TEST_SUPER', email: '_test_super@local.guard', password: hash, fullName: 'Test Super', role: 'SUPER_ADMIN', emailVerified: true }
    });
    const admin = await prisma.user.create({
      data: { username: '_TEST_ADMIN', email: '_test_admin@local.guard', password: hash, fullName: 'Test Admin', role: 'ADMIN', emailVerified: true }
    });
    const user = await prisma.user.create({
      data: { username: '_TEST_USER', email: '_test_user@local.guard', password: hash, fullName: 'Test User', role: 'USER', emailVerified: true, adminId: admin.id }
    });

    const superAdminToken = await generateToken(superAdmin);
    const adminToken = await generateToken(admin);
    const userToken = await generateToken(user);

    // 2. TEST: Super Admin adds a product
    let res = await fetch(`${BASE_URL}/tanks/add-product`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${superAdminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tankId: '_TEST_TANK_01', productKey: '_TEST_KEY_1234' })
    });
    assert(res.status === 201, 'Super Admin adds product to inventory', 'HTTP 201 Created');

    // 3. TEST: Admin registers the product
    res = await fetch(`${BASE_URL}/tanks/register`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ productKey: '_TEST_KEY_1234', name: 'My Functional Test Tank' })
    });
    assert(res.status === 200, 'Admin successfully registers the tank', 'HTTP 200 OK');

    // 4. TEST: Admin assigns User to the tank
    res = await fetch(`${BASE_URL}/tanks/_TEST_TANK_01/assign-user`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    });
    assert(res.status === 200, 'Admin assigns User to the tank', 'HTTP 200 OK');

    // 5. TEST: User fetches the tank status
    res = await fetch(`${BASE_URL}/tanks/_TEST_TANK_01/status`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const tankData = await res.json();
    assert(res.status === 200 && tankData.name === 'My Functional Test Tank', 'Assigned User can successfully fetch tank status', 'HTTP 200 OK and matches tank name');

    // 6. TEST: Super Admin deletes the tank
    res = await fetch(`${BASE_URL}/tanks/_TEST_TANK_01`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const deleteStatus = res.status;
    if (deleteStatus !== 200) {
      console.error(`\n[DEBUG] Delete failed with status ${deleteStatus}:`, await res.text());
    }
    assert(deleteStatus === 200, 'Super Admin successfully deletes the tank', 'HTTP 200 OK');

    console.log(`\n🏁 Functional Test Suite Finished. Passed: ${passed} | Failed: ${failed}`);
  } catch (err) {
    console.error("\n❌ Test execution failed:", err.message);
  } finally {
    await cleanupTestData();
    await prisma.$disconnect();
  }
}

runFunctionalTests();

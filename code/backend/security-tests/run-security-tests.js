import 'dotenv/config';
import jwt from 'jsonwebtoken';

const BASE_URL = process.env.FRONTEND_URL ? 'http://localhost:5000/api' : 'http://localhost:5000/api'; // Defaulting to local backend
const SECRET = process.env.JWT_SECRET || 'your-strong-secret-here'; 

// Forge validly signed tokens, but with lower privileges to test Role-Based Access Control
const userToken = jwt.sign({ userId: 'fake-user-id', role: 'USER' }, SECRET, { expiresIn: '1h' });
const adminToken = jwt.sign({ userId: 'fake-admin-id', role: 'ADMIN' }, SECRET, { expiresIn: '1h' });

async function runSecurityTests() {
  console.log("🛡️  Starting G.U.A.R.D Automated Security & Penetration Tests...\n");
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
    // -------------------------------------------------------------------------
    // TEST 1: Missing JWT Token
    // -------------------------------------------------------------------------
    let res = await fetch(`${BASE_URL}/tanks`);
    assert(res.status === 401, 'Auth: Reject requests with no JWT Token', '401 Unauthorized');

    // -------------------------------------------------------------------------
    // TEST 2: Invalid/Forged JWT Token
    // -------------------------------------------------------------------------
    res = await fetch(`${BASE_URL}/tanks`, {
      headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token' }
    });
    assert(res.status === 401, 'Auth: Reject requests with invalid/fake JWT Token', '401 Unauthorized');

    // -------------------------------------------------------------------------
    // TEST 3: Privilege Escalation (USER -> ADMIN)
    // -------------------------------------------------------------------------
    // A regular USER tries to register a new tank (Requires ADMIN)
    res = await fetch(`${BASE_URL}/tanks/register`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ productKey: '1234', deviceName: 'Hacked Tank' })
    });
    assert(res.status === 403, 'RBAC: Block USER from accessing ADMIN routes (/tanks/register)', '403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 4: Privilege Escalation (ADMIN -> SUPER_ADMIN)
    // -------------------------------------------------------------------------
    // An ADMIN tries to inject a raw product key into the database (Requires SUPER_ADMIN)
    res = await fetch(`${BASE_URL}/tanks/add-product`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tankId: '123', productKey: '123' })
    });
    assert(res.status === 403, 'RBAC: Block ADMIN from accessing SUPER_ADMIN routes (/tanks/add-product)', '403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 5: Input Validation & Injection Prevention
    // -------------------------------------------------------------------------
    // An authorized ADMIN sends a malicious payload to the actuator command
    res = await fetch(`${BASE_URL}/tanks/GUARD-001/actuators`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'DROP TABLE USERS; --' }) // Malicious payload
    });
    const data = await res.json();
    const isValidationError = res.status === 400 && data.errors && data.errors.length > 0;
    assert(isValidationError, 'Input Validation: Block invalid/malicious actuator commands', '400 Bad Request with validation errors');

    console.log(`\n🏁 Test Suite Finished. Passed: ${passed} | Failed: ${failed}`);
    if (passed === 5) {
      console.log("🏆 YOUR SYSTEM IS HIGHLY SECURE!");
    }
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      console.error("\n❌ Test Failed: Cannot connect to backend. Make sure your local server is running on port 5000!");
    } else {
      console.error("\n❌ Test execution failed:", err.message);
    }
  }
}

runSecurityTests();

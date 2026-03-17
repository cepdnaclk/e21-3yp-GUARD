# DEVELOPMENT.md — Local Setup & Troubleshooting

> **Quick Start Guide** for developers setting up G.U.A.R.D backend locally.

---

## Prerequisites Checklist

Before cloning, ensure you have:

- [ ] **Node.js 22 LTS** — [Download](https://nodejs.org)
  - Verify: `node --version` → should be `v22.x.x`
- [ ] **PostgreSQL 16+** — [Download](https://www.postgresql.org/download)
  - Verify: `psql --version`
- [ ] **Mosquitto MQTT Broker 2.x** — [Download](https://mosquitto.org/download)
  - Verify: `mosquitto -v`
- [ ] **Git** — [Download](https://git-scm.com)
  - Verify: `git --version`
- [ ] **Text editor** — VS Code, Sublime, or equivalent
- [ ] **Postman or cURL** — For API testing (optional but recommended)

---

## 5-Minute Setup

### 1. Clone & Navigate

```bash
git clone https://github.com/your-org/e21-3yp-GUARD.git
cd e21-3yp-GUARD/code/backend
```

### 2. Install Dependencies

```bash
npm install
```

Expected output:

```
added 250 packages in 12s
```

### 3. Create `.env` File

```bash
# Copy the template
cp .env.example .env

# Edit .env with your values (details below)
```

### 4. Create PostgreSQL Database

```bash
# Connect as postgres superuser
psql -U postgres

# Run these commands:
CREATE USER guard WITH PASSWORD 'guardpass';
CREATE DATABASE guarddb OWNER guard;
ALTER USER guard CREATEDB;

# Verify:
\l                    # List databases (should see 'guarddb')
exit
```

### 5. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

Output:

```
✔ Created migration folder for your database
✔ Migration file created at prisma/migrations/XXXXXX_init/migration.sql
✔ Database migrated to the new schema
✔ Generated Prisma Client
```

### 6. Start Services (in separate terminals)

**Terminal 1 — Mosquitto MQTT Broker**:

```bash
# Windows
"C:\Program Files\mosquitto\mosquitto.exe" -c mosquitto\mosquitto.conf -v

# macOS
mosquitto -c mosquitto/mosquitto.conf -v

# Linux
mosquitto -c mosquitto/mosquitto.conf -v
```

Expected output:

```
mosquitto version 2.x.x starting
mosquitto version 2.x.x binding to port 1883
```

**Terminal 2 — Backend Server**:

```bash
npm run dev
```

Expected output:

```
[Nodemon] 2.0.x
[Nodemon] listening on port 3000
Server running on port 3000
✅ Connected to database
✅ MQTT client connected
```

### 7. Verify Everything Works

```bash
# In Terminal 3, test the health endpoint
curl http://localhost:3000/health

# Expected response:
{"status":"ok","timestamp":"2026-03-17T10:30:00.000Z"}
```

✅ **Success!** All services running.

---

## Environment Variables Reference

Create `code/backend/.env` with these values:

```env
# ===== REQUIRED =====

# PostgreSQL connection string (local dev)
DATABASE_URL="postgresql://guard:guardpass@localhost:5432/guarddb"

# JWT secret (generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=<your-64-chars-here>

# ===== OPTIONAL BUT RECOMMENDED =====

# Google OAuth (skip if doing username/password auth only)
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com

# MQTT broker (default: localhost:1883)
MQTT_BROKER_URL=mqtt://localhost:1883

# Backend server port (default: 3000)
PORT=3000

# Frontend CORS origin (for React dev server)
CORS_ORIGIN=http://localhost:5173

# Environment (development or production)
NODE_ENV=development

# ===== ALERT THRESHOLDS (optional, defaults shown) =====

TEMP_MAX=32
TEMP_MIN=20
PH_MAX=8.5
PH_MIN=6.5
TURBIDITY_MAX=50
WATER_LEVEL_MIN=20

# ===== EMAIL ALERTS (optional, leave blank to disable) =====

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_EMAIL=recipient@fish-shop.com
```

### Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output into `JWT_SECRET` in `.env`.

---

## Project Structure

```
code/backend/
├── src/
│   ├── app.js                 ← Express app (routes, middleware)
│   ├── server.js              ← HTTP server entry point
│   ├── config/
│   │   └── config.js          ← Centralized config from .env
│   ├── database/
│   │   └── prismaClient.js    ← Prisma singleton
│   ├── middleware/
│   │   └── authMiddleware.js  ← JWT verification
│   ├── modules/
│   │   ├── auth/              ← Google OAuth + username/password login
│   │   ├── devices/           ← ESP32 device management
│   │   ├── sensors/           ← Sensor reading queries
│   │   ├── alerts/            ← Alert detection & CRUD
│   │   ├── notifications/     ← WebSocket + email dispatch
│   │   └── sensor-types/      ← Sensor type definitions
│   ├── mqtt/
│   │   └── mqttClient.js      ← MQTT subscription & ingestion
│   └── utils/
│       └── logger.js          ← Winston structured logging
├── prisma/
│   ├── schema.prisma          ← Database schema
│   └── migrations/            ← Database migration history
├── public/
│   └── test-auth.html         ← OAuth test page (dev only)
├── mosquitto/
│   └── mosquitto.conf         ← MQTT broker config
├── .env.example               ← Template for .env
├── package.json
└── README.md
```

---

## Common Development Tasks

### Start the Backend in Watch Mode

```bash
npm run dev
```

Changes to `.js` files automatically reload (via nodemon).

### View Database in Prisma Studio

```bash
npx prisma studio
```

Opens [http://localhost:5555](http://localhost:5555) — visual database browser.

### Run Migrations After Schema Changes

```bash
# Create a new migration
npx prisma migrate dev --name descriptive_name

# (or) Apply pending migrations
npx prisma migrate deploy
```

### Test an MQTT Message Manually

```bash
# Publish a temperature reading (will trigger TEMP_HIGH alert if > 32°C)
mosquitto_pub -h localhost -t "sensor/100/temperature" -m '{"value":33,"time":"2026-03-17 10:30:00"}'

# Verify alert was created
curl -X GET "http://localhost:3000/alerts" \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Debug Mode (Print SQL Queries)

```bash
# Set env var before running
export PRISMA_QUERY_ENGINE_LIBRARY_DEBUG=1

npm run dev
```

### Clean Database (Reset Everything)

```bash
# Delete all data (keep schema)
npx prisma db push --skip-generate --force-reset

# OR: Drop database and recreate
psql -U postgres -c "DROP DATABASE guarddb;"
psql -U postgres -c "CREATE DATABASE guarddb OWNER guard;"
npx prisma migrate deploy
```

---

## Troubleshooting

### Error: `EADDRINUSE: address already in use :::3000`

**Cause**: Port 3000 is already in use.

**Solution 1** — Kill the process on port 3000:

```bash
# macOS / Linux
kill -9 $(lsof -ti :3000)

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

**Solution 2** — Use a different port:

```bash
PORT=3001 npm run dev
```

---

### Error: `connect ECONNREFUSED 127.0.0.1:5432`

**Cause**: PostgreSQL is not running.

**Solution**:

```bash
# Start PostgreSQL (platform-dependent)

# macOS (if installed via Homebrew)
brew services start postgresql

# Windows (if installed as service)
net start postgresql-x64-15    # (version may vary)

# Or start the PostgreSQL app from Applications

# Verify it's running
psql -U postgres -c "SELECT version();"
```

---

### Error: `Connection refused (Mosquitto) — mqtt://localhost:1883`

**Cause**: Mosquitto broker is not running.

**Solution**:

```bash
# Start Mosquitto in a separate terminal

# macOS
mosquitto -c code/backend/mosquitto/mosquitto.conf -v

# Windows
"C:\Program Files\mosquitto\mosquitto.exe" -c code\backend\mosquitto\mosquitto.conf -v

# Linux
mosquitto -c code/backend/mosquitto/mosquitto.conf -v

# Keep this terminal open while developing
```

---

### Error: `relation "User" does not exist`

**Cause**: Database migrations haven't been applied.

**Solution**:

```bash
npx prisma migrate deploy
# OR (if in dev)
npx prisma migrate dev --name init
```

---

### Error: `Google OAuth not configured`

**Cause**: `GOOGLE_CLIENT_ID` is missing from `.env`.

**Solution**:

```bash
# Option 1: Add to .env
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com

# Option 2: Disable Google OAuth for username/password only
# Just leave GOOGLE_CLIENT_ID blank or commented out
```

---

### Error: `npm ERR! code ERESOLVE`

**Cause**: Node version mismatch or package conflict.

**Solution**:

```bash
# Ensure Node 22 LTS
node --version  # should be v22.x.x

# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# If still failing, use legacy peer deps
npm install --legacy-peer-deps
```

---

### Slow Queries to PostgreSQL

**Cause**: Missing database indexes.

**Solution**:

```bash
# View index status
psql guarddb -U guard -c "\di"

# Recreate indexes
npx prisma db push
```

---

## Git Workflow Quick Reference

### Before Starting Work

```bash
# Fetch latest changes
git fetch origin

# Create your feature branch
git checkout -b feature/device-clustering

# OR: Use an existing branch
git checkout my-branch
```

### Commit Changes

```bash
# Stage files
git add code/backend/src/modules/devices/device.service.js

# Commit with descriptive message
git commit -m "feat: add device clustering support"

# Push to remote
git push origin feature/device-clustering
```

### Sync with Test_branch

```bash
# Fetch latest
git fetch origin

# Rebase onto Test_branch (integrates bug fixes)
git rebase origin/Test_branch

# Resolve conflicts if any
# Then push
git push origin my-branch --force-with-lease
```

### Before Pushing to Main

```bash
# Verify backend runs
npm run dev

# Keep Mosquitto running in another terminal
mosquitto -c mosquitto/mosquitto.conf -v

# Test key endpoints
curl http://localhost:3000/health
```

---

## Testing Checklist Before PR

- [ ] Backend starts without errors: `npm run dev`
- [ ] Database connection successful
- [ ] MQTT broker connected
- [ ] Health endpoint responds: `curl http://localhost:3000/health`
- [ ] WebSocket events broadcast correctly
- [ ] No `console.error()` or warning logs on startup
- [ ] New endpoints (if added) return correct responses
- [ ] `.env.example` updated if new env vars added
- [ ] No hardcoded secrets in code
- [ ] Migration file created (if schema changed)

---

## IDE Setup (VS Code)

### Recommended Extensions

- [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma) — Schema syntax highlighting & commands
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) — Code formatting
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) — Linting (if configured)
- [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) — Test APIs inline

### .vscode/settings.json

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Quick API Testing with cURL

### Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!",
    "fullName": "Test User",
    "email": "test@example.com"
  }'
```

### Login & Get JWT

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "testuser",
    "password": "TestPass123!"
  }'

# Copy the returned JWT token
```

### Use JWT on Protected Endpoints

```bash
JWT="eyJhbGciOiJIUzI1NiJ9..."  # Paste your token

curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer $JWT"
```

### List All Devices

```bash
curl -X GET http://localhost:3000/devices \
  -H "Authorization: Bearer $JWT"
```

---

## Resources

- **Backend README**: [code/backend/README.md](code/backend/README.md)
- **Collaboration Protocol**: [COLLABORATION.md](COLLABORATION.md)
- **Merge Strategy Guide**: [MERGE_STRATEGY.md](MERGE_STRATEGY.md)
- **Prisma Docs**: [prisma.io/docs](https://www.prisma.io/docs)
- **Express Docs**: [expressjs.com](https://expressjs.com)
- **MQTT Docs**: [mqtt.org](https://mqtt.org)

---

## Need Help?

1. **Local setup issue?** → Check [Troubleshooting](#troubleshooting) above
2. **Database question?** → See `code/backend/README.md` [Database Schema](../backend/README.md#database-schema) section
3. **API unclear?** → Check `code/backend/README.md` [API Reference](../backend/README.md#api-reference) section
4. **Git workflow?** → See [MERGE_STRATEGY.md](MERGE_STRATEGY.md)
5. **Team coordination?** → See [COLLABORATION.md](COLLABORATION.md)

---

**Last Updated**: March 17, 2026  
**Audience**: Developers (both feature development and QA branches)

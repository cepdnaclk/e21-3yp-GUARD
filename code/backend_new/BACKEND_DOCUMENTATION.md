# Water IoT Backend Documentation

## 1. Overview

This backend is a Node.js + Express API for a water monitoring IoT platform.

It provides:
- User authentication with JWT.
- Tank registration and dashboard APIs.
- Sensor data ingestion from ESP32 devices.
- Hybrid persistence:
  - MongoDB (via Prisma) for real-time and relational app state.
  - InfluxDB for time-series sensor history.

Main runtime entry point: `src/index.js`

---

## 2. Tech Stack

- Runtime: Node.js (ES modules enabled with `"type": "module"`)
- API framework: Express 5
- Authentication: JWT (`jsonwebtoken`)
- Password hashing: `bcryptjs`
- Primary DB: MongoDB via Prisma (`@prisma/client`, `prisma`)
- Time-series DB: InfluxDB v2 (`@influxdata/influxdb-client`)
- Messaging (planned/in-progress): MQTT (`mqtt` package present)
- Dev tool: Nodemon

---

## 3. Project Structure

```
water-iot-backend/
  .env
  package.json
  prisma/
    schema.prisma
  src/
    index.js
    controllers/
      authController.js
      sensorController.js
      tankController.js
    lib/
      prisma.js
    middleware/
      auth.js
      authMiddleware.js
    mqtt/
      bridge.js
    routes/
      authRoutes.js
      sensorRoutes.js
      tankRoutes.js
```

Role of each folder:
- `src/controllers`: API business logic.
- `src/routes`: Route definitions and middleware wiring.
- `src/middleware`: JWT protection logic.
- `src/lib/prisma.js`: Prisma client singleton.
- `prisma/schema.prisma`: Data model and datasource definition.

---

## 4. Environment Variables

From `.env`:

- `PORT`: API port (default 5000 fallback in code).
- `DATABASE_URL`: MongoDB connection string used by Prisma.
- `JWT_SECRET`: secret for signing/verifying JWTs.
- `MQTT_BROKER_URL`: MQTT broker URL for IoT messaging.
- `INFLUX_URL`: InfluxDB base URL.
- `INFLUX_TOKEN`: InfluxDB API token.
- `INFLUX_ORG`: Influx organization.
- `INFLUX_BUCKET`: Influx bucket for sensor data.

Important security note:
- Treat `.env` as secret material.
- Rotate `JWT_SECRET` and `INFLUX_TOKEN` if this file was ever exposed.

---

## 5. NPM Scripts

From `package.json`:

- `npm start`
  - Runs production mode: `node src/index.js`

- `npm run dev`
  - Runs development mode with nodemon: `nodemon src/index.js`

- `npm run db:init`
  - Executes a Mongo replica-set init command in Docker container:
  - `docker exec backend3ypproject-mongodb-1 mongosh ...`

- `npm run db:prep`
  - Runs `net stop MongoDB && npm run db:init`
  - This appears Windows-specific and may require admin privileges.

---

## 6. Server Bootstrap Flow

In `src/index.js`:

1. Loads env variables (`dotenv/config`).
2. Creates Express app with CORS + JSON middleware.
3. Mounts route groups:
   - `/api/auth`
   - `/api/tanks`
   - `/api/sensors`
4. Defines health route `GET /`.
5. Starts server on `PORT`.
6. On startup, attempts Prisma connection and exits process on DB failure.

---

## 7. Data Model (Prisma / MongoDB)

From `prisma/schema.prisma`:

### Enum: `Role`
- `USER`
- `ADMIN`

### Model: `User`
Fields:
- `id` (ObjectId, primary key)
- `username` (unique)
- `email` (unique)
- `password`
- `role` (`Role`, default `USER`)
- `fullName`
- `address` (optional)
- `phoneNumber` (optional)
- `createdAt`
- relation: `tanks` (one-to-many)

### Model: `Tank`
Fields:
- `id` (ObjectId, primary key)
- `tankId` (unique hardware/business identifier)
- `name`
- `userId` (ObjectId FK to `User`)
- relation: `user`
- safe ranges:
  - `tempMin`, `tempMax`
  - `phMin`, `phMax`
  - `tdsMin`, `tdsMax`
  - `turbidityMax`
- latest snapshot cache:
  - `lastTemp`, `lastPh`, `lastTds`, `lastTurb`
  - `status` (default `"offline"`)
- `updatedAt`, `createdAt`

---

## 8. API Endpoints

Base URL (local): `http://localhost:5000`

### 8.1 Auth Routes (`/api/auth`)

#### `POST /api/auth/register`
Controller: `register`

Expected body:
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "plainPassword",
  "role": "USER",
  "fullName": "Alice Doe",
  "address": "Optional",
  "phoneNumber": "Optional"
}
```

Behavior:
- Hashes password with bcrypt (salt rounds = 10).
- Creates `User` in MongoDB via Prisma.
- Returns 201 with new `userId`.

#### `POST /api/auth/login`
Controller: `login`

Expected body:
```json
{
  "username": "alice",
  "password": "plainPassword"
}
```

Behavior:
- Loads user by username.
- Compares password with bcrypt.
- Signs JWT with payload `{ userId, role }`, 2h expiration.
- Returns token and profile basics.

---

### 8.2 Tank Routes (`/api/tanks`)

All current tank routes use `verifyToken` middleware.

#### `POST /api/tanks/register`
Controller: `registerTank`

Expected body:
```json
{
  "name": "Main Tank",
  "tankId": "GUARD-001"
}
```

Behavior:
- Reads user identity from decoded JWT (`req.user.userId`).
- Creates Tank linked to the authenticated user.

#### `GET /api/tanks`
Controller: `getAllTanks`

Behavior:
- Fetches all tanks.
- Computes `isHealthy` using only temperature and pH ranges.
- Returns processed tank list for dashboard.

#### `GET /api/tanks/:tankId/status`
Controller: `getTankStatus`

Behavior:
- Fetches tank by `tankId`.
- Returns current cached values and latest historical record (if available).

Note:
- Current implementation references `tank.readings`, but `readings` relation is not defined in current Prisma schema.

---

### 8.3 Sensor Routes (`/api/sensors`)

#### `POST /api/sensors/log`
Controller: `logData`

Expected body:
```json
{
  "tankId": "GUARD-001",
  "temp": 26.4,
  "pH": 7.2,
  "tds": 330,
  "turbidity": 5.5
}
```

Behavior:
1. Updates tank latest cache in MongoDB (`lastTemp`, `lastPh`, `lastTds`, `lastTurb`, `status=online`).
2. Writes same datapoint into InfluxDB measurement `water_quality`.
3. Flushes write API immediately.

---

## 9. Authentication and Authorization

Two middleware files exist:

- `src/middleware/authMiddleware.js`
  - Exports `verifyToken`.
  - Used by tank routes.

- `src/middleware/auth.js`
  - Exports `protect` and `adminOnly`.
  - Currently not wired into routes.

Current state:
- JWT verification is active for tank endpoints.
- Role-based checks (`adminOnly`) exist but are not currently applied on routes.

---

## 10. Hybrid Data Flow (Mongo + Influx)

### Write path
- Device posts data to `/api/sensors/log`.
- Backend updates latest state in MongoDB (fast current status reads).
- Backend writes high-frequency series data to InfluxDB (historical analytics).

### Read path
- Dashboard/status endpoints read from MongoDB cache.
- Historical detail from InfluxDB is conceptually planned; current status endpoint attempts to use a Prisma relation (`readings`) that is not modeled yet.

---

## 11. Docker Services (parent `docker-compose.yml`)

Services configured:
- `mongodb`:
  - Exposes `27017`
  - Starts with replica-set flags (`--replSet rs0`)
- `influxdb`:
  - Exposes `8086`

Named volumes:
- `mongo_data`
- `influx_data`

Note:
- Backend itself is not containerized in this compose file; it runs from local Node.js environment.

---

## 12. Known Gaps and Risks (Current Code State)

1. Register error path in auth controller does not send an HTTP response.
- In `register`, catch block logs error but response line is commented.
- Result: client may hang on failed registration.

2. Tank status query references undefined Prisma relation.
- `getTankStatus` includes `readings`, but schema has no `readings` field/model.
- Likely runtime error when this endpoint is called.

3. Sensor ingestion endpoint is unauthenticated.
- `/api/sensors/log` accepts data without token.
- This may be intentional for ESP32 simplicity, but adds spoofing risk.

4. Duplicate auth middleware modules.
- `auth.js` and `authMiddleware.js` overlap in responsibility.
- Increases maintenance confusion.

5. Ownership/tenant filtering is not enforced on tank reads.
- `GET /api/tanks` returns all tanks for any authenticated user.
- `GET /api/tanks/:tankId/status` does not verify ownership.

6. Incomplete MQTT bridge implementation.
- `src/mqtt/bridge.js` only has placeholder comment.

7. Health calculation is partial.
- `isHealthy` currently checks only temperature and pH, not TDS/turbidity.

---

## 13. Recommended Next Improvements

1. Fix `register` error handling to always return a clear 4xx/5xx response.
2. Align `getTankStatus` with actual schema.
- Either add a `Reading` model relation in Prisma, or remove relation usage and query InfluxDB for history.
3. Protect sensor ingestion.
- Add device token/API key, HMAC signature, or mTLS.
4. Enforce per-user data access for tank list/status routes.
5. Consolidate auth middleware into one file.
6. Implement MQTT bridge if device communication should be pub/sub instead of direct HTTP posting.
7. Add validation layer for payloads (e.g., zod/joi/express-validator).
8. Add centralized error middleware and request logging.
9. Add automated tests for auth and tank/sensor endpoints.

---

## 14. Quick Start (Local)

1. Start databases from parent directory:
```bash
docker compose up -d
```

2. Initialize Mongo replica set (if needed):
```bash
npm run db:init
```

3. From `water-iot-backend`, install dependencies:
```bash
npm install
```

4. Run backend:
```bash
npm run dev
```

5. Verify health endpoint:
- `GET http://localhost:5000/`

---

## 15. Summary

This backend already has a strong foundation for an IoT water monitoring platform: JWT auth, user-tank ownership model, sensor ingestion, and hybrid real-time/history storage strategy.

The main priority now is stabilizing endpoint behavior (schema-controller alignment), tightening security on sensor intake and tank access, and adding validation/tests for production readiness.

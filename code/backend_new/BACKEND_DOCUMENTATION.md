# G.U.A.R.D Backend API Documentation (frontend-ready)

Last updated: 2026-04-22
Backend root: `code/backend_new`
Runtime entry: `src/index.js`

This document is written for frontend integration. It reflects the routes and controller behavior currently implemented in this backend.

## 1) Base information

- Base URL (local): `http://localhost:5000`
- Content type: `application/json`
- Auth type: Bearer JWT
- Public routes:
  - `GET /`
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/sensors/log` (currently public)
- Protected routes (require Authorization header):
  - `POST /api/tanks/register`
  - `GET /api/tanks`
  - `GET /api/tanks/:tankId/status`
  - `GET /api/sensors/history/:tankId`

## 2) Authentication

### Header format for protected endpoints

`Authorization: Bearer <JWT_TOKEN>`

### Token payload (issued on login)

The JWT contains:
- `userId`
- `role`
- expiration: 2 hours

## 3) Health check

### GET /

Purpose: basic server check.

Success response (200):

```json
"Water IoT Backend is running!"
```

## 4) Auth endpoints

Route file: `src/routes/authRoutes.js`
Controller: `src/controllers/authController.js`

### POST /api/auth/register

Creates a user.

Request body:

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "alice123",
  "role": "USER",
  "fullName": "Alice Doe",
  "address": "Optional",
  "phoneNumber": "Optional"
}
```

Notes:
- `role` is optional (defaults to `USER`).
- `fullName` is required by Prisma schema.
- `address` and `phoneNumber` are optional.

Success response (201):

```json
{
  "message": "User created successfully",
  "userId": "<mongo_object_id>"
}
```

Common failure behavior:
- Duplicate username/email will throw from Prisma.
- Current code catch block logs the error but does not return an error response. Frontend should use timeout/error fallback until this is fixed.

### POST /api/auth/login

Authenticates user by username + password.

Request body:

```json
{
  "username": "alice",
  "password": "alice123"
}
```

Success response (200):

```json
{
  "token": "<JWT_TOKEN>",
  "role": "USER",
  "fullName": "Alice Doe"
}
```

Failure responses:

- 401

```json
{ "error": "Invalid credentials" }
```

- 500

```json
{ "error": "Login error" }
```

## 5) Tank endpoints

Route file: `src/routes/tankRoutes.js`
Controller: `src/controllers/tankController.js`
Middleware: `src/middleware/authMiddleware.js` (`verifyToken`)

### POST /api/tanks/register

Registers a tank owned by authenticated user.

Required auth: yes

Request body:

```json
{
  "name": "Main Tank",
  "tankId": "GUARD-001"
}
```

Success response (201):

```json
{
  "message": "G.U.A.R.D. Tank registered successfully!",
  "tank": {
    "id": "<mongo_object_id>",
    "tankId": "GUARD-001",
    "name": "Main Tank",
    "userId": "<owner_user_id>",
    "tempMin": 24,
    "tempMax": 28,
    "phMin": 6.5,
    "phMax": 8.5,
    "tdsMin": 200,
    "tdsMax": 600,
    "turbidityMax": 20,
    "lastTemp": null,
    "lastPh": null,
    "lastTds": null,
    "lastTurb": null,
    "lastWaterLevel": null,
    "status": "offline",
    "updatedAt": "2026-04-22T...",
    "createdAt": "2026-04-22T..."
  }
}
```

Failure response (400):

```json
{ "error": "Registration failed. Tank ID might already exist." }
```

### GET /api/tanks

Returns all tanks with computed health flag.

Required auth: yes

Success response (200):

```json
[
  {
    "id": "<mongo_object_id>",
    "tankId": "GUARD-001",
    "name": "Main Tank",
    "userId": "<owner_user_id>",
    "tempMin": 24,
    "tempMax": 28,
    "phMin": 6.5,
    "phMax": 8.5,
    "tdsMin": 200,
    "tdsMax": 600,
    "turbidityMax": 20,
    "lastTemp": 26.1,
    "lastPh": 7.2,
    "lastTds": 330,
    "lastTurb": 4.3,
    "lastWaterLevel": 78,
    "status": "online",
    "updatedAt": "2026-04-22T...",
    "createdAt": "2026-04-20T...",
    "isHealthy": true
  }
]
```

Health logic used today:
- `isHealthy = true` only if temperature and pH are in range.
- TDS and turbidity are not part of current health calculation.

Failure response (500):

```json
{ "error": "Failed to fetch dashboard data" }
```

### GET /api/tanks/:tankId/status

Returns one tank status snapshot.

Required auth: yes

Path params:
- `tankId` (string): hardware/business tank id (example: `GUARD-001`)

Expected success shape (200):

```json
{
  "name": "Main Tank",
  "status": "online",
  "currentStats": {
    "temp": 26.1,
    "pH": 7.2,
    "tds": 330,
    "turbidity": 4.3
  },
  "history": null
}
```

Important implementation note:
- The controller currently attempts to include `readings` relation from Prisma, but that relation is not defined in the active Prisma schema. This endpoint may fail at runtime unless schema/controller are aligned.

Common failure responses:

- 404

```json
{ "error": "Tank not found" }
```

- 500

```json
{ "error": "Error fetching status" }
```

## 6) Sensor endpoints

Route file: `src/routes/sensorRoutes.js`
Controller: `src/controllers/sensorController.js`

### POST /api/sensors/log

Ingests a sensor snapshot (Mongo latest state + Influx history write).

Required auth: no (public in current code)

Request body:

```json
{
  "tankId": "GUARD-001",
  "temp": 26.4,
  "pH": 7.2,
  "tds": 330,
  "turbidity": 5.5,
  "waterLevel": 75
}
```

Success response (201):

```json
{
  "message": "Hybrid sync complete: State in Mongo, History in Influx!",
  "currentStatus": "online"
}
```

Failure response (500):

```json
{ "error": "Failed to log sensor data to databases." }
```

### GET /api/sensors/history/:tankId

Returns 24-hour historical chart data from InfluxDB (5-minute windows, last-value fill).

Required auth: yes

Path params:
- `tankId` (string)

Success response (200):

```json
[
  {
    "time": "2026-04-22T10:05:00Z",
    "temp": 26.2,
    "pH": 7.1,
    "tds": 332,
    "turbidity": 4.8,
    "waterLevel": 77
  },
  {
    "time": "2026-04-22T10:10:00Z",
    "temp": 26.3,
    "pH": 7.1,
    "tds": 334,
    "turbidity": 4.9,
    "waterLevel": 77
  }
]
```

Failure response (500):

```json
{ "error": "Failed to fetch historical data" }
```

## 7) MQTT ingestion contract (non-HTTP, but relevant for frontend expectations)

File: `src/services/mqttService.js`

Backend subscribes to:
- `sensor/+/+`

Topic format expected:
- `sensor/<tankId>/<sensorType>`

Payload format expected:

```json
{ "value": 26.4 }
```

Supported `sensorType` values and mapping:
- `temperature` -> Mongo `lastTemp`, Influx field `temperature`
- `ph` -> Mongo `lastPh`, Influx field `pH`
- `tds` -> Mongo `lastTds`, Influx field `tds`
- `turbidity` -> Mongo `lastTurb`, Influx field `turbidity`
- `waterlevel` -> Mongo `lastWaterLevel`, Influx field `waterLevel`

## 8) Frontend integration notes

1. Always map auth token into `Authorization: Bearer <token>` for protected calls.
2. For dashboard list view, use `GET /api/tanks`.
3. For charting, use `GET /api/sensors/history/:tankId` as primary source.
4. Treat `GET /api/tanks/:tankId/status` as potentially unstable until `readings` mismatch is fixed.
5. Handle register failure with defensive timeout/error UI because current backend may not return an error body on register exceptions.
6. `POST /api/sensors/log` is currently unauthenticated by design; if you add frontend tools around it, consider security hardening first.

## 9) Quick test flow for frontend dev

1. Register user -> `POST /api/auth/register`
2. Login -> `POST /api/auth/login`
3. Save `token` from login response
4. Register tank with token -> `POST /api/tanks/register`
5. Push sample sensor data -> `POST /api/sensors/log`
6. Get tank list with token -> `GET /api/tanks`
7. Get history with token -> `GET /api/sensors/history/:tankId`

## 10) Known implementation gaps (important for UI expectations)

- Register endpoint catch block does not send a proper error response.
- Tank status endpoint references non-existent Prisma relation (`readings`).
- Tank list/status endpoints do not enforce per-user ownership filtering yet.
- Role middleware exists (`src/middleware/auth.js`) but is not wired into active routes.

These are backend concerns, but documenting them here helps frontend teams avoid confusion during integration.

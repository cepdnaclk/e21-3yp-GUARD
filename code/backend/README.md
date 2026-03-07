# G.U.A.R.D Backend

**General Unit for Aquatic Risk Detection** — Node.js/Express backend for the IoT aquaculture monitoring system.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Google OAuth Setup](#google-oauth-setup)
4. [Environment Setup](#environment-setup)
5. [Quick Start — Docker](#quick-start--docker)
6. [Local Development (no Docker)](#local-development-no-docker)
7. [Database Migrations](#database-migrations)
8. [API Reference](#api-reference)
9. [MQTT Integration](#mqtt-integration)
10. [Alert Rules](#alert-rules)
11. [WebSocket Events](#websocket-events)
12. [Project Structure](#project-structure)
13. [Production Notes](#production-notes)

---

## Architecture

```
ESP32 Devices
     │  MQTT publish
     ▼
┌─────────────────┐      ┌──────────────────────────────────────┐
│ Mosquitto Broker│─────▶│          G.U.A.R.D Backend           │
│   port 1883     │      │  Express + MQTT.js + Prisma ORM      │
└─────────────────┘      │                                      │
                         │  ┌────────────────────────────────┐  │
React Dashboard ◀─────── │  │  Alert Engine (rule-based)     │  │
  REST + WebSocket        │  └────────────────────────────────┘  │
                         └──────────────┬───────────────────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │   PostgreSQL 16  │
                               │   port 5432      │
                               └─────────────────┘
```

**Data flow:**

1. An ESP32 device publishes sensor readings to `aquamonitor/devices/<uid>/data` over MQTT.
2. The backend MQTT subscriber authenticates the device (bcrypt secret compare), stores the reading, and runs the alert engine.
3. If any threshold is breached, an `Alert` record is created and broadcast via WebSocket to the React dashboard (and optionally by email).
4. The React dashboard consumes the REST API for historical data, device management, and alert resolution.

---

## Prerequisites

| Tool             | Version | Install                                        |
| ---------------- | ------- | ---------------------------------------------- |
| Docker Desktop   | latest  | https://www.docker.com/products/docker-desktop |
| Node.js          | 22 LTS  | https://nodejs.org (local dev only)            |
| A Google Account | —       | For OAuth credentials                          |

---

## Google OAuth Setup

The backend verifies Google ID tokens using the **Google Identity Services** library. Your React frontend will render the Google Sign-In button; the resulting `credential` string is the `idToken` you POST to `/auth/google`.

### Step 1 — Create a Google Cloud Project

1. Open [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown (top-left) → **New Project**
3. Enter a project name (e.g. `guard-aquamonitor`) → **Create**
4. Make sure the new project is selected in the dropdown

### Step 2 — Configure the OAuth Consent Screen

1. In the left sidebar go to **APIs & Services** → **OAuth consent screen**
2. Select **External** → **Create**
3. Fill in:
   - **App name:** G.U.A.R.D
   - **User support email:** your email
   - **Developer contact:** your email
4. Click **Save and Continue**
5. On the **Scopes** screen click **Add or Remove Scopes** and add:
   - `...auth/userinfo.email`
   - `...auth/userinfo.profile`
   - `openid`
6. Click **Save and Continue** through the remaining steps → **Back to Dashboard**

### Step 3 — Create OAuth 2.0 Credentials

1. In the left sidebar go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Give it a name (e.g. `guard-web-client`)
5. Under **Authorised JavaScript origins** add your frontend URL:
   - `http://localhost:5173` (Vite dev), `http://localhost:3001`, or your production domain
6. Click **Create**
7. A dialog shows your **Client ID** and **Client Secret**.  
   Copy the **Client ID** — it ends with `.apps.googleusercontent.com`

### Step 4 — Add to Environment

Paste the Client ID into your `.env` file:

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

> **Note:** The backend only needs the **Client ID**. The Client Secret is not required because the backend verifies ID tokens (not authorization codes).

---

## Environment Setup

```bash
# 1. Copy the example file
cp .env.example .env

# 2. Open .env and fill in the required values:
```

| Variable                                | Required | Description                                   |
| --------------------------------------- | -------- | --------------------------------------------- |
| `DATABASE_URL`                          | ✅       | PostgreSQL connection string                  |
| `JWT_SECRET`                            | ✅       | Random string for signing JWTs (min 32 chars) |
| `GOOGLE_CLIENT_ID`                      | ✅       | From Google Cloud Console (see above)         |
| `MQTT_BROKER_URL`                       | —        | Default: `mqtt://mosquitto:1883`              |
| `PORT`                                  | —        | Default: `3000`                               |
| `CORS_ORIGIN`                           | —        | Comma-separated allowed origins               |
| `TEMP_MAX` / `TEMP_MIN`                 | —        | Temperature thresholds (°C). Default: 32 / 20 |
| `PH_MAX` / `PH_MIN`                     | —        | pH thresholds. Default: 8.5 / 6.5             |
| `TURBIDITY_MAX`                         | —        | Turbidity threshold (NTU). Default: 50        |
| `WATER_LEVEL_MIN`                       | —        | Water level threshold (%). Default: 20        |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | —        | Leave blank to disable email alerts           |
| `ALERT_EMAIL`                           | —        | Recipient for email alerts                    |

**Generate a strong JWT secret:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Quick Start — Docker

This is the recommended way to run the full stack (Postgres + Mosquitto + backend).

```bash
# 1. Set up environment variables
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET and GOOGLE_CLIENT_ID

# 2. Build and start all services
docker compose up --build

# Services started:
#   PostgreSQL  → localhost:5432
#   Mosquitto   → localhost:1883
#   Backend     → localhost:3000
```

On first run the backend container automatically runs `prisma migrate deploy` to create all database tables before starting the server.

**Check it's working:**

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

**Stop everything:**

```bash
docker compose down

# To also delete database volumes (full reset):
docker compose down -v
```

---

## Local Development (no Docker)

Use this if you prefer running Node.js natively.

### Prerequisites (local)

- Node.js 22 LTS
- PostgreSQL 16 running locally
- Mosquitto broker running locally (`brew install mosquitto` / `apt install mosquitto`)

```bash
# 1. Install dependencies
cd code/backend
npm install

# 2. Copy and configure environment
cp .env.example .env
# Set DATABASE_URL to: postgresql://user:pass@localhost:5432/guarddb
# Set MQTT_BROKER_URL to: mqtt://localhost:1883

# 3. Create the database and run migrations
npm run prisma:migrate
# Enter a migration name when prompted (e.g. "init")

# 4. Generate Prisma client
npm run prisma:generate

# 5. Start the development server with hot-reload
npm run dev
```

---

## Database Migrations

| Command                   | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `npm run prisma:migrate`  | Create a new migration and apply it (development) |
| `npm run prisma:deploy`   | Apply pending migrations (production / Docker)    |
| `npm run prisma:generate` | Regenerate Prisma client after schema changes     |
| `npm run prisma:studio`   | Open Prisma Studio GUI at http://localhost:5555   |

---

## API Reference

All endpoints (except `/auth/google` and `/health`) require a JWT in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

### Auth

#### `POST /auth/google`

Exchange a Google ID token for a G.U.A.R.D JWT.

**Request:**

```json
{ "idToken": "<google_id_token_from_frontend>" }
```

**Response `200`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": "uuid", "email": "user@example.com", "name": "Ravindu Ashan" }
}
```

---

#### `GET /auth/me`

Returns the currently authenticated user's profile.

**Response `200`:**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Ravindu Ashan",
  "createdAt": "2026-03-07T..."
}
```

---

### Devices

#### `GET /devices`

List all devices owned by the authenticated user.

**Response `200`:** Array of device objects (deviceSecret is never returned).

---

#### `POST /devices`

Register a new device.

**Request:**

```json
{
  "tankId": "uuid-of-target-tank",
  "deviceUid": "tank_1",
  "deviceSecret": "my_secure_secret_123"
}
```

> **Important:** Store `deviceUid` and `deviceSecret` in your ESP32 firmware. The backend stores a bcrypt hash — the plaintext secret is only valid at creation time.

**Response `201`:** The created device object.

---

#### `GET /devices/:id`

Get a single device by its UUID.

---

### Sensors

#### `GET /sensor/latest?device_id=<uuid>`

Returns the most recent sensor reading for a device.

**Response `200`:**

```json
{
  "id": "uuid",
  "deviceId": "uuid",
  "timestamp": "2026-03-07T10:30:00.000Z",
  "ph": 7.2,
  "temperature": 28.4,
  "tds": 430,
  "turbidity": 12,
  "waterLevel": 82
}
```

---

#### `GET /sensor/history?device_id=<uuid>&from=<ISO8601>&to=<ISO8601>`

Returns historical readings within a time range (max 1000 rows, sorted ascending).

| Query Param | Required | Example                      |
| ----------- | -------- | ---------------------------- |
| `device_id` | ✅       | `?device_id=uuid`            |
| `from`      | —        | `&from=2026-03-01T00:00:00Z` |
| `to`        | —        | `&to=2026-03-07T23:59:59Z`   |

---

### Alerts

#### `GET /alerts?device_id=<uuid>&resolved=<bool>`

List alerts for the user's devices. Both query params are optional.

---

#### `POST /alerts/resolve`

Mark an alert as resolved.

**Request:**

```json
{ "alertId": "uuid-of-the-alert" }
```

**Response `200`:** Updated alert object with `resolved: true`.

---

## MQTT Integration

### Topic

```
aquamonitor/devices/<device_uid>/data
```

### Payload (JSON)

The ESP32 must publish a JSON object to the topic above:

```json
{
  "device_id": "tank_1",
  "device_secret": "my_secure_secret_123",
  "ph": 7.2,
  "temperature": 28.4,
  "tds": 430,
  "turbidity": 12,
  "water_level": 82
}
```

| Field           | Type   | Unit     | Description                                     |
| --------------- | ------ | -------- | ----------------------------------------------- |
| `device_id`     | string | —        | Matches `deviceUid` in the DB                   |
| `device_secret` | string | —        | Plain-text secret (bcrypt compared server-side) |
| `ph`            | float  | pH units | Water pH reading                                |
| `temperature`   | float  | °C       | Water temperature                               |
| `tds`           | float  | ppm      | Total dissolved solids                          |
| `turbidity`     | float  | NTU      | Water cloudiness                                |
| `water_level`   | float  | %        | Tank water level percentage                     |

All sensor fields are optional — send only the sensors your device has.

### Arduino/ESP32 Example (PubSubClient)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* mqtt_server = "192.168.1.100"; // your backend/broker IP
const char* device_id   = "tank_1";
const char* device_secret = "my_secure_secret_123";

void publishReading(float ph, float temp, float tds, float turbidity, float level) {
  StaticJsonDocument<256> doc;
  doc["device_id"]     = device_id;
  doc["device_secret"] = device_secret;
  doc["ph"]            = ph;
  doc["temperature"]   = temp;
  doc["tds"]           = tds;
  doc["turbidity"]     = turbidity;
  doc["water_level"]   = level;

  char payload[256];
  serializeJson(doc, payload);

  String topic = "aquamonitor/devices/";
  topic += device_id;
  topic += "/data";

  client.publish(topic.c_str(), payload);
}
```

---

## Alert Rules

All thresholds are configurable via environment variables (see `.env.example`).

| Alert Type        | Condition                       | Default Threshold | Env Variable      |
| ----------------- | ------------------------------- | ----------------- | ----------------- |
| `TEMP_HIGH`       | `temperature > TEMP_MAX`        | 32°C              | `TEMP_MAX`        |
| `TEMP_LOW`        | `temperature < TEMP_MIN`        | 20°C              | `TEMP_MIN`        |
| `PH_HIGH`         | `ph > PH_MAX`                   | 8.5               | `PH_MAX`          |
| `PH_LOW`          | `ph < PH_MIN`                   | 6.5               | `PH_MIN`          |
| `TURBIDITY_HIGH`  | `turbidity > TURBIDITY_MAX`     | 50 NTU            | `TURBIDITY_MAX`   |
| `WATER_LEVEL_LOW` | `water_level < WATER_LEVEL_MIN` | 20%               | `WATER_LEVEL_MIN` |

**Deduplication:** A new alert is only created if no unresolved alert of the same type already exists for that device. This prevents alert flooding from repeated readings.

---

## WebSocket Events

Connect to the backend with any socket.io v4 client:

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:3000");

socket.on("alert", (data) => {
  console.log("New alert:", data);
  // {
  //   id: "uuid",
  //   type: "TEMP_HIGH",
  //   message: "Temperature 34°C exceeds maximum threshold of 32°C",
  //   value: 34,
  //   deviceUid: "tank_1",
  //   createdAt: "2026-03-07T10:35:00.000Z"
  // }
});
```

---

## Project Structure

```
code/backend/
├── src/
│   ├── modules/
│   │   ├── auth/               → Google OAuth + JWT login
│   │   ├── devices/            → Device registration & management
│   │   ├── sensors/            → Sensor reading queries
│   │   ├── alerts/             → Alert engine & CRUD
│   │   └── notifications/      → Console + WebSocket + Email
│   ├── mqtt/
│   │   └── mqttClient.js       → MQTT subscriber & ingestion pipeline
│   ├── middleware/
│   │   └── authMiddleware.js   → JWT Bearer token guard
│   ├── database/
│   │   └── prismaClient.js     → Prisma singleton
│   ├── config/
│   │   └── config.js           → Centralised env config with validation
│   ├── utils/
│   │   └── logger.js           → Winston logger
│   ├── app.js                  → Express app (routes + middleware)
│   └── server.js               → HTTP server entry point
├── prisma/
│   └── schema.prisma           → Database schema & relations
├── mosquitto/
│   └── mosquitto.conf          → MQTT broker configuration
├── docker-compose.yml
├── Dockerfile
├── package.json
├── .env.example
└── README.md
```

---

## Production Notes

1. **Mosquitto authentication** — Set `allow_anonymous false` in `mosquitto.conf` and configure a `password_file` with per-device credentials, or use TLS client certificates.

2. **HTTPS / WSS** — Place the backend behind an Nginx reverse proxy with a TLS certificate (Let's Encrypt). Configure `CORS_ORIGIN` with your production frontend domain only.

3. **Database** — Use a managed PostgreSQL service (e.g. AWS RDS, Supabase) instead of the Docker container. Update `DATABASE_URL` accordingly.

4. **JWT Secret** — Use a minimum 64-byte random secret generated by `openssl rand -hex 64`. Rotate it periodically.

5. **Environment secrets** — Never commit `.env` to source control. Use Docker secrets, AWS Parameter Store, or a similar secrets manager in production.

6. **Rate limiting** — Consider adding `express-rate-limit` to the `/auth/google` endpoint to prevent brute-force token submission.

7. **Device secrets** — The device secret is stored as a bcrypt hash. The ESP32 stores the plaintext in firmware. For higher security, rotate device secrets periodically using the device management API.

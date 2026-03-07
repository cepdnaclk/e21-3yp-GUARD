# G.U.A.R.D Backend

**General Unit for Aquatic Risk Detection** — Node.js/Express backend for the IoT aquaculture monitoring system.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Google OAuth Setup](#google-oauth-setup)
4. [Environment Setup](#environment-setup)
5. [Quick Start — Local Development](#quick-start--local-development)
6. [Database Migrations](#database-migrations)
7. [API Reference](#api-reference)
8. [MQTT Integration](#mqtt-integration)
9. [Alert Rules](#alert-rules)
10. [WebSocket Events](#websocket-events)
11. [Project Structure](#project-structure)
12. [Docker (optional)](#docker-optional)
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

| Tool             | Version | Install                                     |
| ---------------- | ------- | ------------------------------------------- |
| Node.js          | 22 LTS  | https://nodejs.org                          |
| PostgreSQL       | 16+     | https://www.postgresql.org/download/windows |
| Mosquitto        | 2.x     | https://mosquitto.org/download              |
| A Google Account | —       | For OAuth credentials                       |

> **Docker** is supported but optional — see [Docker (optional)](#docker-optional) at the bottom.

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
5. Under **Authorised JavaScript origins** add:
   - `http://localhost:3000`
   - `http://localhost:5173` (Vite dev), or your production domain
6. Under **Authorised redirect URIs** add:
   - `http://localhost:3000/test-auth` (for the built-in auth test page)
   - Your production callback URL when applicable
7. Click **Create**
8. A dialog shows your **Client ID** and **Client Secret**.  
   Copy the **Client ID** — it ends with `.apps.googleusercontent.com`

> **Note:** Both JavaScript origins **and** redirect URIs are required. The test page uses the standard OIDC redirect flow which demands a matching redirect URI.

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
| `MQTT_BROKER_URL`                       | —        | Default: `mqtt://localhost:1883`              |
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

## Quick Start — Local Development

### Step 1 — Install dependencies

```powershell
cd code\backend
npm install
```

### Step 2 — Configure environment

```powershell
copy .env.example .env
```

Open `.env` and set at minimum:

```env
DATABASE_URL="postgresql://guard:guardpass@localhost:5432/guarddb"
JWT_SECRET=<generate with command below>
GOOGLE_CLIENT_ID=<from Google Cloud Console — see Google OAuth Setup above>
MQTT_BROKER_URL=mqtt://localhost:1883
```

Generate a JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 3 — Create the local PostgreSQL database

Run these once using the `postgres` superuser:

```powershell
psql -U postgres -c "CREATE USER guard WITH PASSWORD 'guardpass';"
psql -U postgres -c "CREATE DATABASE guarddb OWNER guard;"
psql -U postgres -c "ALTER USER guard CREATEDB;"  # needed for Prisma shadow DB
```

### Step 4 — Run database migrations

```powershell
npx prisma migrate dev --name init
```

This creates all 6 tables (`users`, `locations`, `tanks`, `devices`, `sensor_readings`, `alerts`) and generates the Prisma client.

### Step 5 — Start Mosquitto broker

Mosquitto is installed at `C:\Program Files\mosquitto\` on Windows.

```powershell
& "C:\Program Files\mosquitto\mosquitto.exe" -c "mosquitto\mosquitto.conf" -v
```

> Run this in a **separate terminal** and leave it open.

### Step 6 — Start the backend

```powershell
npm run dev
```

The server starts on `http://localhost:3000`.

**Verify everything is running:**

```powershell
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

**Test the MQTT pipeline** (publishes a sample reading — temperature 33°C will trigger a `TEMP_HIGH` alert):

```powershell
& "C:\Program Files\mosquitto\mosquitto_pub.exe" `
  -h localhost `
  -t "aquamonitor/devices/<your_device_uid>/data" `
  -m '{"device_id":"<uid>","device_secret":"<secret>","ph":7.2,"temperature":33,"tds":430,"turbidity":12,"water_level":82}'
```

> You must first register a device via `POST /devices` (with a valid JWT) to get a `deviceUid` and `deviceSecret`.

---

## Auth Test Page

The backend ships a self-contained dev page at `/test-auth` for verifying the full Google OAuth → JWT flow without a frontend.

> Only available when `NODE_ENV` is not `production`.

### How it works

1. Open `http://localhost:3000/test-auth` in your browser.
2. Click **Sign in with Google** — you are redirected to Google's consent screen.
3. After approving, Google redirects back to `http://localhost:3000/test-auth#id_token=...`.
4. The page extracts the `id_token` from the URL hash and POSTs it to `POST /auth/google`.
5. On success, the page shows:
   - Your decoded JWT
   - Your user object (as stored in the database)
   - Ready-to-run `curl` commands for testing all protected endpoints
6. A **Live log** panel at the bottom shows every step in real time.

> This page uses the standard OIDC implicit flow — it does **not** load the Google Identity Services (GIS) script, which avoids the FedCM / `gsi/transform` hang in Chromium.

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
├── public/
│   └── test-auth.html          → Dev-only Google OAuth test page (/test-auth)
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

## Docker (optional)

Docker Compose bundles PostgreSQL, Mosquitto, and the backend into a single command. Use this when you're ready to deploy or want a clean reproducible environment.

### Switch `.env` back to Docker service names

```env
DATABASE_URL="postgresql://guard:guardpass@postgres:5432/guarddb"
MQTT_BROKER_URL=mqtt://mosquitto:1883
```

### Start the full stack

```powershell
docker compose up --build
```

On first start the backend container automatically runs `prisma migrate deploy` before the server starts.

```
Services:
  PostgreSQL  → localhost:5432
  Mosquitto   → localhost:1883
  Backend     → localhost:3000
```

### Stop

```powershell
docker compose down

# Full reset (deletes DB data):
docker compose down -v
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

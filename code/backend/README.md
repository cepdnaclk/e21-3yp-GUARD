# G.U.A.R.D Backend

**General Unit for Aquatic Risk Detection** — Node.js/Express backend for the IoT aquaculture monitoring system.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Quick Start — Local Development](#quick-start--local-development)
5. [Database Migrations](#database-migrations)
6. [API Reference](#api-reference)
7. [MQTT Integration](#mqtt-integration)
8. [Alert Rules](#alert-rules)
9. [WebSocket Events](#websocket-events)
10. [Project Structure](#project-structure)
11. [Docker (optional)](#docker-optional)
12. [Production Notes](#production-notes)

---

## Architecture

```
ESP32 Devices
     │  MQTT publish  sensor/<deviceId>/<sensorName>
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

1. An ESP32 publishes a single sensor value to `sensor/<deviceId>/<sensorName>` (e.g. `sensor/100/temperature`).
2. The backend MQTT subscriber resolves the device and sensor type from the topic, stores a normalised `sensor_reading` row, and runs the alert engine.
3. If a threshold is breached an `Alert` record is created and broadcast via WebSocket (and optionally by email).
4. The React dashboard consumes the REST API for historical data, device management, and alert resolution.

---

## Prerequisites

| Tool       | Version | Install                                     |
| ---------- | ------- | ------------------------------------------- |
| Node.js    | 22 LTS  | https://nodejs.org                          |
| PostgreSQL | 16+     | https://www.postgresql.org/download/windows |
| Mosquitto  | 2.x     | https://mosquitto.org/download              |

> **Docker** is supported but optional — see [Docker (optional)](#docker-optional).

> **Google OAuth** is optional. Leave `GOOGLE_CLIENT_ID` empty to disable the `/auth/google` endpoint and use username/password only.

---

## Google OAuth Setup (optional)

Skip this section if you only want username/password auth.

The backend verifies Google ID tokens. Your frontend renders the Google Sign-In button and POSTs the resulting `credential` string as `idToken` to `/auth/google`.

1. Open [https://console.cloud.google.com](https://console.cloud.google.com) → create a project.
2. **APIs & Services → OAuth consent screen** → External → fill in App name, emails, and add scopes: `openid`, `userinfo.email`, `userinfo.profile`.
3. **APIs & Services → Credentials → + Create Credentials → OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Authorised JavaScript origins: `http://localhost:5173`, your production domain
4. Copy the **Client ID** (ends in `.apps.googleusercontent.com`) into `.env`:

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

> The backend needs only the Client ID — the Client Secret is not required.

---

## Environment Setup

```bash
# edit .env
```

| Variable                                | Required | Description                                            |
| --------------------------------------- | -------- | ------------------------------------------------------ |
| `DATABASE_URL`                          | ✅       | PostgreSQL connection string                           |
| `JWT_SECRET`                            | ✅       | Random string for signing JWTs (min 32 chars)          |
| `GOOGLE_CLIENT_ID`                      | —        | Google OAuth Client ID. Omit to disable `/auth/google` |
| `MQTT_BROKER_URL`                       | —        | Default: `mqtt://localhost:1883`                       |
| `PORT`                                  | —        | Default: `3000`                                        |
| `CORS_ORIGIN`                           | —        | Comma-separated allowed origins                        |
| `TEMP_MAX` / `TEMP_MIN`                 | —        | Temperature thresholds (°C). Default: 32 / 20          |
| `PH_MAX` / `PH_MIN`                     | —        | pH thresholds. Default: 8.5 / 6.5                      |
| `TURBIDITY_MAX`                         | —        | Turbidity threshold (NTU). Default: 50                 |
| `WATER_LEVEL_MIN`                       | —        | Water level threshold (%). Default: 20                 |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | —        | Leave blank to disable email alerts                    |
| `ALERT_EMAIL`                           | —        | Recipient for email alerts                             |

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

Minimum required values in `.env`:

```env
DATABASE_URL="postgresql://guard:guardpass@localhost:5432/guarddb"
JWT_SECRET=<generate with command above>
MQTT_BROKER_URL=mqtt://localhost:1883
# GOOGLE_CLIENT_ID=<optional>
```

### Step 3 — Create the local PostgreSQL database

```powershell
psql -U postgres -c "CREATE USER guard WITH PASSWORD 'guardpass';"
psql -U postgres -c "CREATE DATABASE guarddb OWNER guard;"
psql -U postgres -c "ALTER USER guard CREATEDB;"   # needed for Prisma shadow DB
```

### Step 4 — Run database migrations

```powershell
npx prisma migrate dev --name init
```

This creates all tables (`users`, `devices`, `sensor_types`, `sensor_readings`, `alerts`) and seeds the Prisma client.

### Step 5 — Seed sensor types

Before the ESP32 can send readings the `sensor_types` table must have entries. Use the API after registering an account, or insert directly:

```sql
INSERT INTO sensor_types (sensor_name, frequency) VALUES
  ('temperature', 'hourly'),
  ('ph',          'twice_daily'),
  ('tds',         'weekly'),
  ('turbidity',   'twice_daily'),
  ('water_level', 'hourly');
```

### Step 6 — Start Mosquitto broker

```powershell
& "C:\Program Files\mosquitto\mosquitto.exe" -c "mosquitto\mosquitto.conf" -v
```

> Run in a separate terminal and leave it open.

### Step 7 — Start the backend

```powershell
npm run dev
```

The server starts on `http://localhost:3000`.

```powershell
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

### Optional — Run local MQTT data-flow test scripts

Use the lightweight scripts in `test_data_flow/` if you want to verify broker message flow independently of the main frontend.

```powershell
cd ..\..\test_data_flow
npm install
node test.js
```

Environment variables used by `test.js`:

- `BROKER_HOST` (default: `localhost`)
- `BROKER_PORT` (default: `1883`)
- `MQTT_TOPIC` (optional override)
- `DEVICE_ID` and `SENSOR_NAME` (used when `MQTT_TOPIC` is not set)

Python subscriber option:

```powershell
pip install paho-mqtt
python test.py
```

**Test the MQTT pipeline** (publishes a temperature reading of 33°C — will trigger a `TEMP_HIGH` alert):

```powershell
& "C:\Program Files\mosquitto\mosquitto_pub.exe" `
  -h localhost `
  -t "sensor/100/temperature" `
  -m '{"value": 33, "time": "2026-03-10 14:22:10"}'
```

> Device ID `100` must exist in the `devices` table. Register one via `POST /devices` after logging in.

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

All endpoints except `/auth/*` and `/health` require a JWT in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

---

### Auth

#### `POST /auth/register`

Create a new account with username and password.

**Request:**

```json
{
  "username": "ravindu",
  "password": "securepass123",
  "fullName": "Ravindu Ashan",
  "email": "ravindu@example.com",
  "phoneNumber": "+94771234567",
  "address": "Kandy, Sri Lanka"
}
```

> `email`, `phoneNumber`, and `address` are optional.

**Response `201`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "ravindu",
    "fullName": "Ravindu Ashan",
    "email": "ravindu@example.com"
  }
}
```

---

#### `POST /auth/login`

Login with username or email, plus password.

**Request:**

```json
{ "login": "ravindu", "password": "securepass123" }
```

> `login` accepts either a **username** (`"ravindu"`) or an **email address** (`"ravindu@example.com"`).

**Response `200`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "ravindu",
    "fullName": "Ravindu Ashan",
    "email": "ravindu@example.com"
  }
}
```

---

#### `POST /auth/google`

Login with a Google ID token. A new account is created automatically on first use.  
Only available when `GOOGLE_CLIENT_ID` is configured.

**Request:**

```json
{ "idToken": "<google_id_token_from_frontend>" }
```

**Response `200`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 2,
    "username": "ravindu_g",
    "fullName": "Ravindu Ashan",
    "email": "ravindu@gmail.com"
  }
}
```

---

#### `GET /auth/me`

Returns the authenticated user's profile.

**Response `200`:**

```json
{
  "id": 1,
  "username": "ravindu",
  "fullName": "Ravindu Ashan",
  "email": "ravindu@example.com",
  "phoneNumber": "+94771234567",
  "address": "Colombo, Sri Lanka",
  "createdAt": "2026-03-10T..."
}
```

---

### Devices

#### `GET /devices`

List all devices belonging to the authenticated user.

**Response `200`:** Array of device objects.

---

#### `POST /devices`

Register a new ESP32 device / tank.

**Request:**

```json
{
  "deviceId": 100,
  "deviceName": "Main Tank",
  "location": "Fish Room A"
}
```

> `deviceId` must be a unique integer matching the ID programmed into the ESP32 firmware (recommended range: 100–200).  
> `deviceName` and `location` are optional.

**Response `201`:** The created device object.

---

#### `GET /devices/:id`

Get a single device by its integer ID.

---

### Sensor Types

#### `GET /sensor-types`

List all sensor type definitions.

**Response `200`:**

```json
[
  { "id": 1, "sensorName": "temperature", "frequency": "hourly" },
  { "id": 2, "sensorName": "ph", "frequency": "twice_daily" }
]
```

---

#### `POST /sensor-types`

Create a sensor type definition.

**Request:**

```json
{ "sensorName": "temperature", "frequency": "hourly" }
```

**Response `201`:** The created sensor type object.

---

#### `GET /sensor-types/:id`

Get a sensor type by ID.

---

### Sensors

#### `GET /sensor/latest?device_id=<int>`

Returns the most recent reading for each sensor type on a device.

Validation notes:

- `device_id` is required and must be an integer.
- Invalid query values return `400` with `error: "Validation Error"` and field-level `details`.

**Response `200`:**

```json
[
  {
    "id": 42,
    "deviceId": 100,
    "sensorId": 1,
    "value": 28.4,
    "readingTime": "2026-03-10T10:30:00.000Z",
    "sensorType": {
      "id": 1,
      "sensorName": "temperature",
      "frequency": "hourly"
    }
  },
  {
    "id": 38,
    "deviceId": 100,
    "sensorId": 2,
    "value": 7.2,
    "readingTime": "2026-03-10T08:00:00.000Z",
    "sensorType": { "id": 2, "sensorName": "ph", "frequency": "twice_daily" }
  }
]
```

---

#### `GET /sensor/history?device_id=<int>&sensor_id=<int>&from=<ISO8601>&to=<ISO8601>`

Returns historical readings (max 1000 rows, sorted ascending by time).

Validation notes:

- `device_id` is required and must be an integer.
- `sensor_id` is optional; if provided, it must be an integer.
- `from` and `to` are optional; if provided, they must be valid ISO 8601 date strings.
- Invalid query values return `400` with `error: "Validation Error"` and field-level `details`.

| Query Param | Required | Example                      |
| ----------- | -------- | ---------------------------- |
| `device_id` | ✅       | `?device_id=100`             |
| `sensor_id` | —        | `&sensor_id=1`               |
| `from`      | —        | `&from=2026-03-01T00:00:00Z` |
| `to`        | —        | `&to=2026-03-10T23:59:59Z`   |

---

### Alerts

#### `GET /alerts?device_id=<int>&resolved=<bool>`

List alerts for the user's devices. All query params are optional.

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

### Topic Structure

```
sensor/<deviceId>/<sensorName>
```

| Part         | Example       | Description                                                           |
| ------------ | ------------- | --------------------------------------------------------------------- |
| `deviceId`   | `100`         | Integer device ID (registered in the DB)                              |
| `sensorName` | `temperature` | Must match a `sensor_name` in `sensor_types` table (case-insensitive) |

**Examples:**

```
sensor/100/temperature
sensor/100/ph
sensor/100/tds
sensor/100/turbidity
sensor/100/water_level
```

### Payload (JSON)

```json
{
  "value": 27.5,
  "time": "2026-03-10 14:22:10"
}
```

| Field   | Type   | Required | Description                                                                             |
| ------- | ------ | -------- | --------------------------------------------------------------------------------------- |
| `value` | float  | ✅       | The sensor reading                                                                      |
| `time`  | string | —        | Timestamp `"YYYY-MM-DD HH:MM:SS"` from NTP. Defaults to server receive time if omitted. |

### Requesting on-demand readings

To trigger an immediate reading from the ESP32, publish to the command topic:

```
device/<deviceId>/command
```

Payload: the sensor name string (e.g. `"temperature"`). The ESP32 will then publish to the corresponding `sensor/` topic.

### Arduino/ESP32 Example (PubSubClient)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const int   DEVICE_ID   = 100;
const char* MQTT_SERVER = "192.168.1.100"; // broker IP

void publishReading(const char* sensorName, float value) {
  StaticJsonDocument<128> doc;
  doc["value"] = value;
  doc["time"]  = "2026-03-10 14:22:10"; // replace with NTP timestamp

  char payload[128];
  serializeJson(doc, payload);

  char topic[64];
  snprintf(topic, sizeof(topic), "sensor/%d/%s", DEVICE_ID, sensorName);

  client.publish(topic, payload);
}

// Usage:
// publishReading("temperature", 27.5);
// publishReading("ph", 7.2);
```

---

## Alert Rules

All thresholds are configurable via environment variables.

| Alert Type        | Condition                       | Default Threshold | Env Variable      |
| ----------------- | ------------------------------- | ----------------- | ----------------- |
| `TEMP_HIGH`       | `temperature > TEMP_MAX`        | 32°C              | `TEMP_MAX`        |
| `TEMP_LOW`        | `temperature < TEMP_MIN`        | 20°C              | `TEMP_MIN`        |
| `PH_HIGH`         | `ph > PH_MAX`                   | 8.5               | `PH_MAX`          |
| `PH_LOW`          | `ph < PH_MIN`                   | 6.5               | `PH_MIN`          |
| `TURBIDITY_HIGH`  | `turbidity > TURBIDITY_MAX`     | 50 NTU            | `TURBIDITY_MAX`   |
| `WATER_LEVEL_LOW` | `water_level < WATER_LEVEL_MIN` | 20%               | `WATER_LEVEL_MIN` |

**Deduplication:** A new alert is only created if no unresolved alert of the same type already exists for that device, preventing flooding.

---

## WebSocket Events

Connect with any socket.io v4 client:

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
  //   deviceId: 100,
  //   createdAt: "2026-03-10T10:35:00.000Z"
  // }
});
```

---

## Project Structure

```
code/backend/
├── src/
│   ├── modules/
│   │   ├── auth/               → Username/password + Google OAuth + JWT
│   │   ├── devices/            → Device registration & management
│   │   ├── sensor-types/       → Sensor type definitions (CRUD)
│   │   ├── sensors/            → Sensor reading queries
│   │   ├── alerts/             → Alert engine & CRUD
│   │   └── notifications/      → WebSocket + Email notifications
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
│   ├── schema.prisma           → Database schema & relations
│   └── migrations/             → SQL migration history
├── mosquitto/
│   └── mosquitto.conf          → MQTT broker configuration
├── docker-compose.yml
├── Dockerfile
├── package.json
├── CHANGELOG.md
├── .env.example
└── README.md
```

---

## Docker (optional)

Docker Compose bundles PostgreSQL, Mosquitto, and the backend into a single command.

### Switch `.env` to Docker service names

```env
DATABASE_URL="postgresql://guard:guardpass@postgres:5432/guarddb"
MQTT_BROKER_URL=mqtt://mosquitto:1883
```

### Start the full stack

```powershell
docker compose up --build
```

On first start the backend automatically runs `prisma migrate deploy` before the server starts.

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

1. **HTTPS / WSS** — Place the backend behind an Nginx reverse proxy with a TLS certificate. Configure `CORS_ORIGIN` with your production domain only.

2. **Database** — Use a managed PostgreSQL service (e.g. AWS RDS, Supabase). Update `DATABASE_URL`.

3. **JWT Secret** — Minimum 64-byte random secret: `openssl rand -hex 64`. Rotate periodically.

4. **Mosquitto authentication** — Set `allow_anonymous false` in `mosquitto.conf` and configure a password file or TLS client certificates.

5. **Environment secrets** — Never commit `.env`. Use Docker secrets, AWS Parameter Store, or a similar secrets manager.

6. **Rate limiting** — Add `express-rate-limit` to `/auth/login` and `/auth/google` to prevent brute-force attacks.

7. **Sensor readings partitioning** — For high-volume deployments consider PostgreSQL table partitioning on `sensor_readings` by month to maintain query performance at scale.

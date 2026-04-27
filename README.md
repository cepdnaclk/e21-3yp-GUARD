# G.U.A.R.D — General Unit for Aquatic Risk Detection

> Smart IoT monitoring & alert system for multi-tank ornamental fish shops.

**Third Year Project — Team 08**

| Index    | Name     |
| -------- | -------- |
| E/21/036 | Ashan    |
| E/21/067 | Asindu   |
| E/21/231 | Thisen   |
| E/21/362 | Shashika |

---

## Table of Contents

1. [What is G.U.A.R.D?](#what-is-guard)
2. [System Architecture](#system-architecture)
3. [Repository Structure](#repository-structure)
4. [Tech Stack](#tech-stack)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [MQTT Protocol](#mqtt-protocol)
8. [WebSocket Events](#websocket-events)
9. [Alert Rules & Thresholds](#alert-rules--thresholds)
10. [Ports & Services](#ports--services)
11. [Environment Variables](#environment-variables)
12. [Getting Started — Backend](#getting-started--backend)
13. [Getting Started — Frontend](#getting-started--frontend)
14. [Google OAuth Setup](#google-oauth-setup)
15. [ESP32 / Firmware Integration](#esp32--firmware-integration)
16. [Docker (optional)](#docker-optional)

---

## What is G.U.A.R.D?

G.U.A.R.D is a real-time aquaculture monitoring system that continuously measures water quality across multiple tanks and immediately alerts the owner before fish are harmed.

**Problems it solves:**

- Manual water testing is slow, reactive, and error-prone
- Continuous human monitoring across many tanks is impossible
- Existing single-tank solutions don't scale to commercial fish shops

**Key capabilities:**

- Continuous sensor readings (temperature, pH, TDS, turbidity, water level)
- Rule-based threshold alerts with deduplication
- Multi-channel notifications (dashboard WebSocket, email)
- Multi-tank, multi-location hierarchy
- ESP32 device authentication with bcrypt-hashed secrets

---

## System Architecture

```
                                ┌─────────────────────────────────────┐
  ESP32 Devices                 │           G.U.A.R.D Backend         │
  (per tank)                    │         Node.js / Express           │
  ┌──────────┐  MQTT publish    │                                     │
  │ Tank 1   │─────────────────▶│  ┌───────────┐  ┌───────────────┐  │
  └──────────┘                  │  │MQTT Client│  │  REST API     │  │
  ┌──────────┐                  │  └─────┬─────┘  └───────┬───────┘  │
  │ Tank 2   │─────────────────▶│        │                │           │
  └──────────┘  topic:          │        ▼                ▼           │
  ┌──────────┐  aquamonitor/    │  ┌─────────────────────────────┐   │
  │ Tank N   │─────────────────▶│  │       Prisma ORM            │   │
  └──────────┘  devices/<uid>   │  └─────────────┬───────────────┘   │
                /data           │                │                    │
                                │      ┌─────────▼──────────┐        │
┌────────────────┐              │      │   PostgreSQL DB     │        │
│  Mosquitto     │              │      │   port 5432         │        │
│  MQTT Broker   │              │      └─────────────────────┘        │
│  port 1883     │              │                                     │
└────────────────┘              │  ┌──────────────────────────────┐  │
                                │  │  Alert Engine (rule-based)   │  │
                                │  └──────────┬───────────────────┘  │
                                └─────────────┼───────────────────────┘
                                              │ WebSocket (socket.io)
                                              │ REST API (JWT-protected)
                                              ▼
                                ┌─────────────────────────┐
                                │   React Dashboard        │
                                │   (Frontend — TBD)       │
                                │   port 5173 (Vite dev)   │
                                └─────────────────────────┘
```

**End-to-end data flow:**

1. An ESP32 reads sensors and publishes JSON to `aquamonitor/devices/<deviceUid>/data` via MQTT.
2. The backend MQTT client receives the message, looks up the device by `deviceUid`, and verifies its `deviceSecret` (bcrypt compare).
3. If authentic, a `SensorReading` row is inserted into PostgreSQL.
4. The alert engine checks all 6 threshold rules against the new reading. If a threshold is breached and no unresolved alert of the same type already exists for that device, a new `Alert` is created.
5. The alert is immediately broadcast to all connected React dashboard clients via WebSocket (`socket.io`), and optionally sent by email.
6. The React dashboard consumes the REST API (JWT-authenticated) for all other operations: listing devices, viewing sensor history, resolving alerts, and managing locations/tanks.

---

## Repository Structure

```
e21-3yp-GUARD/
├── code/
│   └── backend/                  ← Node.js/Express backend (this is live)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/          ← Google OAuth + JWT
│       │   │   ├── devices/       ← ESP32 device registration & management
│       │   │   ├── sensors/       ← Sensor reading queries
│       │   │   ├── alerts/        ← Alert detection engine & CRUD
│       │   │   └── notifications/ ← WebSocket + email dispatch
│       │   ├── mqtt/
│       │   │   └── mqttClient.js  ← Full MQTT ingestion pipeline
│       │   ├── middleware/
│       │   │   └── authMiddleware.js ← JWT Bearer guard
│       │   ├── config/config.js   ← Centralised env config with validation
│       │   ├── database/prismaClient.js ← Prisma singleton
│       │   ├── utils/logger.js    ← Winston structured logger
│       │   ├── app.js             ← Express app (routes + middleware stack)
│       │   └── server.js          ← HTTP server entry point
│       ├── public/
│       │   └── test-auth.html     ← Dev-only Google OAuth test page (/test-auth)
│       ├── prisma/
│       │   └── schema.prisma      ← Database schema (6 models)
│       ├── mosquitto/
│       │   └── mosquitto.conf     ← MQTT broker config (Docker + local)
│       ├── Dockerfile
│       ├── docker-compose.yml
│       ├── .env.example
│       └── README.md              ← Backend-specific developer notes
├── docs/                          ← Project documentation & assets
├── test_data_flow/                ← MQTT integration test scripts
└── README.md                      ← This file
```

---

## Tech Stack

### Backend

| Layer       | Technology          | Version | Purpose                          |
| ----------- | ------------------- | ------- | -------------------------------- |
| Runtime     | Node.js             | 22 LTS  | JavaScript server runtime        |
| Framework   | Express             | 4.x     | HTTP server & routing            |
| ORM         | Prisma              | 6.x     | Database access (MongoDB)        |
| State DB    | MongoDB             | 7+      | Real-time state & User data      |
| History DB  | InfluxDB            | 2.x     | High-frequency time-series data  |
| MQTT client | MQTT.js             | 5.x     | Ingestion & Hardware Sync        |
| MQTT broker | HiveMQ Cloud        | —       | Managed MQTT Broker              |
| WebSocket   | socket.io           | 4.x     | Real-time dashboard updates      |

### Frontend _(to be built)_

| Technology        | Purpose                     |
| ----------------- | --------------------------- |
| React 18+         | UI framework                |
| Vite              | Dev server & bundler        |
| socket.io-client  | WebSocket alert stream      |
| React Query / SWR | API data fetching & caching |

### Firmware (ESP32)

| Library                     | Purpose                    |
| --------------------------- | -------------------------- |
| WiFi.h                      | Wi-Fi connectivity         |
| PubSubClient                | MQTT publish               |
| ArduinoJson                 | JSON serialisation         |
| OneWire + DallasTemperature | DS18B20 temperature sensor |

---

## Database Schema

Six tables in PostgreSQL, managed by Prisma migrations.

### Entity Relationship

```
User (1) ──── (N) Location
Location (1) ──── (N) Tank
Tank (1) ──── (N) Device
Device (1) ──── (N) SensorReading
Device (1) ──── (N) Alert
```

### Tables

#### `users`

Populated on first Google sign-in (upsert by `googleId`).

| Column       | Type        | Notes               |
| ------------ | ----------- | ------------------- |
| `id`         | UUID PK     |                     |
| `email`      | text UNIQUE | From Google profile |
| `name`       | text        | From Google profile |
| `google_id`  | text UNIQUE | Google sub claim    |
| `created_at` | timestamptz | Auto                |

#### `locations`

A physical site (e.g. one fish shop).

| Column       | Type            | Notes             |
| ------------ | --------------- | ----------------- |
| `id`         | UUID PK         |                   |
| `name`       | text            | e.g. "Main Store" |
| `owner_id`   | UUID FK → users | Cascade delete    |
| `created_at` | timestamptz     | Auto              |

#### `tanks`

An individual aquarium or pond within a location.

| Column        | Type                | Notes          |
| ------------- | ------------------- | -------------- |
| `id`          | UUID PK             |                |
| `location_id` | UUID FK → locations | Cascade delete |
| `name`        | text                | e.g. "Tank A"  |

#### `devices`

An ESP32 unit assigned to a tank.

| Column          | Type            | Notes                                   |
| --------------- | --------------- | --------------------------------------- |
| `id`            | UUID PK         |                                         |
| `tank_id`       | UUID FK → tanks | Cascade delete                          |
| `device_uid`    | text UNIQUE     | Matches MQTT topic segment              |
| `device_secret` | text            | **bcrypt hash** — never returned by API |
| `status`        | enum            | `ONLINE` / `OFFLINE` / `UNKNOWN`        |
| `last_seen`     | timestamptz     | Updated on each valid MQTT message      |

#### `sensor_readings`

Time-series sensor data. Indexed on `(device_id, timestamp)`.

| Column        | Type              | Notes                 |
| ------------- | ----------------- | --------------------- |
| `id`          | UUID PK           |                       |
| `device_id`   | UUID FK → devices | Cascade delete        |
| `timestamp`   | timestamptz       | Auto (insertion time) |
| `ph`          | float             | Optional              |
| `temperature` | float             | °C. Optional          |
| `tds`         | float             | ppm. Optional         |
| `turbidity`   | float             | NTU. Optional         |
| `water_level` | float             | %. Optional           |

#### `alerts`

Abnormal condition records. Indexed on `(device_id, resolved)`.

| Column       | Type              | Notes                                       |
| ------------ | ----------------- | ------------------------------------------- |
| `id`         | UUID PK           |                                             |
| `device_id`  | UUID FK → devices | Cascade delete                              |
| `type`       | enum              | See [Alert Rules](#alert-rules--thresholds) |
| `message`    | text              | Human-readable description                  |
| `value`      | float             | Sensor value that triggered the alert       |
| `created_at` | timestamptz       | Auto                                        |
| `resolved`   | boolean           | Default `false`                             |

---

## API Reference

Base URL: `http://localhost:3000`

All endpoints except `GET /health` and `POST /auth/google` require:

```
Authorization: Bearer <jwt>
```

### Health

| Method | Path      | Auth | Description           |
| ------ | --------- | ---- | --------------------- |
| GET    | `/health` | —    | Server liveness check |

**Response:**

```json
{ "status": "ok", "timestamp": "2026-03-07T17:40:00.000Z" }
```

---

### Auth

| Method | Path           | Auth | Description                      |
| ------ | -------------- | ---- | -------------------------------- |
| POST   | `/auth/google` | —    | Exchange Google ID token for JWT |
| GET    | `/auth/me`     | ✅   | Get current user profile         |

#### `POST /auth/google`

```json
// Request body
{ "idToken": "<google_id_token>" }

// Response 200
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": "uuid", "email": "user@example.com", "name": "Name" }
}
```

#### `GET /auth/me`

```json
// Response 200
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Name",
  "createdAt": "2026-03-07T..."
}
```

---

### Devices

| Method | Path           | Auth | Description            |
| ------ | -------------- | ---- | ---------------------- |
| GET    | `/devices`     | ✅   | List all your devices  |
| POST   | `/devices`     | ✅   | Register a new device  |
| GET    | `/devices/:id` | ✅   | Get one device by UUID |

#### `POST /devices` — Request body

```json
{
  "tankId": "uuid-of-tank",
  "deviceUid": "tank_1",
  "deviceSecret": "my_secure_secret_123"
}
```

> **Important:** Flash `deviceUid` and `deviceSecret` into your ESP32 firmware at this point. The backend stores only the bcrypt hash — the plaintext cannot be recovered later.

---

### Sensors

| Method | Path              | Auth | Description                    |
| ------ | ----------------- | ---- | ------------------------------ |
| GET    | `/sensor/latest`  | ✅   | Latest reading for a device    |
| GET    | `/sensor/history` | ✅   | Historical readings (max 1000) |

#### Query parameters

| Param       | Endpoint | Type     | Required |
| ----------- | -------- | -------- | -------- |
| `device_id` | both     | UUID     | ✅       |
| `from`      | history  | ISO 8601 | —        |
| `to`        | history  | ISO 8601 | —        |

---

### Alerts

| Method | Path              | Auth | Description      |
| ------ | ----------------- | ---- | ---------------- |
| GET    | `/alerts`         | ✅   | List alerts      |
| POST   | `/alerts/resolve` | ✅   | Resolve an alert |

#### `GET /alerts` — Query parameters

| Param       | Type    | Description      |
| ----------- | ------- | ---------------- |
| `device_id` | UUID    | Filter by device |
| `resolved`  | boolean | `true` / `false` |

#### `POST /alerts/resolve` — Request body

```json
{ "alertId": "uuid-of-alert" }
```

---

## MQTT Protocol

### Broker

| Setting        | Value                                               |
| -------------- | --------------------------------------------------- |
| Host           | `localhost` (dev) / `mosquitto` (Docker)            |
| Port           | **1883** (MQTT)                                     |
| Authentication | Anonymous (dev). See Production Notes for securing. |

### Topic format

```
aquamonitor/devices/<deviceUid>/data
```

`<deviceUid>` must exactly match the `device_uid` column in the `devices` table.

### Payload (JSON)

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

| Field           | Type   | Unit | Required |
| --------------- | ------ | ---- | -------- |
| `device_id`     | string | —    | ✅       |
| `device_secret` | string | —    | ✅       |
| `ph`            | float  | pH   | —        |
| `temperature`   | float  | °C   | —        |
| `tds`           | float  | ppm  | —        |
| `turbidity`     | float  | NTU  | —        |
| `water_level`   | float  | %    | —        |

All sensor fields are optional — only send the sensors your device has. The backend will silently store `null` for any omitted fields.

### Backend ingestion pipeline

```
MQTT message received
       │
       ▼
Parse JSON payload
       │
       ▼
Look up Device by device_uid ──── Not found → discard + log warning
       │
       ▼
bcrypt.compare(device_secret, hash) ──── Mismatch → discard + log warning
       │
       ▼
Update device.status = ONLINE, device.last_seen = now()
       │
       ▼
INSERT SensorReading
       │
       ▼
Run alert engine (6 rules, deduplication check)
       │
       ├── No threshold breached → done
       │
       └── Threshold breached + no open alert of same type
                 │
                 ▼
           INSERT Alert
                 │
                 ▼
           io.emit('alert', ...) → WebSocket broadcast
                 │
                 ▼
           Send email (if SMTP configured)
```

---

## WebSocket Events

The backend uses socket.io v4. Connect from the React frontend:

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => console.log("Connected to G.U.A.R.D backend"));

socket.on("alert", (data) => {
  // Fired every time a new alert is created
  console.log(data);
});
```

### `alert` event payload

```json
{
  "id": "uuid",
  "type": "TEMP_HIGH",
  "message": "Temperature 34°C exceeds maximum threshold of 32°C",
  "value": 34,
  "deviceUid": "tank_1",
  "createdAt": "2026-03-07T10:35:00.000Z"
}
```

---

## Alert Rules & Thresholds

All thresholds are configurable via `.env` — no code change required.

| Alert type        | Condition                       | Default threshold | Env variable      |
| ----------------- | ------------------------------- | ----------------- | ----------------- |
| `TEMP_HIGH`       | `temperature > TEMP_MAX`        | **32 °C**         | `TEMP_MAX`        |
| `TEMP_LOW`        | `temperature < TEMP_MIN`        | **20 °C**         | `TEMP_MIN`        |
| `PH_HIGH`         | `ph > PH_MAX`                   | **8.5**           | `PH_MAX`          |
| `PH_LOW`          | `ph < PH_MIN`                   | **6.5**           | `PH_MIN`          |
| `TURBIDITY_HIGH`  | `turbidity > TURBIDITY_MAX`     | **50 NTU**        | `TURBIDITY_MAX`   |
| `WATER_LEVEL_LOW` | `water_level < WATER_LEVEL_MIN` | **20 %**          | `WATER_LEVEL_MIN` |

- [x] **Alert Deduplication**: Implemented DB-level checks to prevent alert flooding.
- [x] **Real-time Refresh**: Added 30s polling to Dashboard and Alerts pages.
- [x] **Management Scripts**: Added `start_all` and `kill_all` helpers.
- [x] **MQTT QoS**: Upgraded subscriptions to QoS 1 for reliable delivery.

---

## Ports & Services

| Service             | Port     | Protocol | Notes                   |
| ------------------- | -------- | -------- | ----------------------- |
| Backend API         | **5000** | HTTP     | Express server          |
| Backend WebSocket   | **5000** | WS       | socket.io on same port  |
| MQTT Broker         | **8883** | MQTTS    | HiveMQ Cloud            |
| MongoDB             | **27017**| TCP      | State & Metadata        |
| InfluxDB            | **8086** | HTTP     | Time-series History     |
| Frontend (Vite dev) | **5173** | HTTP     | React app               |

---

## Environment Variables

Create `code/backend/.env` by copying `.env.example`:

```powershell
copy code\backend\.env.example code\backend\.env
```

| Variable           | Required | Default                 | Description                            |
| ------------------ | -------- | ----------------------- | -------------------------------------- |
| `DATABASE_URL`     | ✅       | —                       | PostgreSQL connection string           |
| `JWT_SECRET`       | ✅       | —                       | ≥32 random characters                  |
| `GOOGLE_CLIENT_ID` | ✅       | —                       | From Google Cloud Console              |
| `PORT`             | —        | `3000`                  | HTTP server port                       |
| `NODE_ENV`         | —        | `development`           | `development` / `production`           |
| `MQTT_BROKER_URL`  | —        | `mqtt://localhost:1883` | MQTT broker URL                        |
| `CORS_ORIGIN`      | —        | `http://localhost:5173` | Comma-separated allowed client origins |
| `JWT_EXPIRY`       | —        | `1d`                    | JWT lifetime                           |
| `TEMP_MAX`         | —        | `32`                    | Temperature upper alert threshold (°C) |
| `TEMP_MIN`         | —        | `20`                    | Temperature lower alert threshold (°C) |
| `PH_MAX`           | —        | `8.5`                   | pH upper alert threshold               |
| `PH_MIN`           | —        | `6.5`                   | pH lower alert threshold               |
| `TURBIDITY_MAX`    | —        | `50`                    | Turbidity alert threshold (NTU)        |
| `WATER_LEVEL_MIN`  | —        | `20`                    | Water level lower alert threshold (%)  |
| `SMTP_HOST`        | —        | —                       | Leave blank to disable email alerts    |
| `SMTP_PORT`        | —        | `587`                   | SMTP port                              |
| `SMTP_USER`        | —        | —                       | SMTP username                          |
| `SMTP_PASS`        | —        | —                       | SMTP password                          |
| `ALERT_EMAIL`      | —        | —                       | Alert recipient email address          |

**Local dev database URL:**

```
DATABASE_URL="postgresql://guard:guardpass@localhost:5432/guarddb"
```

**Docker database URL (different hostname):**

```
DATABASE_URL="postgresql://guard:guardpass@postgres:5432/guarddb"
```

**Generate a strong JWT secret:**

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Getting Started — Backend

### Prerequisites

| Tool       | Version | Download                                    |
| ---------- | ------- | ------------------------------------------- |
| Node.js    | 22 LTS  | https://nodejs.org                          |
| PostgreSQL | 16+     | https://www.postgresql.org/download/windows |
| Mosquitto  | 2.x     | https://mosquitto.org/download              |

### Step 1 — Clone & install

```powershell
git clone https://github.com/<your-org>/e21-3yp-GUARD.git
cd e21-3yp-GUARD\code\backend
npm install
```

### Step 2 — Configure environment

```powershell
copy .env.example .env
```

Edit `.env` and set at minimum:

```env
DATABASE_URL="postgresql://guard:guardpass@localhost:5432/guarddb"
JWT_SECRET=<output of the node crypto command above>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
MQTT_BROKER_URL=mqtt://localhost:1883
```

### Step 3 — Create PostgreSQL database

Run once using the `postgres` superuser:

```powershell
psql -U postgres -c "CREATE USER guard WITH PASSWORD 'guardpass';"
psql -U postgres -c "CREATE DATABASE guarddb OWNER guard;"
psql -U postgres -c "ALTER USER guard CREATEDB;"
```

> `CREATEDB` is required by Prisma to create the shadow database used during migrations.

### Step 4 — Run migrations

```powershell
npx prisma migrate dev --name init
```

Creates all 6 tables and generates the Prisma client. Only needed once (or after schema changes).

### Step 5 — Start Mosquitto broker

```powershell
# In a separate terminal — leave it running
& "C:\Program Files\mosquitto\mosquitto.exe" -c "mosquitto\mosquitto.conf" -v
```

### Step 6 — Start the backend

```powershell
npm run dev
```

### Step 7 — Verify

```powershell
# Health check
curl http://localhost:3000/health

# Google auth test page (dev only)
# Open in browser: http://localhost:3000/test-auth
```

---

## Getting Started — Frontend

> The frontend is not yet in this repository. When it is added:

```powershell
cd code\frontend
npm install
npm run dev          # starts on http://localhost:5173
```

**Key integration points:**

1. **Authentication:** Initiate Google sign-in, get an `id_token`, POST it to `POST /auth/google`. Store the returned JWT in `localStorage` or a cookie.

2. **API calls:** Include `Authorization: Bearer <jwt>` on every request.

3. **Real-time alerts:** Connect socket.io to `http://localhost:3000` and listen for `alert` events.

4. **CORS:** Your dev origin (`http://localhost:5173`) is already in `.env.example`. Set `CORS_ORIGIN=http://localhost:5173` in the backend `.env`.

---

## Google OAuth Setup

### 1 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. `guard-aquamonitor`)

### 2 — Configure consent screen

1. **APIs & Services → OAuth consent screen**
2. Select **External** → fill in app name, support email, developer contact
3. Add scopes: `openid`, `email`,, `profile`

### 3 — Create credentials

1. **APIs & Services → Credentials → + Create Credentials → OAuth 2.0 Client IDs**
2. Type: **Web application**
3. **Authorised JavaScript origins:**
   - `http://localhost:3000`
   - `http://localhost:5173`
4. **Authorised redirect URIs:**
   - `http://localhost:3000/test-auth` ← required for the built-in test page
   - Your production callback URL
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`)

### 4 — Add to `.env`

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

> The backend needs only the Client ID. The Client Secret is not used (the backend verifies ID tokens, not authorization codes).

### 🛠️ Developer Scripts
The following scripts are available in the root directory to manage the full-stack environment:

| Script | Purpose |
| :--- | :--- |
| `start_all.bat` | Starts both Frontend and Backend in separate windows (Double-click). |
| `kill_all.bat` | Kills all Node.js processes and clears ports (Double-click). |
| `start_all.ps1` | PowerShell version of the start script. |
| `kill_all.ps1` | PowerShell version of the kill script. |

---

## 🚨 Alerting & Notification Logic
The system uses a robust multi-layer approach to ensure critical alerts are delivered exactly once.

1. **MQTT Ingestion (QoS 1):** Backend subscribes at QoS 1 to ensure at-least-once delivery from the broker.
2. **In-Memory Throttle:** A 60-second in-memory cache prevents immediate duplicate processing of identical sensor spikes.
3. **DB-Level Deduplication:** The backend checks for existing *unresolved* alerts of the same type for a tank. A new record (and email) is only generated if no active alert is currently open.
4. **Real-time UI:** The Dashboard and Alerts pages poll every 30 seconds to show the latest status without manual refreshes.

---

## ESP32 / Firmware Integration

### Minimal Arduino sketch

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "your_wifi";
const char* WIFI_PASS     = "your_wifi_password";
const char* MQTT_SERVER   = "192.168.1.100"; // IP of the machine running the backend
const int   MQTT_PORT     = 1883;
const char* DEVICE_UID    = "tank_1";        // must match deviceUid registered via POST /devices
const char* DEVICE_SECRET = "my_secure_secret_123";

WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);

void publishReading(float ph, float temp, float tds, float turbidity, float level) {
  StaticJsonDocument<256> doc;
  doc["device_id"]     = DEVICE_UID;
  doc["device_secret"] = DEVICE_SECRET;
  doc["ph"]            = ph;
  doc["temperature"]   = temp;
  doc["tds"]           = tds;
  doc["turbidity"]     = turbidity;
  doc["water_level"]   = level;

  char payload[256];
  serializeJson(doc, payload);

  char topic[64];
  snprintf(topic, sizeof(topic), "aquamonitor/devices/%s/data", DEVICE_UID);

  mqttClient.publish(topic, payload);
}
```

### MQTT test (no ESP32 needed)

```powershell
& "C:\Program Files\mosquitto\mosquitto_pub.exe" `
  -h localhost -t "aquamonitor/devices/tank_1/data" `
  -m '{"device_id":"tank_1","device_secret":"my_secret","temperature":33,"ph":7.2,"tds":430,"turbidity":12,"water_level":82}'
```

> A `temperature` of 33°C is above the default `TEMP_MAX` of 32°C, so this will trigger a `TEMP_HIGH` alert visible on the WebSocket and in `GET /alerts`.

---

## Docker (optional)

Use Docker when you want to deploy or run a fully isolated stack without installing PostgreSQL or Mosquitto locally.

### Switch to Docker hostnames in `.env`

```env
DATABASE_URL="postgresql://guard:guardpass@postgres:5432/guarddb"
MQTT_BROKER_URL=mqtt://mosquitto:1883
```

### Start

```powershell
cd code\backend
docker compose up --build
```

Migrations run automatically on container start.

### Ports exposed

| Container | Host port |
| --------- | --------- |
| backend   | 3000      |
| postgres  | 5432      |
| mosquitto | 1883      |

### Stop

```powershell
docker compose down        # keep DB data
docker compose down -v     # wipe DB data
```

---

## Production Notes

1. **Mosquitto security** — Set `allow_anonymous false` and configure a `password_file`. Use TLS (port 8883) for remote ESP32 devices.
2. **HTTPS** — Place the backend behind Nginx + Let's Encrypt. Update `CORS_ORIGIN` to your production frontend domain only.
3. **Database** — Use a managed PostgreSQL service (AWS RDS, Supabase). Switch `DATABASE_URL` in production secrets.
4. **JWT secret** — Minimum 64 bytes: `openssl rand -hex 64`. Never commit it.
5. **Environment secrets** — Use Docker secrets, AWS Parameter Store, or a similar vault. Never commit `.env`.
6. **Device secrets** — Stored as bcrypt hashes. The ESP32 holds the plaintext. Rotate secrets by re-registering the device.
7. **Rate limiting** — Add `express-rate-limit` on `/auth/google` before going public.

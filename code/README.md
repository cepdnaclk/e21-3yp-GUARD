# G.U.A.R.D — General Unit for Aquatic Risk Detection

Full-stack IoT aquaculture monitoring system — Node.js/Express backend, React frontend, ESP32 sensors, MQTT messaging, and PostgreSQL storage.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow](#data-flow)
3. [Prerequisites](#prerequisites)
4. [Environment Setup](#environment-setup)
5. [Quick Start — Local Development](#quick-start--local-development)
6. [Running the Frontend](#running-the-frontend)
7. [Running the Backend](#running-the-backend)
8. [Database Migrations](#database-migrations)
9. [Seeding Test Data](#seeding-test-data)
10. [API Reference](#api-reference)
11. [MQTT Integration](#mqtt-integration)
12. [Alert Rules](#alert-rules)
13. [WebSocket Events](#websocket-events)
14. [Project Structure](#project-structure)
15. [Docker (optional)](#docker-optional)
16. [Production Notes](#production-notes)

---

## System Architecture

```
ESP32 Devices
     │  MQTT publish  sensor/<deviceId>/<sensorName>
     ▼
┌─────────────────┐      ┌──────────────────────────────────────┐
│ Mosquitto Broker│─────▶│          G.U.A.R.D Backend           │
│   port 1883     │      │  Express + MQTT.js + Prisma ORM      │
└─────────────────┘      │  port 3000                           │
                         │  ┌────────────────────────────────┐  │
                         │  │  Alert Engine (rule-based)     │  │
                         │  └────────────────────────────────┘  │
                         └──────────────┬───────────────────────┘
                                        │ REST API + WebSocket
            ┌───────────────────────────┤
            │                           │
            ▼                           ▼
   ┌─────────────────┐       ┌───────────────────────┐
   │   PostgreSQL 16  │       │   React Frontend      │
   │   port 5432      │       │   Vite dev: port 5173 │
   └─────────────────┘       └───────────────────────┘
```

| Component   | Technology                   | Port       |
| ----------- | ---------------------------- | ---------- |
| Frontend    | React 19 + Vite 7            | 5173 (dev) |
| Backend     | Node.js / Express 4          | 3000       |
| Database    | PostgreSQL 16 + Prisma ORM 5 | 5432       |
| MQTT Broker | Mosquitto 2.x                | 1883       |
| IoT Devices | ESP32 (Arduino)              | —          |

---

## Data Flow

### Sensor Ingestion (ESP32 → Database → Dashboard)

1. An **ESP32** publishes a single sensor value to MQTT topic `sensor/<deviceId>/<sensorName>` (e.g. `sensor/100/temperature`).
2. The backend **MQTT subscriber** receives the message, resolves the device and sensor type from the topic segments, and stores a normalised `sensor_reading` row in PostgreSQL.
3. The **alert engine** runs rule-based checks against configurable thresholds. If a threshold is breached, an `Alert` record is created and broadcast to all connected clients via **WebSocket** (`alert` event).
4. The **React frontend** receives the WebSocket event and displays a toast notification in real time.

### User Interaction (Frontend → Backend → Database)

1. The frontend sends REST API requests to `/api/*` (proxied by Vite to `http://localhost:3000`).
2. The backend validates the JWT token, processes the request, queries PostgreSQL via Prisma, and returns JSON.
3. The frontend renders the data — dashboards, device lists, sensor history, alerts, and profile.

### Authentication Flow

- **Password auth**: `POST /auth/register` → `POST /auth/login` → JWT token stored in `localStorage`
- **Google OAuth** (optional): Google Sign-In button → `POST /auth/google` with ID token → JWT returned
- Both methods produce the same JWT format — all protected routes work identically

---

## Prerequisites

| Tool       | Version | Install                                     |
| ---------- | ------- | ------------------------------------------- |
| Node.js    | 22 LTS  | https://nodejs.org                          |
| PostgreSQL | 16+     | https://www.postgresql.org/download/windows |
| Mosquitto  | 2.x     | https://mosquitto.org/download              |

> **Docker** is supported but optional — see [Docker (optional)](#docker-optional).

---

## Environment Setup

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://guard:guardpass@localhost:5432/guarddb"
JWT_SECRET=<random-64-byte-hex>
MQTT_BROKER_URL=mqtt://localhost:1883
# GOOGLE_CLIENT_ID=<optional>
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

### Frontend (`frontend/.env.local`)

```env
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
```

> Optional — leave empty or omit the file to disable Google Sign-In on the login page.

---

## Quick Start — Local Development

### 1. Create the PostgreSQL database

```powershell
psql -U postgres -c "CREATE USER guard WITH PASSWORD 'guardpass';"
psql -U postgres -c "CREATE DATABASE guarddb OWNER guard;"
psql -U postgres -c "ALTER USER guard CREATEDB;"
```

### 2. Start the backend

```powershell
cd code\backend
copy .env.example .env      # edit .env with your values
npm install
npx prisma migrate dev      # creates all tables
npm run dev                  # starts on http://localhost:3000
```

Verify:

```powershell
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

### 3. Start the Mosquitto MQTT broker

```powershell
& "C:\Program Files\mosquitto\mosquitto.exe" -c "backend\mosquitto\mosquitto.conf" -v
```

### 4. Start the frontend

```powershell
cd code\frontend
npm install
npm run dev                  # starts on http://localhost:5173
```

Open http://localhost:5173 in your browser. Register a new account or log in.

### 5. (Optional) Seed test data

After creating a user account:

```powershell
cd code\backend
node prisma/seed.js
```

This creates 4 devices, 5 sensor types, 1000 sensor readings, and 8 alerts for the first user in the database.

---

## Running the Frontend

```powershell
cd code\frontend
npm install
npm run dev
```

| Script            | Command        | Description                                 |
| ----------------- | -------------- | ------------------------------------------- |
| `npm run dev`     | `vite`         | Start Vite dev server on port 5173 with HMR |
| `npm run build`   | `vite build`   | Production build to `dist/`                 |
| `npm run preview` | `vite preview` | Preview the production build locally        |

### Vite Proxy Configuration

The frontend dev server proxies API requests to the backend:

| Path         | Target                  | Notes                                                   |
| ------------ | ----------------------- | ------------------------------------------------------- |
| `/api/*`     | `http://localhost:3000` | Strips `/api` prefix (e.g. `/api/devices` → `/devices`) |
| `/socket.io` | `http://localhost:3000` | WebSocket upgrade enabled                               |

### Frontend Pages

| Page           | Route              | Description                                                                     |
| -------------- | ------------------ | ------------------------------------------------------------------------------- |
| Login          | `/login`           | Username/email + password form, optional Google Sign-In button                  |
| Register       | `/register`        | Full registration form (name, username, password, optional email/phone/address) |
| Dashboard      | `/`                | Stats cards, device table (top 5), active alerts (top 5), sensor types panel    |
| Devices        | `/devices`         | Device list with inline add form                                                |
| Device Detail  | `/devices/:id`     | Device info, latest sensor reading cards, active alerts                         |
| Sensor History | `/sensors/history` | Filterable history with line charts (time vs value) for all parameters + readings table |
| Alerts         | `/alerts`          | Filterable alert list with resolve button                                       |
| Profile        | `/profile`         | Read-only user profile                                                          |

---

## Running the Backend

```powershell
cd code\backend
npm install
npm run dev
```

| Script                   | Command                 | Description                                                 |
| ------------------------ | ----------------------- | ----------------------------------------------------------- |
| `npm run dev`            | `nodemon src/server.js` | Development server with auto-reload (kills port 3000 first) |
| `npm start`              | `node src/server.js`    | Production server                                           |
| `npm run prisma:migrate` | `prisma migrate dev`    | Create & apply a new migration                              |
| `npm run prisma:deploy`  | `prisma migrate deploy` | Apply pending migrations (production)                       |
| `npm run prisma:studio`  | `prisma studio`         | Open Prisma Studio GUI at http://localhost:5555             |

---

## Database Migrations

| Command                                | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| `npx prisma migrate dev --name <name>` | Create a new migration and apply it (development) |
| `npx prisma migrate deploy`            | Apply pending migrations (production / Docker)    |
| `npx prisma generate`                  | Regenerate Prisma client after schema changes     |
| `npx prisma studio`                    | Open Prisma Studio GUI                            |

### Database Schema

```
┌──────────┐     ┌──────────┐     ┌───────────────┐     ┌─────────────┐
│  users   │────▶│ devices  │────▶│sensor_readings│◀────│sensor_types │
│  (PK: id)│ 1:N │(PK: id)  │ 1:N │  (PK: id)     │ N:1 │  (PK: id)   │
└──────────┘     │          │     └───────────────┘     └─────────────┘
                 │          │────▶┌──────────┐
                 └──────────┘ 1:N │  alerts  │
                                  │ (PK: uuid)│
                                  └──────────┘
```

| Model         | Table             | Primary Key               | Description                                                  |
| ------------- | ----------------- | ------------------------- | ------------------------------------------------------------ |
| User          | `users`           | Auto-increment int        | Username/password + optional Google OAuth                    |
| Device        | `devices`         | Integer (ESP32 device ID) | IoT device / tank, linked to user                            |
| SensorType    | `sensor_types`    | Auto-increment int        | Sensor definitions (name, frequency)                         |
| SensorReading | `sensor_readings` | Auto-increment int        | Time-series: one value per device+sensor+time                |
| Alert         | `alerts`          | UUID                      | Abnormal condition records with type, message, resolved flag |

---

## Seeding Test Data

After registering a user account, run:

```powershell
cd code\backend
node prisma/seed.js
```

Seeds:

- **4 devices** — IDs 101, 102, 103, 150
- **5 sensor types** — temperature, ph, turbidity, water_level, tds
- **1000 sensor readings** — 25 readings per sensor per device over the last 24 hours
- **8 alerts** — 5 active, 3 resolved

---

## API Reference

All endpoints except `/auth/*` and `/health` require a JWT in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

### Auth

| Method | Endpoint         | Description                                                                   |
| ------ | ---------------- | ----------------------------------------------------------------------------- |
| `POST` | `/auth/register` | Register with username, password, fullName (+ optional email, phone, address) |
| `POST` | `/auth/login`    | Login with `{ login, password }` — login accepts username or email            |
| `POST` | `/auth/google`   | Login with Google ID token (optional, requires `GOOGLE_CLIENT_ID`)            |
| `GET`  | `/auth/me`       | Get authenticated user profile                                                |

### Devices

| Method | Endpoint       | Description                                                     |
| ------ | -------------- | --------------------------------------------------------------- |
| `GET`  | `/devices`     | List all devices for the authenticated user                     |
| `POST` | `/devices`     | Register a device: `{ deviceId (int), deviceName?, location? }` |
| `GET`  | `/devices/:id` | Get a single device by integer ID                               |

### Sensor Types

| Method | Endpoint            | Description                                       |
| ------ | ------------------- | ------------------------------------------------- |
| `GET`  | `/sensor-types`     | List all sensor type definitions                  |
| `POST` | `/sensor-types`     | Create a sensor type: `{ sensorName, frequency }` |
| `GET`  | `/sensor-types/:id` | Get a sensor type by ID                           |

### Sensors

| Method | Endpoint                                                              | Description                                    |
| ------ | --------------------------------------------------------------------- | ---------------------------------------------- |
| `GET`  | `/sensor/latest?device_id=<int>`                                      | Latest reading per sensor type on a device     |
| `GET`  | `/sensor/history?device_id=<int>&sensor_id=<int>&from=<ISO>&to=<ISO>` | Historical readings (max 1000 rows, ascending) |

### Alerts

| Method | Endpoint                                  | Description                             |
| ------ | ----------------------------------------- | --------------------------------------- |
| `GET`  | `/alerts?device_id=<int>&resolved=<bool>` | List alerts (all params optional)       |
| `POST` | `/alerts/resolve`                         | Resolve an alert: `{ alertId: "uuid" }` |

### Health

| Method | Endpoint  | Description                           |
| ------ | --------- | ------------------------------------- |
| `GET`  | `/health` | Returns `{ status: "ok", timestamp }` |

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

| Field   | Type   | Required | Description                                                                     |
| ------- | ------ | -------- | ------------------------------------------------------------------------------- |
| `value` | float  | ✅       | The sensor reading                                                              |
| `time`  | string | —        | Timestamp `"YYYY-MM-DD HH:MM:SS"` from NTP. Defaults to server time if omitted. |

### ESP32 Example (PubSubClient)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const int   DEVICE_ID   = 100;
const char* MQTT_SERVER = "192.168.1.100";

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
```

### Requesting On-Demand Readings

Publish to `device/<deviceId>/command` with the sensor name as payload (e.g. `"temperature"`). The ESP32 responds by publishing to the corresponding `sensor/` topic.

---

## Alert Rules

All thresholds are configurable via environment variables.

| Alert Type        | Condition         | Default Threshold | Env Variable      |
| ----------------- | ----------------- | ----------------- | ----------------- |
| `TEMP_HIGH`       | temperature > max | 32°C              | `TEMP_MAX`        |
| `TEMP_LOW`        | temperature < min | 20°C              | `TEMP_MIN`        |
| `PH_HIGH`         | pH > max          | 8.5               | `PH_MAX`          |
| `PH_LOW`          | pH < min          | 6.5               | `PH_MIN`          |
| `TURBIDITY_HIGH`  | turbidity > max   | 50 NTU            | `TURBIDITY_MAX`   |
| `WATER_LEVEL_LOW` | water_level < min | 20%               | `WATER_LEVEL_MIN` |

**Deduplication:** A new alert is only created if no unresolved alert of the same type already exists for that device.

---

## WebSocket Events

Connect with any socket.io v4 client:

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:3000");

socket.on("alert", (data) => {
  // { id, type, message, value, deviceId, createdAt }
});
```

The frontend automatically connects to WebSocket on login and displays toast notifications for incoming alerts.

---

## Project Structure

```
code/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/               → Username/password + Google OAuth + JWT
│   │   │   ├── devices/            → Device registration & management
│   │   │   ├── sensor-types/       → Sensor type definitions (CRUD)
│   │   │   ├── sensors/            → Sensor reading queries
│   │   │   ├── alerts/             → Alert engine & CRUD
│   │   │   └── notifications/      → WebSocket + Email notifications
│   │   ├── mqtt/
│   │   │   └── mqttClient.js       → MQTT subscriber & ingestion pipeline
│   │   ├── middleware/
│   │   │   └── authMiddleware.js   → JWT Bearer token guard
│   │   ├── database/
│   │   │   └── prismaClient.js     → Prisma singleton
│   │   ├── config/
│   │   │   └── config.js           → Centralised env config with validation
│   │   ├── utils/
│   │   │   └── logger.js           → Winston logger
│   │   ├── app.js                  → Express app (routes + middleware)
│   │   └── server.js               → HTTP server entry point
│   ├── prisma/
│   │   ├── schema.prisma           → Database schema & relations
│   │   ├── seed.js                 → Test data seeder
│   │   └── migrations/             → SQL migration history
│   ├── mosquitto/
│   │   └── mosquitto.conf          → MQTT broker configuration
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── package.json
│   ├── CHANGELOG.md
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx           → Login form + Google Sign-In
│   │   │   ├── Register.jsx        → Registration form
│   │   │   ├── Dashboard.jsx       → Stats, devices, alerts, sensor types
│   │   │   ├── Devices.jsx         → Device list + add form
│   │   │   ├── DeviceDetail.jsx    → Device readings + alerts
│   │   │   ├── SensorHistory.jsx   → Filterable readings history
│   │   │   ├── Alerts.jsx          → Alert list with resolve
│   │   │   └── Profile.jsx         → User profile display
│   │   ├── components/
│   │   │   └── Layout.jsx          → Sidebar + top bar + toast notifications
│   │   ├── context/
│   │   │   └── AuthContext.jsx     → Auth state management
│   │   ├── services/
│   │   │   ├── api.js              → REST API helpers
│   │   │   └── socket.js           → Socket.io client
│   │   ├── styles/
│   │   │   └── global.css          → Application stylesheet
│   │   ├── App.jsx                 → Route definitions
│   │   └── main.jsx                → React entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── CHANGELOG.md
│   └── .env.local
│
└── README.md                       ← You are here
```

---

## Docker (optional)

Docker Compose bundles PostgreSQL, Mosquitto, and the backend into a single command.

### Switch `.env` to Docker service names

```env
DATABASE_URL="postgresql://guard:guardpass@postgres:5432/guarddb"
MQTT_BROKER_URL=mqtt://mosquitto:1883
```

### Start the stack

```powershell
cd code\backend
docker compose up --build
```

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

1. **HTTPS / WSS** — Place the backend behind an Nginx reverse proxy with TLS. Configure `CORS_ORIGIN` with your production domain. Serve the frontend `dist/` from Nginx or a CDN.
2. **Frontend build** — Run `npm run build` in `code/frontend` and deploy the `dist/` folder. Update the API base URL if not using a reverse proxy.
3. **Database** — Use a managed PostgreSQL service (e.g. AWS RDS, Supabase). Update `DATABASE_URL`.
4. **JWT Secret** — Minimum 64-byte random secret. Rotate periodically.
5. **Mosquitto authentication** — Set `allow_anonymous false` and configure a password file or TLS client certificates.
6. **Environment secrets** — Never commit `.env`. Use Docker secrets or a secrets manager.
7. **Rate limiting** — Add `express-rate-limit` to `/auth/login` and `/auth/google`.
8. **Sensor readings partitioning** — For high-volume deployments consider PostgreSQL table partitioning on `sensor_readings` by month.

# G.U.A.R.D - General Unit for Aquatic Risk Detection

Full-stack IoT aquaculture monitoring system with:
- React frontend (Vite)
- Express backend (Node.js)
- MongoDB (Prisma, current tank state and users)
- InfluxDB (time-series sensor history)
- MQTT (ESP32 ingestion)

## Current Architecture

ESP32 devices publish sensor values to MQTT topics:

sensor/<tankId>/<sensorType>

The backend consumes those messages and writes:
- latest tank state to MongoDB
- historical points to InfluxDB

The frontend calls backend REST endpoints through /api and renders:
- tank/device list
- tank detail status
- sensor history charts/tables
- alerts view (frontend supports missing alert route gracefully)

## Ports

- Frontend dev server: 5173
- Backend API server: 5000
- MongoDB: 27017
- InfluxDB: 8086
- MQTT broker: 1883

## Prerequisites

- Node.js 22+
- Docker Desktop (recommended for MongoDB and InfluxDB)
- Mosquitto broker (local install or container)

## Environment Setup

Backend env file: backend/.env

Important variables:

- PORT=5000
- DATABASE_URL=mongodb://localhost:27017/iot_db
- JWT_SECRET=<strong-secret>
- MQTT_BROKER_URL=mqtt://localhost:1883 (or your broker host)
- MQTT_USER / MQTT_PASSWORD
- INFLUX_URL=http://localhost:8086
- INFLUX_TOKEN=<influx token>
- INFLUX_ORG=G.U.A.R.D
- INFLUX_BUCKET=guard_sensors

## Quick Start (Local)

### 1. Start MongoDB with replica set (required by Prisma)

```powershell
docker rm -f guard-mongo 2>$null
docker run -d --name guard-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
docker exec guard-mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
```

### 2. Start InfluxDB

Use the same org/bucket/token values as backend/.env.

```powershell
docker rm -f guard-influx 2>$null
docker run -d --name guard-influx -p 8086:8086 \
  -e DOCKER_INFLUXDB_INIT_MODE=setup \
  -e DOCKER_INFLUXDB_INIT_USERNAME=admin \
  -e DOCKER_INFLUXDB_INIT_PASSWORD=Admin12345! \
  -e DOCKER_INFLUXDB_INIT_ORG=G.U.A.R.D \
  -e DOCKER_INFLUXDB_INIT_BUCKET=guard_sensors \
  -e DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=<same-token-as-.env> \
  influxdb:2.7
```

### 3. Start backend

```powershell
cd code/backend
npm install
npx prisma generate
npm run dev
```

Health check:

```powershell
curl http://localhost:5000/
```

Expected response: Water IoT Backend is running!

### 4. Start frontend

```powershell
cd code/frontend
npm install
npm run dev
```

Open http://localhost:5173

## Backend Scripts

In backend/package.json:

- npm run dev -> nodemon src/index.js
- npm start -> node src/index.js
- npm run seed -> create SUPER_ADMIN if missing
- npm run seed:analytics -> seed admin/users/tanks and Influx history points

## Seeding Test Data

### Base seed (super admin)

```powershell
cd code/backend
npm run seed
```

### Analytics seed (recommended for UI analytics development)

```powershell
cd code/backend
npm run seed:analytics
```

This seeds:
- sample admin and worker users
- multiple tanks with thresholds and current values
- worker-to-tank assignments
- historical sensor points in InfluxDB

## API Reference (Current)

Base URL: /api

### Auth

- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/create-admin (SUPER_ADMIN only)
- POST /api/auth/create-user (ADMIN only)

Notes:
- /api/auth/me is not implemented in current backend
- frontend stores a local user snapshot so refresh does not force relogin unless token expired

### Tanks

- POST /api/tanks/register (ADMIN)
- POST /api/tanks/:tankId/assign-user (ADMIN)
- GET /api/tanks (ADMIN, USER)
- GET /api/tanks/:tankId/status (ADMIN, USER)

### Sensors

- POST /api/sensors/log (ESP32/test ingestion)
- GET /api/sensors/history/:tankId (ADMIN, USER)

### Authorization

Protected routes require:

Authorization: Bearer <jwt>

## MQTT Integration (Current)

Topic format:

sensor/<tankId>/<sensorType>

Supported sensorType values in mqtt service:
- temperature
- ph
- tds
- turbidity
- waterlevel

Payload JSON:

```json
{
  "value": 27.5,
  "time": "2026-04-23 10:30:00"
}
```

The backend currently uses payload.value and writes server-time points.

## Frontend Notes (Current)

- Frontend pages still use device-oriented labels, but API adapter maps them to tank endpoints.
- Vite proxy forwards:
  - /api -> http://localhost:5000
  - /socket.io -> http://localhost:5000
- Role access in UI for device/history pages: ADMIN and USER.

## Current Project Structure

```text
code/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── tankController.js
│   │   │   └── sensorController.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── tankRoutes.js
│   │   │   └── sensorRoutes.js
│   │   ├── services/
│   │   │   └── mqttService.js
│   │   ├── middleware/
│   │   │   └── authMiddleware.js
│   │   ├── lib/
│   │   │   └── prisma.js
│   │   └── index.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── seed.js
│   ├── seed-analytics.js
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── pages/
    │   ├── services/
    │   │   ├── api.js
    │   │   └── socket.js
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── components/
    │   ├── styles/
    │   └── App.jsx
    ├── vite.config.js
    └── package.json
```

## Troubleshooting

### Prisma error about transactions / replica set

If Prisma reports replica set required, restart MongoDB with --replSet rs0 and run rs.initiate as shown above.

### Sensor log or history returns 500

Check InfluxDB is up and env values match:
- INFLUX_URL
- INFLUX_TOKEN
- INFLUX_ORG
- INFLUX_BUCKET

### Frontend shows no devices

Make sure:
- you are logged in as ADMIN or USER with assigned tanks
  Admin account:
      username = analytics_admin
      password = Admin@1234
  
  User account:
      username = analytics_worker_1
      password = Worker@1234

- sample data has been seeded with npm run seed:analytics
- backend is running on port 5000

### Refresh sends you to login

Current frontend keeps session across refresh using token + cached user. If token is expired, logout on refresh is expected.

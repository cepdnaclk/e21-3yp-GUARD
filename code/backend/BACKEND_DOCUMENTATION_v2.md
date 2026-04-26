# G.U.A.R.D Backend API Documentation V2

Last updated: 2026-04-24 (email verification + frontend fixes + mobile testing)  
Backend root: code/backend  
Server entry: src/index.js

## 1. Base Information

Base URL (local): http://localhost:5000  
Content type: application/json  
Auth type: Bearer JWT

Public routes:
- GET /
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/google
- GET /api/auth/verify-email
- POST /api/auth/resend-verification
- POST /api/sensors/log

Protected routes:
- POST /api/auth/create-admin
- POST /api/auth/create-user
- POST /api/tanks/register
- POST /api/tanks/:tankId/assign-user
- POST /api/tanks/:tankId/actuators
- GET /api/tanks
- GET /api/tanks/:tankId/status
- GET /api/sensors/history/:tankId

Route files:
- src/routes/authRoutes.js
- src/routes/tankRoutes.js
- src/routes/sensorRoutes.js

## 2. Roles and Access Model

Roles:
- SUPER_ADMIN
- ADMIN
- USER

Rules:
- SUPER_ADMIN can create ADMIN accounts.
- ADMIN can create USER accounts under that ADMIN.
- ADMIN can create tanks under that ADMIN.
- ADMIN can assign USER accounts to tanks owned by that ADMIN.
- USER can view only assigned tanks.
- SUPER_ADMIN has no tank and history access in current controllers.

Related files:
- prisma/schema.prisma
- src/controllers/authController.js
- src/controllers/tankController.js
- src/controllers/sensorController.js

## 2a. User Schema Fields

All fields on the `User` model (`prisma/schema.prisma`):

| Field                   | Type      | Notes                                                           |
|-------------------------|-----------|-----------------------------------------------------------------|
| id                      | String    | MongoDB ObjectId, auto-generated                                |
| username                | String    | Unique                                                          |
| email                   | String    | Unique                                                          |
| password                | String    | bcrypt hashed                                                   |
| role                    | Role      | SUPER_ADMIN / ADMIN / USER (default USER)                       |
| fullName                | String    | Required                                                        |
| address                 | String?   | Optional                                                        |
| phoneNumber             | String?   | Optional                                                        |
| createdAt               | DateTime  | Auto                                                            |
| emailVerified           | Boolean   | false until verification link clicked (default false)           |
| verificationToken       | String?   | Unique 64-char hex token; null after verification               |
| verificationTokenExpiry | DateTime? | 24 h from registration or last resend; null after verification  |
| adminId                 | String?   | ObjectId of the ADMIN this USER belongs to                      |



## 3. Authentication

Header format:

Authorization: Bearer <JWT_TOKEN>

JWT payload contains:
- userId
- role
- expiry 2 hours

Middleware:
- src/middleware/authMiddleware.js

## 4. Health Endpoint

Endpoint:
- GET /

Success:
- 200 with text response: Water IoT Backend is running!

## 5. Auth APIs

Controller:
- src/controllers/authController.js

### 5.1 Login

Endpoint:
- POST /api/auth/login

Request body example:

```json
{
  "username": "superadmin",
  "password": "ChangeMe123!"
}
```

Success response example:

```json
{
  "token": "<JWT_TOKEN>",
  "role": "SUPER_ADMIN",
  "fullName": "Super Admin",
  "adminId": null
}
```

Error responses:
- 401 Invalid credentials
- 403 Email not verified (real-email account, link not yet clicked)
- 500 Login error

403 response body:

```json
{
  "error": "Email not verified. Please check your inbox and verify your email before logging in.",
  "emailVerified": false
}
```

### 5.2 Register (Public USER signup)

Endpoint:
- POST /api/auth/register

Request body example:

```json
{
  "username": "new_user",
  "password": "User123!",
  "fullName": "New User",
  "email": "new_user@example.com",
  "phoneNumber": "Optional",
  "address": "Optional"
}
```

Success response example (email provided — verification required):

```json
{
  "message": "Registration successful! Please check your email to verify your account before logging in.",
  "emailVerified": false,
  "user": {
    "id": "<USER_ID>",
    "username": "new_user",
    "role": "USER",
    "fullName": "New User",
    "email": "new_user@example.com",
    "phoneNumber": null,
    "address": null
  }
}
```

Notes:
- username, password, fullName are required.
- If email is omitted, backend assigns username@local.guard (auto-verified, JWT returned immediately).
- When a real email is provided, a verification email is sent. No JWT is issued until the email is verified.
- Login will return HTTP 403 until the email is verified.
- Admin-created accounts (via /create-admin or /create-user) are pre-verified automatically.
- Google-authenticated accounts are pre-verified (Google already confirmed the email).

### 5.3 Google Login / Signup (Public)

Endpoint:
- POST /api/auth/google

Request body example:

```json
{
  "idToken": "<GOOGLE_ID_TOKEN>"
}
```

Success response example:

```json
{
  "token": "<JWT_TOKEN>",
  "role": "USER",
  "fullName": "Google User Name",
  "username": "google_derived_username",
  "user": {
    "id": "<USER_ID>",
    "username": "google_derived_username",
    "role": "USER",
    "fullName": "Google User Name",
    "email": "googleuser@example.com",
    "phoneNumber": null,
    "address": null
  }
}
```

Notes:
- Verifies idToken using google-auth-library.
- Audience uses GOOGLE_CLIENT_ID env if set; otherwise falls back to built-in default client ID.
- If user does not exist by email, backend creates a USER account automatically.

### 5.4 Create Admin (SUPER_ADMIN only)

Endpoint:
- POST /api/auth/create-admin

Headers:

Authorization: Bearer <SUPER_ADMIN_TOKEN>

Request body example:

```json
{
  "username": "admin1",
  "email": "admin1@example.com",
  "password": "Admin123!",
  "fullName": "Admin One",
  "address": "Optional",
  "phoneNumber": "Optional"
}
```

Success response example:

```json
{
  "message": "Admin account created.",
  "userId": "<ADMIN_ID>"
}
```

Notes:
- username, email, password, fullName are required.
- **Email Verification**: Admin accounts created by SUPER_ADMIN now require email verification. A link is sent to the provided email, and the account remains locked until verified.
- Returns 409 if username or email already exists.

### 5.5 Create User (ADMIN only)

Endpoint:
- POST /api/auth/create-user

Headers:

Authorization: Bearer <ADMIN_TOKEN>

Request body example:

```json
{
  "username": "user1",
  "email": "user1@example.com",
  "password": "User123!",
  "fullName": "Worker One",
  "address": "Optional",
  "phoneNumber": "Optional"
}
```

Success response example:

```json
{
  "message": "User account created under admin.",
  "userId": "<USER_ID>"
}
```

Notes:
- adminId is set automatically using logged-in ADMIN token.
- **Email Verification**: User accounts created by ADMIN now require email verification. A link is sent to the provided email, and the account remains locked until verified.

### 5.6 Verify Email (Public)

Endpoint:
- GET /api/auth/verify-email?token=\<TOKEN\>

Query parameter:
- token: 64-char hex token received in the verification email link

Success response:

```json
{
  "message": "Email verified successfully! You can now log in to your account.",
  "emailVerified": true
}
```

Error responses:
- 400 token missing, invalid, or expired
- 200 already verified (idempotent)

### 5.7 Resend Verification Email (Public)

Endpoint:
- POST /api/auth/resend-verification

Request body:

```json
{
  "email": "new_user@example.com"
}
```

Success response:

```json
{
  "message": "Verification email resent. Please check your inbox."
}
```

Notes:
- Issues a fresh 24-hour token and invalidates the old one.
- **Security Check**: Now requires `username` and `email`. The backend verifies that the provided email matches the one registered for that username.
- Returns 400 if the account is already verified or if the email/username pair is incorrect.
- Returns generic success message if the user is not found to prevent enumeration.

## 6. Tank APIs

Controller:
- src/controllers/tankController.js

### 6.1 Register Tank (ADMIN only)

Endpoint:
- POST /api/tanks/register

Headers:

Authorization: Bearer <ADMIN_TOKEN>

Request body example:

```json
{
  "name": "Main Tank",
  "tankId": "GUARD-001",
  "workerIds": []
}
```

Success response example:

```json
{
  "message": "Tank registered successfully.",
  "tank": {
    "id": "<TANK_OBJECT_ID>",
    "tankId": "GUARD-001",
    "name": "Main Tank",
    "adminId": "<ADMIN_ID>",
    "workerIds": [],
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
    "createdAt": "ISO_DATE",
    "updatedAt": "ISO_DATE"
  }
}
```

Validation:
- name and tankId are required
- workerIds can include only USER accounts under the same ADMIN

### 6.2 Assign User to Tank (ADMIN only)

Endpoint:
- POST /api/tanks/:tankId/assign-user

Headers:

Authorization: Bearer <ADMIN_TOKEN>

Request body example:

```json
{
  "userId": "<USER_ID>"
}
```

Success response example:

```json
{
  "message": "User assigned to tank."
}
```

Validation:
- tank must belong to current ADMIN
- user must be USER and belong to current ADMIN

### 6.3 Get Tanks (ADMIN or USER)

Endpoint:
- GET /api/tanks

Headers:

Authorization: Bearer <ADMIN_OR_USER_TOKEN>

Behavior:
- ADMIN receives all tanks owned by that ADMIN
- USER receives only tanks assigned to that USER
- SUPER_ADMIN is blocked by controller logic

Response:
- array of tanks with computed isHealthy field
- isHealthy currently checks temperature and pH ranges

### 6.4 Get Tank Status (ADMIN or USER)

Endpoint:
- GET /api/tanks/:tankId/status

Headers:

Authorization: Bearer <ADMIN_OR_USER_TOKEN>

Success response example:

```json
{
  "name": "Main Tank",
  "tankId": "GUARD-001",
  "status": "online",
  "currentStats": {
    "temp": 26.4,
    "pH": 7.2,
    "tds": 330,
    "turbidity": 5.5,
    "waterLevel": 75
  }
}
```

Access:
- ADMIN can read own tanks
- USER can read assigned tanks only

### 6.5 Control Tank Actuators (ADMIN or USER)

Endpoint:
- POST /api/tanks/:tankId/actuators

Headers:

Authorization: Bearer <ADMIN_OR_USER_TOKEN>

Request body example:

```json
{
  "command": "feed"
}
```

Supported commands:
- feed: Activate feed mechanism
- pump_on: Turn pump on
- pump_off: Turn pump off

Validation:
- command is required and must be one of the supported values
- user must have access to the tank (tank owner for ADMIN, assigned for USER)

Success response example (202 Accepted):

```json
{
  "message": "feed command queued.",
  "tankId": "GUARD-001",
  "command": "feed",
  "topic": "device/GUARD-001/command",
  "payload": "feed"
}
```

Error responses:
- 400 invalid command or missing fields
- 404 tank not found or no access
- 503 MQTT broker not connected or publish failed

Behavior:
- Command is published to MQTT topic device/{tankId}/command
- Payload contains plain text command word (feed, pump_on, or pump_off)
- Response returns 202 (Accepted) when command is queued successfully

Related files:
- src/routes/tankRoutes.js
- src/controllers/actuatorController.js
- src/services/actuatorService.js
- src/services/mqttService.js

## 7. Sensor APIs

Controller:
- src/controllers/sensorController.js

### 7.1 Log Sensor Data (Public)

Endpoint:
- POST /api/sensors/log

Auth:
- no JWT required in current setup

Request body example:

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

Success response example:

```json
{
  "message": "Hybrid sync complete: State in Mongo, History in Influx!",
  "currentStatus": "online"
}
```

Failure example:

```json
{
  "error": "Failed to log sensor data to databases."
}
```

### 7.2 Get Tank History (Protected)

Endpoint:
- GET /api/sensors/history/:tankId

Headers:

Authorization: Bearer <ADMIN_OR_USER_TOKEN>

Access:
- ADMIN can read own tank history
- USER can read assigned tank history
- SUPER_ADMIN returns forbidden

Success response example:

```json
[
  {
    "time": "2026-04-23T10:00:00Z",
    "temp": 26.1,
    "pH": 7.2,
    "tds": 330,
    "turbidity": 4.3,
    "waterLevel": 80
  }
]
```

## 8. MQTT Ingestion

Service:
- src/services/mqttService.js

Current connection:
- HiveMQ Cloud via MQTT over TLS (mqtts)
- URL, User, and Password from environment variables (`MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`)
- Connects with `rejectUnauthorized: true` to enforce strict SSL/TLS verification

Subscribed topic pattern:
- sensor/+/+

Expected topic format:
- sensor/{tankId}/{sensorType}

Supported sensorType values:
- temperature
- ph
- tds
- turbidity
- waterlevel

Expected payload format:

```json
{
  "value": 28.31,
  "time": "2026-04-20 16:36:54"
}
```

Current behavior:
- value is parsed and stored.
- Mongo latest tank state is updated (if the tank exists).
- If the tank is not registered in MongoDB, the message is gracefully ignored.
- Influx measurement `water_quality` is updated.

## 8.1 MQTT Alerts Ingestion

Subscribed topic pattern:
- `alert/+/+`

Expected topic format:
- `alert/{tankId}/{sensorType}`

Behavior:
- When an alert is received, the backend looks up the tank owner (Admin) and all assigned Workers.
- A high-priority email notification is sent to all these recipients.
- The alert is broadcast via WebSocket to connected clients.
- If the tank is not registered, the alert is ignored.

## 9. MQTT Actuation

Service:
- src/services/mqttService.js
- src/services/actuatorService.js

Publish topic pattern:
- device/{tankId}/command

Supported commands:
- feed: Activate feed mechanism
- pump_on: Turn pump on
- pump_off: Turn pump off

Payload format:
- Plain text string containing the command word

Example:
- Topic: device/GUARD-001/command
- Payload: feed

The backend publishes actuator commands when receiving requests to POST /api/tanks/:tankId/actuators with a JSON body containing the command field. The ESP32 connected to the MQTT broker receives the command on this topic and executes it.

## 10. Running the System

Complete startup guide for all services. Run each step in order.

### Prerequisites

- Node.js 22+
- Docker Desktop (running)
- npm

### Service Map

| Service    | Technology              | Port | Started by            |
|------------|-------------------------|------|-----------------------|
| MongoDB    | Docker (mongo:7)        | 27017| Docker command below  |
| InfluxDB   | Docker (influxdb:2.7)   | 8086 | Docker command below  |
| MQTT Broker| HiveMQ Cloud            | 8883 | Hosted remotely       |
| Backend    | Node.js / Express       | 5000 | npm run dev           |
| Frontend   | Vite / React            | 5173 | npm run dev           |

---

### Step 1 — Start MongoDB (Docker)

MongoDB must run as a replica set because Prisma uses transactions.

```powershell
# First time only — creates the named container
docker run -d --name guard-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all

# Wait ~3 seconds, then initialise the replica set
docker exec guard-mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
```

Subsequent starts (container already exists):

```powershell
docker start guard-mongo
```

Verify:

```powershell
docker ps --filter name=guard-mongo
```

Expected: `STATUS` shows `Up`.

---

### Step 2 — Start InfluxDB (Docker)

```powershell
# First time only — creates the named container with pre-configured org/bucket/token
docker run -d --name guard-influx -p 8086:8086 `
  -e DOCKER_INFLUXDB_INIT_MODE=setup `
  -e DOCKER_INFLUXDB_INIT_USERNAME=admin `
  -e DOCKER_INFLUXDB_INIT_PASSWORD=Admin12345! `
  -e DOCKER_INFLUXDB_INIT_ORG=G.U.A.R.D `
  -e DOCKER_INFLUXDB_INIT_BUCKET=guard_sensors `
  -e DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=<same-token-as-INFLUX_TOKEN-in-.env> `
  influxdb:2.7
```

Subsequent starts:

```powershell
docker start guard-influx
```

Verify (browser or curl):

```powershell
Invoke-RestMethod http://localhost:8086/ping
```

Expected: HTTP 204 (no output, just no error).

---

### Step 3 — MQTT Broker

We now use HiveMQ Cloud instead of the local Docker Mosquitto broker. 
No local Docker container is needed for MQTT anymore. 
Ensure you have the correct `MQTT_BROKER_URL`, `MQTT_USERNAME`, and `MQTT_PASSWORD` set in `.env`.

---

### Step 4 — Configure Environment

Backend env file is at `code/backend/.env`. Key variables:

```
PORT=5000
DATABASE_URL=mongodb://localhost:27017/iot_db
JWT_SECRET=<strong-secret>
JWT_EXPIRY=1d

GOOGLE_CLIENT_ID=<your-google-client-id>

MQTT_BROKER_URL=mqtts://71d3962284c44824be0bfe8cfedfedb7.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=Admin_Sub
MQTT_PASSWORD=<broker-password>

INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=<influx-admin-token>
INFLUX_ORG=G.U.A.R.D
INFLUX_BUCKET=guard_sensors

CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-gmail>
SMTP_PASS=<gmail-app-password>
ALERT_EMAIL=<destination-for-alerts>
```

Frontend env file is at `code/frontend/.env.local`:

```
VITE_GOOGLE_CLIENT_ID=<same-google-client-id>
```

---

### Step 5 — Install Dependencies & Generate Prisma Client

Run once after a fresh clone or after schema changes:

```powershell
cd code/backend
npm install
npx prisma generate
```

```powershell
cd code/frontend
npm install
```

---

### Step 6 — Seed the Database

Optionally open Prisma Studio to browse/edit the database visually (separate terminal):

```powershell
cd code/backend
npx prisma studio
# Opens at http://localhost:5555
```


Create the initial SUPER_ADMIN account (run once):

```powershell
cd code/backend
npm run seed
```

Optionally seed demo admin/users/tanks/history for UI development:

```powershell
npm run seed:analytics
```

Default SUPER_ADMIN credentials after seeding:

```
username : superadmin
email    : superadmin@example.com
password : ChangeMe123!
```

Demo ADMIN / USER credentials (seed:analytics only):

```
ADMIN  username : analytics_admin     password : Admin@1234
USER   username : analytics_worker_1  password : Worker@1234
```

---

### Step 7 — Start Backend

```powershell
cd code/backend
npm run dev
```

Expected console output:

```
🚀 Server ready at http://localhost:5000
✅ MongoDB securely connected via Prisma!
```

Health check:

```powershell
Invoke-RestMethod http://localhost:5000/
```

Expected: `Water IoT Backend is running!`

---

### Step 8 — Start Frontend

Open a second terminal:

```powershell
cd code/frontend
npm run dev
```

Expected output:

```
VITE ready in ~500ms
  Local:   http://localhost:5173/
  Network: http://192.168.x.x:5173/   <- shown only when host:true is set
```

Open http://localhost:5173 in your browser.

---

### All-Services Status Check

Run this at any time to see what is up:

```powershell
docker ps --format "{{.Names}} | {{.Status}} | {{.Ports}}"
```

Expected (all three containers running):

```
mqtt_broker  | Up X minutes | 0.0.0.0:1883->1883/tcp, 0.0.0.0:9001->9001/tcp
guard-influx | Up X hours   | 0.0.0.0:8086->8086/tcp
guard-mongo  | Up X hours   | 0.0.0.0:27017->27017/tcp
```

---

### Stopping All Services

```powershell
# Stop Docker containers (data is preserved in named volumes)
docker stop guard-mongo guard-influx mqtt_broker

# Stop backend / frontend — press Ctrl+C in each terminal
```

---

### Troubleshooting

**Port already in use (27017 / 8086)**
Another container or system service is already occupying the port. Either stop the conflict or use the already-running instance.

```powershell
netstat -ano | findstr :27017
```

**Prisma replica set error**
MongoDB is not running in replica set mode. Recreate `guard-mongo` with `--replSet rs0` and re-run `rs.initiate()`.

**MQTT connection refused / Not authorized**
- Check `MQTT_USERNAME` and `MQTT_PASSWORD` in `.env` match the broker's `pwfile`.
- Verify `mqtt_broker` container is running.

**Email verification not sending**
- Check `SMTP_USER` / `SMTP_PASS` in `.env`.
- For Gmail, use an App Password (not your login password). Enable 2FA first, then generate one at https://myaccount.google.com/apppasswords

**InfluxDB sensor history returns 500**
- Confirm `guard-influx` is running.
- Verify `INFLUX_TOKEN`, `INFLUX_ORG`, and `INFLUX_BUCKET` exactly match what was set when the container was created.

---

## 11. Seed and Utility Scripts

| Script                | Command                  | Purpose                                       |
|-----------------------|--------------------------|-----------------------------------------------|
| Base seed             | `npm run seed`           | Creates SUPER_ADMIN if not present            |
| Analytics seed        | `npm run seed:analytics` | Creates admin, users, tanks, Influx history   |
| DB init (replica set) | `npm run db:init`        | Initialises rs0 inside Docker Mongo container |
| Prisma Studio         | `npx prisma studio`      | Visual DB browser at http://localhost:5555    |

---

## 12. Frontend Reference

Frontend root: `code/frontend`  
Framework: Vite + React 19  
Dev server: http://localhost:5173

### Key files

| File | Purpose |
|---|---|
| `src/services/api.js` | All REST calls — includes `authApi.verifyEmail`, `authApi.resendVerification` |
| `src/context/AuthContext.jsx` | Auth state; `register()` handles both token and no-token responses |
| `src/pages/Register.jsx` | Form + "Check your inbox" confirmation screen with Resend button |
| `src/pages/Login.jsx` | Login form + amber banner when account email is unverified |
| `vite.config.js` | Proxies `/api` to backend; `host:true` when LAN testing is needed |

### Registration UI flow

```
User fills form with real email
  POST /api/auth/register
    backend creates user, sends email, returns { emailVerified: false }
  Register.jsx swaps to Check-Inbox screen
    [Resend] button -> POST /api/auth/resend-verification
    [Already verified? Sign In] link -> /login
```

### Login UI flow — unverified account

```
User submits username / password
  POST /api/auth/login -> 403 "Email not verified"
  Login.jsx shows amber warning banner
    [Resend verification email] button (prompts for email address)
```

### After clicking email link

```
Frontend route /verify-email
  reads ?token= from URL
  GET /api/auth/verify-email?token=<hex>
  Shows success or error message
  User can now log in -> JWT issued
```

---

## 13. Mobile / LAN Testing

To open the verification email link on a phone while both devices are on the same Wi-Fi network.

### Step 1 — Expose Vite to the network

In `code/frontend/vite.config.js` ensure `host: true` is present:

```js
server: {
  port: 5173,
  host: true,  // TEMP: binds to 0.0.0.0 so LAN devices can reach it
  ...
}
```

Restart `npm run dev`. Terminal now shows a **Network** address.

### Step 2 — Let the backend auto-detect the LAN IP

In `code/backend/.env` comment out `FRONTEND_URL`:

```
# FRONTEND_URL=http://localhost:5173
```

With `FRONTEND_URL` unset, `src/services/emailService.js` calls `os.networkInterfaces()`, skips VMware / Hyper-V / WSL virtual adapters, and returns the first real Wi-Fi or Ethernet IP (e.g. `192.168.1.164`).

Verification links in emails will look like:

```
http://192.168.1.164:5173/verify-email?token=<hex>
```

### Step 3 — Revert when done

```
# .env — restore:
FRONTEND_URL=http://localhost:5173

# vite.config.js — remove the host: true line
```

> **Windows Firewall:** If the phone cannot connect, add an inbound rule for TCP port 5173, or temporarily allow Node.js through Windows Defender Firewall.

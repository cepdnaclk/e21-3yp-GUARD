# G.U.A.R.D Backend API Documentation V2

Last updated: 2026-04-23  
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
- 500 Login error

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

Success response example:

```json
{
  "token": "<JWT_TOKEN>",
  "role": "USER",
  "fullName": "New User",
  "username": "new_user",
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
- If email is omitted, backend assigns username@local.guard.

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

Common errors:
- 400 required fields missing
- 403 forbidden
- 409 username or email already exists
- 500 failed to create admin account

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
- mqtt://localhost:1883
- credentials from MQTT_USER and MQTT_PASSWORD environment variables

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
- value is parsed and stored
- payload time is ignored
- Mongo latest tank state is updated
- Influx measurement water_quality is updated

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

## 9. Seed and Run

Seeder files:
- seed.js
- seed-analytics.js

Create initial SUPER_ADMIN:
- npm run seed

Create analytics test users/tanks/history:
- npm run seed:analytics

Run backend:
- npm run dev

Default seed fallback credentials:
- username: superadmin
- email: superadmin@example.com
- password: ChangeMe123!

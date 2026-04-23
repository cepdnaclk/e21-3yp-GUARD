# G.U.A.R.D Backend API Documentation V2

Last updated: 2026-04-23  
Backend root: code/backend_new  
Server entry: src/index.js

## 1. Base Information

Base URL (local): http://localhost:5000  
Content type: application/json  
Auth type: Bearer JWT

Public routes:
- GET /
- POST /api/auth/login
- POST /api/sensors/log

Protected routes:
- POST /api/auth/create-admin
- POST /api/auth/create-user
- POST /api/tanks/register
- POST /api/tanks/:tankId/assign-user
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
- SUPER_ADMIN creates ADMIN accounts.
- ADMIN creates USER accounts under that ADMIN.
- ADMIN creates tanks under that ADMIN.
- ADMIN assigns USER accounts to tanks owned by that ADMIN.
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

### 5.2 Create Admin (SUPER_ADMIN only)

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

### 5.3 Create User (ADMIN only)

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
- isHealthy currently checks only temperature and pH ranges

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

## 7. Sensor APIs

Controller:
- src/controllers/sensorController.js

### 7.1 Log Sensor Data (Public for now)

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

Broker:
- mqtt://localhost:1883
- MQTT_USER and MQTT_PASSWORD from environment

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
- time is currently ignored
- Mongo latest tank state is updated
- Influx measurement water_quality is updated

## 9. Seed and Run

Seeder:
- seed.js

Create initial SUPER_ADMIN:
- npm run seed

Run backend:
- npm run dev

Default seed fallback credentials:
- username: superadmin
- email: superadmin@example.com
- password: ChangeMe123!
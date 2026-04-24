# G.U.A.R.D Backend API Documentation V2 Client Quick Reference

Last updated: 2026-04-23  
Base URL: http://localhost:5000

Source routes:
- src/routes/authRoutes.js
- src/routes/tankRoutes.js
- src/routes/sensorRoutes.js

## 1. Auth Header

Protected endpoints require:

Authorization: Bearer YOUR_JWT_TOKEN

## 2. Roles

- SUPER_ADMIN: create ADMIN accounts
- ADMIN: create USER accounts, create tanks, assign users to tanks
- USER: view only assigned tanks
- Sensor log endpoint is public for now

## 3. Endpoint List

### Health
- GET /

Response:
- Water IoT Backend is running!

### Auth
- POST /api/auth/login
- POST /api/auth/create-admin (SUPER_ADMIN only)
- POST /api/auth/create-user (ADMIN only)

### Tanks
- POST /api/tanks/register (ADMIN only)
- POST /api/tanks/:tankId/assign-user (ADMIN only)
- GET /api/tanks (ADMIN or USER)
- GET /api/tanks/:tankId/status (ADMIN or USER)

### Sensors
- POST /api/sensors/log (public)
- GET /api/sensors/history/:tankId (ADMIN or USER)

## 4. Request and Response Samples

### 4.1 Login

POST /api/auth/login

Body:

```json
{
	"username": "superadmin",
	"password": "ChangeMe123!"
}
```

Success:

```json
{
	"token": "JWT_TOKEN",
	"role": "SUPER_ADMIN",
	"fullName": "Super Admin",
	"adminId": null
}
```

### 4.2 Create Admin (SUPER_ADMIN)

POST /api/auth/create-admin

Headers:

Authorization: Bearer SUPER_ADMIN_TOKEN

Body:

```json
{
	"username": "admin1",
	"email": "admin1@example.com",
	"password": "Admin123!",
	"fullName": "Admin One"
}
```

Success:

```json
{
	"message": "Admin account created.",
	"userId": "ADMIN_ID"
}
```

### 4.3 Create User (ADMIN)

POST /api/auth/create-user

Headers:

Authorization: Bearer ADMIN_TOKEN

Body:

```json
{
	"username": "user1",
	"email": "user1@example.com",
	"password": "User123!",
	"fullName": "Worker One"
}
```

Success:

```json
{
	"message": "User account created under admin.",
	"userId": "USER_ID"
}
```

### 4.4 Register Tank (ADMIN)

POST /api/tanks/register

Headers:

Authorization: Bearer ADMIN_TOKEN

Body:

```json
{
	"name": "Main Tank",
	"tankId": "GUARD-001",
	"workerIds": []
}
```

Success:

```json
{
	"message": "Tank registered successfully.",
	"tank": {
		"id": "TANK_OBJECT_ID",
		"tankId": "GUARD-001",
		"name": "Main Tank",
		"adminId": "ADMIN_ID"
	}
}
```

### 4.5 Assign User to Tank (ADMIN)

POST /api/tanks/GUARD-001/assign-user

Headers:

Authorization: Bearer ADMIN_TOKEN

Body:

```json
{
	"userId": "USER_ID"
}
```

Success:

```json
{
	"message": "User assigned to tank."
}
```

### 4.6 Get Tanks (ADMIN or USER)

GET /api/tanks

Headers:

Authorization: Bearer ADMIN_OR_USER_TOKEN

Success:

```json
[
	{
		"tankId": "GUARD-001",
		"name": "Main Tank",
		"status": "online",
		"isHealthy": true
	}
]
```

### 4.7 Get Tank Status (ADMIN or USER)

GET /api/tanks/GUARD-001/status

Headers:

Authorization: Bearer ADMIN_OR_USER_TOKEN

Success:

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

### 4.8 Log Sensor Data (Public)

POST /api/sensors/log

Body:

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

Success:

```json
{
	"message": "Hybrid sync complete: State in Mongo, History in Influx!",
	"currentStatus": "online"
}
```

### 4.9 Get Sensor History (ADMIN or USER)

GET /api/sensors/history/GUARD-001

Headers:

Authorization: Bearer ADMIN_OR_USER_TOKEN

Success:

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

## 5. Fast Test Order

1. Login as SUPER_ADMIN.
2. Create ADMIN.
3. Login as ADMIN.
4. Create USER.
5. Create tank.
6. Assign USER to tank.
7. Login as USER.
8. Call GET /api/tanks and GET /api/tanks/:tankId/status.
9. Send POST /api/sensors/log and check status/history again.
# Required API Specification for Frontend (`requedapi.md`)

Last updated: 2026-04-22
Frontend root: `code/frontend`

This document defines:
- APIs currently used by the frontend and expected to work now.
- APIs required in future backend iterations to fully support all frontend features.

## 1) Base contract

- Base URL: `http://localhost:5000`
- API prefix: `/api`
- Content-Type: `application/json`
- Protected endpoints must accept:
  - `Authorization: Bearer <JWT_TOKEN>`

## 2) APIs used by current frontend (must exist)

## 2.1 Auth

### POST `/api/auth/register`
Request:
```json
{
  "username": "alice",
  "password": "alice123",
  "fullName": "Alice Doe",
  "email": "alice@example.com",
  "phoneNumber": "+94123456789",
  "address": "Colombo"
}
```
Response (current backend):
```json
{
  "message": "User created successfully",
  "userId": "..."
}
```

### POST `/api/auth/login`
Request:
```json
{
  "username": "alice",
  "password": "alice123"
}
```
Response:
```json
{
  "token": "<JWT>",
  "role": "ADMIN",
  "fullName": "Alice Doe"
}
```

## 2.2 Tanks

### GET `/api/tanks`
Response:
```json
[
  {
    "tankId": "GUARD-001",
    "name": "Main Tank",
    "status": "online",
    "isHealthy": true,
    "createdAt": "2026-04-22T10:00:00Z",
    "updatedAt": "2026-04-22T10:05:00Z"
  }
]
```

### POST `/api/tanks/register`
Request:
```json
{
  "tankId": "GUARD-001",
  "name": "Main Tank"
}
```
Response:
```json
{
  "message": "G.U.A.R.D. Tank registered successfully!",
  "tank": {
    "tankId": "GUARD-001",
    "name": "Main Tank"
  }
}
```

### GET `/api/tanks/:tankId/status`
Response:
```json
{
  "name": "Main Tank",
  "status": "online",
  "currentStats": {
    "temp": 26.1,
    "pH": 7.2,
    "tds": 330,
    "turbidity": 4.3
  },
  "history": null
}
```

## 2.3 Sensor history

### GET `/api/sensors/history/:tankId`
Response:
```json
[
  {
    "time": "2026-04-22T10:05:00Z",
    "temp": 26.2,
    "pH": 7.1,
    "tds": 332,
    "turbidity": 4.8,
    "waterLevel": 77
  }
]
```

## 3) Frontend behavior assumptions

- On login success:
  - Save `token` to local storage key: `token`
  - Save `role` to local storage key: `role`
  - Send token on every protected request as bearer auth header.
- Role-based route guard:
  - `ADMIN` can access devices, alerts/status page, sensor history, and tank details.

## 4) APIs required for future backend work

These are needed to restore full original frontend feature set (beyond current backend capability).

## 4.1 User/session

### GET `/api/auth/me` (required)
Purpose: refresh user profile on app reload.
Response (proposed):
```json
{
  "id": "...",
  "username": "alice",
  "fullName": "Alice Doe",
  "email": "alice@example.com",
  "phoneNumber": "+94123456789",
  "address": "Colombo",
  "role": "ADMIN",
  "createdAt": "2026-04-22T10:00:00Z"
}
```

### PUT `/api/auth/profile` (required)
Purpose: persist profile edits.
Request:
```json
{
  "username": "alice",
  "fullName": "Alice Doe",
  "email": "alice@example.com",
  "phoneNumber": "+94123456789",
  "address": "Colombo"
}
```
Response:
```json
{
  "username": "alice",
  "fullName": "Alice Doe",
  "email": "alice@example.com",
  "phoneNumber": "+94123456789",
  "address": "Colombo",
  "role": "ADMIN"
}
```

## 4.2 Alerts/notifications

### GET `/api/alerts` (required)
Query params:
- `tankId` (optional)
- `resolved` (optional boolean)

Response:
```json
[
  {
    "id": "a1",
    "type": "PH_HIGH",
    "message": "pH above threshold",
    "value": 9.1,
    "tankId": "GUARD-001",
    "resolved": false,
    "createdAt": "2026-04-22T10:05:00Z"
  }
]
```

### POST `/api/alerts/resolve` (required)
Request:
```json
{
  "alertId": "a1"
}
```
Response:
```json
{
  "success": true
}
```

## 4.3 Sensor metadata

### GET `/api/sensor-types` (optional but recommended)
Purpose: UI filter dropdown and sensor labels.
Response:
```json
[
  { "id": "temperature", "sensorName": "Temperature" },
  { "id": "pH", "sensorName": "pH" },
  { "id": "tds", "sensorName": "TDS" },
  { "id": "turbidity", "sensorName": "Turbidity" },
  { "id": "waterLevel", "sensorName": "Water Level" }
]
```

## 4.4 Optional tank management improvements

### PUT `/api/tanks/:tankId`
Purpose: edit tank metadata from frontend.

### DELETE `/api/tanks/:tankId`
Purpose: remove tanks from frontend.

## 5) Error response standard (recommended)

Use one consistent shape for all non-2xx responses:
```json
{
  "error": "Human-readable error message"
}
```

For validation errors:
```json
{
  "errors": [
    { "msg": "username is required", "path": "username" }
  ]
}
```

## 6) Quick backend checklist for compatibility

- [ ] `/api/auth/login` accepts `{ username, password }` only.
- [ ] Protected routes reject missing/invalid JWT with 401.
- [ ] `/api/tanks` returns `tankId`, `name`, `status`, `isHealthy`.
- [ ] `/api/tanks/:tankId/status` returns `currentStats` object.
- [ ] `/api/sensors/history/:tankId` returns array with `time`.
- [ ] Register endpoint always returns proper error JSON on failure.

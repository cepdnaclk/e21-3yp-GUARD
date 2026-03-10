# Changelog — G.U.A.R.D Backend

All notable changes to the backend are documented in this file.

---

## [2.2.0] — 2026-03-10

### Changed — Login by Username or Email

#### API

- `POST /auth/login` — request body field renamed from `username` to `login`; now accepts either a **username** or an **email address**
  - If the value contains `@` the lookup is done by `email`; otherwise by `username`
  - Error message for bad credentials unified to `"Invalid credentials."`

#### Dev Test Page (`/test-auth`)

- **Username & Password** card added alongside the existing Google OAuth card
  - **Login** tab — `login` + `password` fields (placeholder shows both options)
  - **Register** tab — `username`, `password`, `fullName`, `email` (optional)
- Google OAuth card now gracefully disables itself with a warning when `GOOGLE_CLIENT_ID` is not configured (instead of hiding the whole page)
- Result card shows registered/logged-in status for both auth paths
- HTML is read from disk on every request in dev mode — edits are reflected without a server restart

#### Dev Server Stability

- Added `predev` npm script — runs `kill-port 3000` before nodemon starts, preventing `EADDRINUSE` crashes on `npm run dev`
- `server.js` now handles `EADDRINUSE` with a clean `process.exit(1)` instead of an unhandled exception — nodemon retries properly on file changes rather than getting stuck

---

## [2.1.0] — 2026-03-10

### Added — Dual Authentication (Google OAuth + Username/Password)

#### Database

- `users.password` is now **nullable** (allows Google-only users who never set a password)
- Added `users.google_id` column (unique, nullable) for Google OAuth users

#### API

- `POST /auth/google` — **restored** Google OAuth login; accepts `{ idToken }`, returns JWT + user
- Google users are auto-created with email prefix as username on first login
- Existing `/auth/register` and `/auth/login` endpoints remain unchanged

#### Config

- `GOOGLE_CLIENT_ID` env var is now **optional** — Google login is disabled if not set
- Added `google.clientId` back to config object

#### Auth Flow

- **Password users**: register via `/auth/register`, login via `/auth/login`
- **Google users**: login via `/auth/google`; account created automatically on first use
- Both methods issue the same JWT format — all protected routes work identically

---

## [2.0.0] — 2026-03-10

### ⚠️ BREAKING — Full Database & API Restructure

This release replaces the previous Google OAuth + Location/Tank hierarchy with a simpler username/password auth system and a flat User → Device model with normalized sensor readings.

### Database

#### Removed

- `locations` table (physical sites)
- `tanks` table (aquarium/pond units)
- `DeviceStatus` enum (`ONLINE`, `OFFLINE`, `UNKNOWN`)
- `google_id` column from `users`
- `device_uid`, `device_secret`, `tank_id`, `status`, `last_seen` columns from `devices`
- Wide sensor reading columns (`ph`, `temperature`, `tds`, `turbidity`, `water_level`)

#### Added

- **`users`** — now uses `username`/`password` (bcrypt) auth with `full_name`, `email`, `phone_number`, `address`; integer auto-increment PK
- **`devices`** — linked directly to `users` via `user_id`; `device_id` is an integer PK (matches ESP32 device IDs 100–200); optional `device_name` and `location`
- **`sensor_types`** — new table for sensor definitions (`sensor_name`, `frequency` e.g. hourly, twice_daily, weekly)
- **`sensor_readings`** — normalized: each row stores one `value` for one `device_id` + `sensor_id` + `reading_time`; composite indexes on `(device_id, reading_time)` and `(sensor_id, reading_time)`
- **`alerts`** — now references `device_id` (integer) directly

#### Migration

- File: `prisma/migrations/20260310000000_restructure_schema/migration.sql`
- **Destructive** — drops all old tables and recreates them. Existing data will be lost.

### API

#### Removed

- `POST /auth/google` — Google OAuth login endpoint

#### Added

- `POST /auth/register` — register with `username`, `password`, `fullName`, optional `email`, `phoneNumber`, `address`
- `POST /auth/login` — login with `username` + `password`, returns JWT
- `GET /sensor-types` — list all sensor types
- `POST /sensor-types` — create a sensor type (`sensorName`, `frequency`)
- `GET /sensor-types/:id` — get a sensor type by ID

#### Changed

- `GET /auth/me` — now returns `username`, `fullName`, `email`, `phoneNumber`, `address`, `createdAt`
- `POST /devices` — body now takes `deviceId` (int), optional `deviceName`, `location` (removed `tankId`, `deviceUid`, `deviceSecret`)
- `GET /devices/:id` — `id` param is now an integer
- `GET /sensor/latest?device_id=` — `device_id` is now an integer; returns an array of latest readings per sensor type (one per sensor)
- `GET /sensor/history` — added optional `sensor_id` query param to filter by sensor type; `device_id` is now an integer

### MQTT

#### Changed

- **Subscribe topic**: `aquamonitor/devices/+/data` → `sensor/+/+` (e.g. `sensor/100/temperature`)
- **Payload format**: now expects `{ "value": <float>, "time": "<YYYY-MM-DD HH:MM:SS>" }` per the ESP32 data structure
- Removed device authentication via `device_secret` / bcrypt verification from MQTT pipeline
- Sensor type is resolved dynamically from the topic's sensor name segment

### Modules

#### Changed

- `auth.service.js` — replaced Google OAuth (`verifyGoogleToken`, `findOrCreateUser`) with `registerUser` and `loginUser` (bcrypt)
- `auth.controller.js` — replaced `googleLogin` with `register` and `login` handlers
- `auth.routes.js` — routes changed to `/register`, `/login`, `/me`
- `device.service.js` — simplified ownership: direct `userId` lookup instead of `tank → location → owner` chain
- `device.controller.js` — validation updated for integer `deviceId`
- `sensor.service.js` — `getLatestReading` → `getLatestReadings` (returns per-sensor-type latest); `getHistory` now accepts `sensorId` filter
- `sensor.controller.js` — ownership check uses `device.userId` directly; added `sensor_id` query param
- `alert.service.js` — `detectAlerts` now takes a `sensorType` argument and uses a rule map keyed by sensor name; ownership queries use `device.userId` instead of nested `tank.location.ownerId`
- `mqttClient.js` — completely rewritten for `sensor/<deviceId>/<sensorName>` topic pattern
- `config.js` — removed `GOOGLE_CLIENT_ID` from required env vars and from config object

#### Added

- `modules/sensor-types/` — new module with `sensorType.service.js`, `sensorType.controller.js`, `sensorType.routes.js`

### Config

- `GOOGLE_CLIENT_ID` is no longer required in environment variables

---

## [1.0.0] — 2026-03-07

### Initial Release

- Google OAuth authentication with JWT
- Location → Tank → Device hierarchy
- Wide-format sensor readings (pH, temperature, TDS, turbidity, water level)
- MQTT ingestion via `aquamonitor/devices/+/data` with device secret verification
- Alert detection engine with configurable thresholds
- Email + WebSocket notifications
- Docker Compose setup with Mosquitto MQTT broker

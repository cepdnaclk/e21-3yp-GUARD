# Project Guidelines

## Code Style
- Follow existing module patterns instead of introducing new architectural styles.
- Backend uses CommonJS (`require`/`module.exports`) and service-oriented modules under `code/backend/src/modules/*`.
- Frontend uses React function components, hooks, and plain CSS in `code/frontend/src/styles/global.css`.
- Keep naming consistent with current API contracts:
  - Frontend query params: `device_id`, `sensor_id`.
  - Frontend JS objects: camelCase (`deviceId`, `sensorId`) before query-string mapping.

## Architecture
- Monorepo with 3 main areas:
  - `code/backend`: Express + Prisma + PostgreSQL + MQTT + Socket.IO.
  - `code/frontend`: React + Vite dashboard client.
  - `code/Esp32`: firmware source.
- Core backend data flow:
  - MQTT topic `sensor/<deviceId>/<sensorName>` is consumed in `code/backend/src/mqtt/mqttClient.js`.
  - Sensor readings are persisted through Prisma.
  - Alert rules run after each reading and emit realtime events through notifications.
- API surface is mounted in `code/backend/src/app.js` with route modules:
  - `/auth`, `/devices`, `/sensor-types`, `/sensor`, `/alerts`.
- Frontend should call backend only through `code/frontend/src/services/api.js` and use `AuthContext` for auth/session behavior.

## Build and Test
- From `code/backend`:
  - `npm install`
  - `npm run dev`
  - `npm run prisma:migrate` (or `npx prisma migrate dev`)
  - `npm run prisma:generate` after schema changes
- From `code/frontend`:
  - `npm install`
  - `npm run dev`
  - `npm run build`
- Local runtime expectations:
  - Backend on `3000`, frontend on `5173`, PostgreSQL on `5432`, Mosquitto on `1883`.
- Automated test suites are not fully established yet. Do not claim tests were run unless you actually run them.

## Conventions
- Validate new backend inputs with `express-validator` in route modules.
- Keep business logic in `*.service.js`; keep controllers thin.
- For protected routes, ensure JWT middleware is applied and ownership checks are preserved for user-scoped resources.
- Preserve alert deduplication behavior (do not create duplicate unresolved alerts of same type for one device).
- Treat Google OAuth and SMTP as optional integrations; code should degrade gracefully when unset.

## Common Pitfalls
- Missing required backend env vars (`DATABASE_URL`, `JWT_SECRET`) causes startup failure.
- MQTT broker offline does not block server boot but prevents ingestion; verify broker status when debugging missing readings.
- Vite relies on proxy rules in `code/frontend/vite.config.js`; do not hardcode backend origin in frontend fetch calls.
- Backend `npm run dev` includes a pre-step that clears port `3000`; avoid replacing this workflow unless necessary.

## Key Reference Files
- `README.md`
- `code/README.md`
- `code/backend/src/app.js`
- `code/backend/src/server.js`
- `code/backend/src/mqtt/mqttClient.js`
- `code/backend/prisma/schema.prisma`
- `code/frontend/src/services/api.js`
- `code/frontend/src/context/AuthContext.jsx`
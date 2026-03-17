# Changelog — G.U.A.R.D Frontend

All notable changes to the frontend are documented in this file.

---

## [1.3.0] — 2026-03-17

### Added — Historical Line Charts for Sensor Parameters

- Added a new reusable chart component at `src/components/HistoricalLineChart.jsx`
- Enhanced **Sensor History** page to render **line-chart variations with time** for each parameter in fetched results
- Charts are automatically grouped by sensor type (temperature, pH, TDS, turbidity, water level, etc.)
- Added per-chart value range summary and axis labels for faster trend interpretation
- Preserved existing history table below charts for precise row-level inspection

### Changed

- Sensor History now shows both a visual trend view (charts) and tabular view in one workflow
- Added responsive chart styling (`history-chart-*` classes) in global stylesheet

---

## [1.2.0] — 2026-03-10

### Changed — UI Cleanup

- **Removed location section** from Dashboard, Devices, and DeviceDetail pages — location data was unused and cluttered the interface

### Fixed

- **Device detail PrismaClientValidationError** — alert list API was passing `device_id` as a string instead of an integer; fixed `parseInt` conversion in backend alert controller so DeviceDetail page loads correctly

---

## [1.1.0] — 2026-03-10

### Added — Google OAuth & Sensor Types Panel

#### Login Page

- Added **Google Sign-In** button using Google Identity Services (GSI) library
- Button renders only when `VITE_GOOGLE_CLIENT_ID` is set in `.env.local`
- On success, sends the Google `credential` token to `POST /auth/google` via `authApi.googleLogin()`

#### Dashboard — Sensor Types Panel

- Added a **collapsible Sensor Types** section at the bottom of the Dashboard
- Displays all sensor types in a table (name, frequency)
- Inline form to **create new sensor types** with frequency dropdown (hourly, twice_daily, daily, weekly, realtime)

---

## [1.0.0] — 2026-03-10

### Added — Initial Frontend Release

Complete React single-page application for the G.U.A.R.D IoT aquaculture monitoring system.

#### Tech Stack

- **React 19** with Vite 7.3 dev server / bundler
- **react-router-dom 7** — client-side routing
- **socket.io-client 4** — real-time WebSocket alerts
- Vite dev proxy: `/api` → `http://localhost:3000`, `/socket.io` → WebSocket proxy

#### Authentication

- **Login page** — username or email + password form
- **Register page** — full registration form (fullName, username, password, optional email / phone / address)
- **AuthContext** — provides `login()`, `register()`, `googleLogin()`, `logout()`; auto-restores session from `localStorage` token on mount
- **PrivateRoute / PublicRoute** wrappers for protected and guest-only routes

#### Pages

| Page           | Route              | Description                                                                                               |
| -------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| Dashboard      | `/`                | Stats cards (device count, active alerts), device table (top 5), alerts table (top 5), sensor types panel |
| Devices        | `/devices`         | Full device list table with inline "Add Device" form (deviceId + name)                                    |
| Device Detail  | `/devices/:id`     | Device info, latest sensor readings grid (with units), active alerts table                                |
| Sensor History | `/sensors/history` | Filterable history table — device, sensor type, date range; pre-filters from URL params                   |
| Alerts         | `/alerts`          | Filterable alert list — device, status; resolve button for active alerts; pre-filters from URL params     |
| Profile        | `/profile`         | Read-only user profile display                                                                            |

#### API Service (`src/services/api.js`)

Centralised `request()` helper attaching JWT Bearer token from `localStorage`.

| Group           | Endpoints                                                                      |
| --------------- | ------------------------------------------------------------------------------ |
| `authApi`       | `POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `GET /auth/me` |
| `deviceApi`     | `GET /devices`, `POST /devices`, `GET /devices/:id`                            |
| `sensorTypeApi` | `GET /sensor-types`, `POST /sensor-types`, `GET /sensor-types/:id`             |
| `sensorApi`     | `GET /sensor/latest?device_id=`, `GET /sensor/history?...`                     |
| `alertApi`      | `GET /alerts?...`, `POST /alerts/resolve`                                      |

#### Real-Time Notifications

- **Socket.io** connection established on login; disconnected on logout
- **Layout component** listens for `alert` WebSocket events and displays toast notifications (top-right, auto-dismiss after 8 seconds, max 5 visible)

#### Styling

- Custom CSS with CSS variables (primary blue, danger red, success green, warning amber)
- Dark sidebar (240px) with navigation links and user info
- Top bar with page title
- Responsive layout — sidebar hides at ≤768px, stats grid adapts to 2 columns
- Auth pages use full-screen gradient background with centered card

#### Project Structure

```
code/frontend/
├── index.html              → Google GSI script + React mount point
├── vite.config.js          → Dev proxy: /api → :3000, /socket.io → WS
├── .env.local              → VITE_GOOGLE_CLIENT_ID (optional)
├── src/
│   ├── main.jsx            → React root: StrictMode → BrowserRouter → AuthProvider → App
│   ├── App.jsx             → Route definitions with PrivateRoute/PublicRoute guards
│   ├── context/
│   │   └── AuthContext.jsx → Auth state, login/register/googleLogin/logout
│   ├── components/
│   │   └── Layout.jsx      → Sidebar + top bar + toast notifications + <Outlet />
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Devices.jsx
│   │   ├── DeviceDetail.jsx
│   │   ├── SensorHistory.jsx
│   │   ├── Alerts.jsx
│   │   └── Profile.jsx
│   ├── services/
│   │   ├── api.js          → REST API helpers with Bearer token
│   │   └── socket.js       → Socket.io singleton (connect/disconnect/get)
│   └── styles/
│       └── global.css      → Full application stylesheet
└── package.json
```

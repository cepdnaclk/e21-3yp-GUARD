# Changelog — G.U.A.R.D Frontend

All notable changes to the frontend are documented in this file.

---

## [1.4.0] — 2026-04-25

### Added — Email Verification System

-   **Mandatory Verification**: All new accounts (self-registered, Admin-created, or Super Admin-created) now require email verification before they can access the dashboard.
-   **Email Service Integration**: Integrated high-priority HTML email notifications for registration and alerts.
-   **Secure Resend Flow**: The "Resend Verification" feature now requires both a **username** and an **email address**, ensuring that verification links are only sent to the registered owner of the account.

### Added — Admin & User Management

-   **Admin User Creation**: Admins can now register new Workers (Users) directly from the dashboard. These accounts are automatically linked to the Admin and receive a verification email.
-   **Super Admin Capabilities**: Super Admins can now create Admin accounts from the platform.

### Added — MQTT Alert Notifications

-   **Proactive Email Alerts**: The system now automatically emails the Tank Owner (Admin) and all assigned Workers whenever a critical aquatic alert is received via MQTT.
-   **Alert Deduplication**: Backend logic ensures only one active alert is maintained per sensor type per tank, preventing notification spam.

---

## [1.3.0] — 2026-04-21

### Changed — Navigation & Layout Refresh

- Replaced the previous sidebar-style shell with a **top navigation bar** layout (`Layout.jsx` + `layout.css`)
- Updated nav labels/order to focus on: **Dashboard, Notifications, Analytics, Devices**
- Preserved in-app real-time alert toasts with click-to-dismiss behavior

### Changed — Dashboard Redesign

- Reworked Dashboard into a **search-first tank overview**
- Added tank-style cards with live/latest sensor tiles and per-card active status dots
- Added a right-side **Recent Alerts** panel with quick link to full alerts page
- Simplified bottom summary cards for total devices and active alerts
- Removed the earlier Sensor Types panel from the dashboard flow

### Changed — Alerts Experience

- Alerts page now uses a dedicated **Notifications** presentation with refined filters/table styling
- Maintains URL-based device pre-filtering (`device_id`) and active/resolved filtering
- Keeps inline resolve action for unresolved alerts

### Changed — Profile Page

- Upgraded Profile from read-only to **editable profile form**
- Added edit/save/cancel workflow, basic required-field validation, and success/error messaging
- Added member-since display and avatar initials placeholder

### Changed — Auth Screens

- Login/Register UI updated with shared branded auth styling (`auth.css`)
- Added branded header logo treatment and card-level back button affordance
- Google Sign-In support remains environment-driven via `VITE_GOOGLE_CLIENT_ID`

### Changed — Styling Organization

- Frontend styles are now maintained as **modular page/component CSS files** under `src/styles/`
- Continued use of shared design tokens and base utility styles from `base.css`

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
│       ├── base.css        → Shared tokens, base components, and utilities
│       ├── layout.css      → Top navigation and shell layout
│       ├── auth.css        → Login/Register screens
│       ├── dashboard.css   → Dashboard page styling
│       ├── devices.css     → Devices page styling
│       ├── device-detail.css → Device detail page styling
│       ├── sensor-history.css → Sensor history page styling
│       ├── alerts.css      → Alerts/Notifications page styling
│       └── profile.css     → Profile page styling
└── package.json
```

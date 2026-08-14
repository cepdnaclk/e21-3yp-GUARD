# G.U.A.R.D — General Unit for Aquatic Risk Detection

> Smart IoT monitoring & alert system for multi-tank aquatic facilities — featuring a Tailwind CSS Glassmorphism Dual-Mode UI, role-based access control, real-time WebSocket telemetry, ultrasonic water level depth modeling (0–200 cm), interactive analytics routing, and a guided onboarding tour.

**Third Year Project — Team 08 · Department of Computer Engineering, University of Peradeniya**

| Index    | Name                |
| -------- | ------------------- |
| E/21/039 | Ravindu Ashan       |
| E/21/067 | Asindu Chandasekara |
| E/21/231 | Thisen Lakdinu      |
| E/21/362 | Shashika Sathsarani |

---

## Table of Contents

1. [What is G.U.A.R.D?](#what-is-guard)
2. [System Architecture](#system-architecture)
3. [Repository Structure](#repository-structure)
4. [Tech Stack](#tech-stack)
5. [Tailwind CSS Design System & Migration](#tailwind-css-design-system--migration)
6. [Onboarding Tour & Demo Environment](#onboarding-tour--demo-environment)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [MQTT Protocol](#mqtt-protocol)
10. [WebSocket Events](#websocket-events)
11. [Alert Rules & Thresholds](#alert-rules--thresholds)
12. [Ports & Services](#ports--services)
13. [Environment Variables](#environment-variables)
14. [Developer Helper Scripts](#developer-helper-scripts)
15. [Getting Started — Quick Start](#getting-started--quick-start)
16. [Getting Started — Backend](#getting-started--backend)
17. [Getting Started — Frontend](#getting-started--frontend)
18. [ESP32 / Firmware Integration](#esp32--firmware-integration)
19. [Docker Support](#docker-support)

---

## What is G.U.A.R.D?

G.U.A.R.D is an enterprise-grade aquaculture real-time monitoring and alerting system designed for commercial ornamental fish shops, hatcheries, and multi-tank aquatic facilities. It measures water quality parameters in real-time across tanks and delivers immediate alerts before fish health is compromised.

**Problems it solves:**

- **Manual Testing Delay:** Replaces slow, manual water testing with automated real-time telemetry.
- **24/7 Multi-Tank Surveillance:** Continuous monitoring across dozens of tanks simultaneously.
- **Alert Flooding Prevention:** Built-in in-memory throttling and database-level alert deduplication.
- **Hardware Disconnection Detection:** Real-time online/offline heartbeat indicator (40-second timeout) for individual tanks and sensors.
- **Onboarding Paradox:** First-time users are never dropped into an empty dashboard — a guided tour runs in a fully-populated demo sandbox.

**Key capabilities:**

- **Real-Time Telemetry Gauges:** Dynamic SVG arc gauges for Temperature (°C), pH, TDS (ppm), Turbidity (NTU), and Water Level (cm depth from ultrasonic sensor).
- **Ultrasonic Water Level Model:** Measures distance (0–200 cm) from top-mounted ultrasonic sensor to water surface. Features inverted Y-axis chart graphing (200 cm to 0 cm) to visually align high water level with the top of graphs.
- **Tailwind CSS Glassmorphism Dual-Mode UI:** "Milky Frost" light mode and "Obsidian Glow" dark mode with glassmorphic cards, canary yellow (`#facc15`) temperature series in dark mode, clean vector SVG graphics across all components, and theme-synced navigation controls.
- **Multi-Channel Alerts:** Real-time WebSocket alerts (`socket.io`), visual toast notifications, email delivery (SMTP), and Telegram Bot verification (`@GUARD_yp_bot`).
- **Role-Based Access Control:** `SUPER_ADMIN`, `ADMIN`, and `USER` account management with tank assignment.
- **Interactive & Route-Aware Analytics:** Sensor history visualization with direct device URL linking (`/analytics?device_id=...` & `/sensors/history`), automatic device pre-selection, date range badges (`Filtered Date Range`), and custom glass date pickers (`react-day-picker`).
- **Steady & Responsive Navigation Bar:** Persistent navigation header across public landing pages and authenticated routes with responsive flex-wrapping, pinned right-side controls, and zero layout jumps.
- **Fish Species Knowledge Base:** Comprehensive fish species library with optimal water parameter ranges (Temperature, pH, TDS, Turbidity) displayed directly on every species card and detailed drawer analysis cross-referenced against tank thresholds (`FishDetailDrawer` & `AddEditModal`).
- **Guided Onboarding Tour:** Role-aware `driver.js` tour across a `/demo` sandbox environment — separate from live data, auto-skippable, and resumable via the "Tour" button.
- **ESP32 Device Security:** Device authentication with bcrypt-hashed device secrets.

---

## System Architecture

```
                                      End-to-End IoT Architecture

┌───────────────────┐    Data (Pub)    ┌──────────────────────┐  Process Data  ┌──────────────────────────────────┐ Status / Control  ┌─────────────────────────────────┐
│   IoT Node(s)     │─────────────────▶│ MQTT Message Broker  │<─────────────>│   Central Application Server     │<─────────────────>│    User Interface (Dashboard)   │
│ (Multiple Nodes   │                  │  HiveMQ / Mosquitto  │   / Commands  │ ┌──────────────────────────────┐ │ (REST / WebSocket)│   React 19 + Vite Dashboard     │
│    Possible)      │                  │   Pub / Sub Broker   │               │ │ 📈 Data Processing           │ │                   │   Tailwind Glassmorphic UI      │
└───────────────────┘                  └──────────────────────┘               │ ├──────────────────────────────┤ │                   │        Status & Control         │
                                                                              │ │ 🚨 Alert Engine              │ │                   └─────────────────────────────────┘
                                                                              │ ├──────────────────────────────┤ │
                                                                              │ │ 🎛️ Control Logic             │ │
                                                                              │ └──────────────┬───────────────┘ │
                                                                              └────────────────┼──────────────────┘
                                                                                               │ Archive & Log
                                                                                               ▼
                                                                              ┌──────────────────────────────────┐
                                                                              │         Database Cluster         │
                                                                              │ ┌──────────────────────────────┐ │
                                                                              │ │ TimeSeries (InfluxDB style)  │ │
                                                                              │ │ → Store Data                 │ │
                                                                              │ ├──────────────────────────────┤ │
                                                                              │ │ Document (MongoDB style)     │ │
                                                                              │ │ → Store State                │ │
                                                                              │ └──────────────────────────────┘ │
                                                                              └──────────────────────────────────┘
```

**End-to-end data flow:**

1. An ESP32 reads sensors and publishes JSON telemetry to `aquamonitor/devices/<deviceUid>/data` via MQTT.
2. The backend MQTT client ingests the payload, verifies the device using `deviceUid` and `deviceSecret` (bcrypt authentication), and records telemetry.
3. State data is stored via Prisma ORM in MongoDB; time-series history is persisted in InfluxDB.
4. The Alert Engine checks configured thresholds (temperature, pH, TDS, turbidity, water level). If a threshold is breached and no unresolved alert of the same type exists for that tank, an `Alert` is generated.
5. The alert is instantly pushed to connected React clients via WebSocket (`socket.io`), email if SMTP is configured, and Telegram if linked.
6. The React frontend interacts with the backend via JWT-authenticated REST APIs for analytics, tank configuration, user management, and threshold customisation.
7. First-time users are automatically routed to the `/demo` sandbox where a `driver.js` guided tour walks them through every feature using static mock data — without touching the live backend.

---

## Repository Structure

```
e21-3yp-GUARD/
├── code/
│   ├── backend/                        ← Node.js / Express Backend
│   │   ├── src/
│   │   │   ├── controllers/            ← Request handlers per domain
│   │   │   ├── routes/                 ← Express route definitions
│   │   │   ├── services/               ← Business logic & DB queries
│   │   │   ├── middleware/
│   │   │   │   └── authMiddleware.js   ← JWT Bearer guard & role verifiers
│   │   │   ├── lib/                    ← Prisma & InfluxDB connections
│   │   │   └── index.js                ← HTTP & WebSocket server entry
│   │   ├── prisma/                     ← Prisma schema & migrations
│   │   ├── docker-compose.yml          ← MongoDB + InfluxDB containers
│   │   ├── dummy-sensor.js             ← Simulated sensor data publisher
│   │   ├── fishSeed.js                 ← Fish species data seeder
│   │   ├── seed-analytics.js           ← Analytics history seeder
│   │   ├── seed.js                     ← General DB seeder
│   │   ├── check-services.js           ← Service health checker
│   │   ├── BACKEND_DOCUMENTATION_v2.md ← Full backend API documentation
│   │   └── CHANGELOG.md               ← Backend change history
│   │
│   ├── frontend/                       ← React 19 / Vite / Tailwind CSS Frontend
│   │   ├── tailwind.config.js          ← Tailwind design tokens & dark mode config
│   │   ├── postcss.config.js           ← PostCSS configuration
│   │   └── src/
│   │       ├── App.jsx                 ← Router root with SmartRedirect
│   │       ├── main.jsx                ← Base CSS & global tour.css import
│   │       ├── components/
│   │       │   ├── Layout.jsx          ← Production glass nav (with 🗺️ Tour button)
│   │       │   ├── PublicNav.jsx       ← Public top navigation bar
│   │       │   ├── PublicLayout.jsx    ← Public page layout wrapper
│   │       │   ├── SensorGauge.jsx     ← SVG arc gauge component (Tailwind)
│   │       │   ├── WaterTankLevel.jsx  ← Water level visualiser
│   │       │   ├── ThresholdsPanel.jsx ← Dual-range threshold sliders (Tailwind)
│   │       │   ├── ActuatorPanel.jsx   ← Pump & feeder controls (Tailwind)
│   │       │   ├── DatePicker.jsx      ← Glass calendar popup
│   │       │   ├── TankTimeSeriesChart.jsx ← Tank sensor time-series chart
│   │       │   ├── admin/              ← Admin-only table & form components
│   │       │   │   ├── AddDeviceForm.jsx
│   │       │   │   ├── AdminTable.jsx
│   │       │   │   ├── AssignTankForm.jsx
│   │       │   │   ├── CreateAccountForm.jsx
│   │       │   │   ├── DeviceInventoryTable.jsx
│   │       │   │   ├── DeviceRequestsTable.jsx
│   │       │   │   └── UserTable.jsx
│   │       │   ├── auth/               ← Auth form components
│   │       │   ├── demo/
│   │       │   │   └── DemoLayout.jsx  ← Demo nav (Demo badge + Exit Demo)
│   │       │   └── tour/
│   │       │       └── TourOverlay.jsx ← driver.js tour controller
│   │       ├── context/
│   │       │   ├── AuthContext.jsx     ← Auth state & user/role
│   │       │   ├── ThemeContext.jsx    ← Light/Dark mode toggle
│   │       │   ├── DemoContext.jsx     ← Static demo data provider
│   │       │   └── TourContext.jsx     ← Tour state machine (skip/finish/reset)
│   │       ├── data/
│   │       │   └── demoData.json       ← Static mock payload for /demo
│   │       ├── hooks/
│   │       │   ├── useTourSteps.js     ← Role-aware step builder (7 / 11 steps)
│   │       │   └── useOnlineStatus.js  ← Device online/offline status hook
│   │       ├── constants/
│   │       │   └── sensorConstants.js  ← Sensor parameter limits & defaults
│   │       ├── utils/
│   │       │   ├── formatUtils.js      ← Date/value formatting helpers
│   │       │   └── animations.jsx      ← Reusable animation utilities
│   │       ├── pages/
│   │       │   ├── Dashboard.jsx       ← Multi-tank monitoring & live gauges
│   │       │   ├── Devices.jsx         ← Device inventory & registration
│   │       │   ├── DeviceDetail.jsx    ← Per-tank detail & threshold config
│   │       │   ├── SensorHistory.jsx   ← Recharts time-series analytics
│   │       │   ├── Alerts.jsx          ← Alert queue & resolution
│   │       │   ├── FishInfo.jsx        ← Fish species library & compatibility drawer
│   │       │   ├── Users.jsx           ← Admin user & tank assignment
│   │       │   ├── Profile.jsx         ← Profile details, OTP & Telegram verification
│   │       │   ├── Login.jsx           ← Login page
│   │       │   ├── Register.jsx        ← Registration page
│   │       │   ├── VerifyEmail.jsx     ← Email verification gate
│   │       │   ├── MobileAppDownload.jsx ← Mobile app download page (/mobile-download)
│   │       │   ├── DemoPage.jsx        ← /demo route shell & tour bootstrap
│   │       │   ├── Landing/            ← Landing.jsx & About.jsx (Tailwind)
│   │       │   └── demo/               ← Demo page wrappers (Tailwind)
│   │       │       ├── DashboardDemo.jsx
│   │       │       ├── DevicesDemo.jsx
│   │       │       ├── SensorHistoryDemo.jsx
│   │       │       ├── AlertsDemo.jsx
│   │       │       ├── FishInfoDemo.jsx
│   │       │       ├── UsersDemo.jsx
│   │       │       └── ProfileDemo.jsx
│   │       ├── services/
│   │       │   ├── api.js              ← Axios REST client
│   │       │   └── socket.js           ← socket.io client
│   │       └── styles/
│   │           ├── base.css            ← Tailwind directives (@tailwind) & bridge classes
│   │           ├── tour.css            ← driver.js popover & tour-active styles
│   │           └── [legacy CSS]        ← Retained CSS files alongside Tailwind
│   │
│   ├── mobile_app/                     ← React Native / Expo Mobile App
│   │   ├── App.js                      ← Expo root
│   │   ├── app.json                    ← Expo config
│   │   └── src/                        ← Mobile screens & components
│   │
│   ├── mqtt server/                    ← Standalone MQTT broker configuration
│   │
│   └── Esp32/                          ← ESP32 firmware source
│       └── Sensor_unit/                ← Active firmware sketch
│
├── docs/                               ← GitHub Pages documentation site
├── start_all.ps1 / start_all.bat       ← Full-stack start helpers
├── kill_all.ps1 / kill_all.bat         ← Service shutdown helpers
└── README.md
```


---

## Tech Stack

### Backend

| Layer          | Technology              | Purpose                              |
| -------------- | ----------------------- | ------------------------------------ |
| Runtime        | Node.js 22 LTS          | Server-side JavaScript runtime       |
| Framework      | Express 4.x             | REST API framework                   |
| ORM            | Prisma 6.x              | MongoDB object-relational mapping    |
| State DB       | MongoDB 7+              | Application state & metadata         |
| Time-Series DB | InfluxDB 2.x            | High-frequency telemetry history     |
| MQTT Client    | MQTT.js 5.x             | Hardware message ingestion           |
| MQTT Broker    | HiveMQ Cloud / Mosquitto| Distributed MQTT messaging           |
| Real-time WS   | socket.io 4.x           | Real-time WebSocket push             |
| Security       | bcrypt + JWT            | Password hashing & authentication    |

### Frontend

| Layer               | Technology             | Purpose                                   |
| ------------------- | ---------------------- | ----------------------------------------- |
| Framework           | React 19               | Component-driven UI framework             |
| Build Tool          | Vite 7.x               | Lightning-fast HMR & bundler              |
| Styling             | Tailwind CSS v3.4      | Utility-first design system & glassmorphic UI |
| Routing             | React Router v6        | Client-side route management              |
| Telemetry Charts    | Recharts 2.x           | Interactive time-series data graphing     |
| Date Selector       | react-day-picker 10.x  | Custom glass-styled calendar picker       |
| Real-time Socket    | socket.io-client 4.x   | Real-time telemetry & alert listener      |
| HTTP Client         | Axios                  | REST API communication                    |
| Onboarding Tour     | driver.js 1.x          | Step-by-step guided tour overlay          |

### Firmware (ESP32)

| Library                      | Purpose                             |
| ---------------------------- | ----------------------------------- |
| WiFi.h                       | Wi-Fi connectivity                  |
| PubSubClient                 | MQTT telemetry publishing           |
| ArduinoJson                  | JSON payload serialisation          |
| OneWire + DallasTemperature  | DS18B20 temperature sensor          |

---

### 1. Color Palette & Design Tokens
For the full design system reference, color hex codes, surface glass layering rules, and component file mappings, see the dedicated [**Frontend Color Palette Guide**](code/frontend/COLOR_PALETTE.md).

### 2. Configuration (`tailwind.config.js`)
- **Dark Mode Selector:** `darkMode: ['selector', '[data-theme="dark"]']` to sync with `ThemeContext`.
- **Typography:** `Outfit` for body & headlines; `JetBrains Mono` (`font-mono`) for numerical telemetry gauges and timestamps.
- **Glassmorphism Standard Card Formula:**
  ```html
  <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl">
  ```

### 2. Upgraded Glassmorphism Navigation (`Layout.jsx`)
- Responsive frosted glass top navigation featuring light/dark mode glassmorphism (`bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.05)]`).
- Vibrant gradient logo branding (`bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_4px_14px_rgba(14,165,233,0.35)]`), active link pill styling, and dark-mode toggle switch.

### 3. Compact Header Stat Cards & Streamlined Page Layouts
- **Dashboard Stat Cards (`Dashboard.jsx` & `DashboardDemo.jsx`):** Compact "Total Devices" and "Active Alerts" glass cards moved inline to the top header row next to the search bar for optimal space efficiency.
- **Streamlined Page Headers:** Redundant page title headers removed across all views (retaining only **My Profile**), maximizing vertical screen real estate for tank telemetry and data grids.
- **Telegram Verification QR Code (`Profile.jsx`):** Instant QR code scanning support (`https://t.me/GUARD_yp_bot`) for mobile Telegram phone verification.

### 4. Migrated Components & Pages
- **Components:** `SensorGauge.jsx`, `WaterTankLevel.jsx`, `ThresholdsPanel.jsx`, `ActuatorPanel.jsx`, `DatePicker.jsx`, `TankTimeSeriesChart.jsx`, `PublicLayout.jsx`.
- **Production Pages:** `Dashboard.jsx`, `Alerts.jsx`, `Devices.jsx`, `DeviceDetail.jsx`, `SensorHistory.jsx`, `Users.jsx`, `Profile.jsx`, `FishInfo.jsx`, `MobileAppDownload.jsx`, `Landing.jsx`, `About.jsx`.
- **Demo Sandbox Pages:** `DashboardDemo.jsx`, `AlertsDemo.jsx`, `DevicesDemo.jsx`, `UsersDemo.jsx`, `SensorHistoryDemo.jsx`, `FishInfoDemo.jsx`, `ProfileDemo.jsx`.
- **Admin Sub-components (`src/components/admin/`):** `AddDeviceForm.jsx`, `AdminTable.jsx`, `AssignTankForm.jsx`, `CreateAccountForm.jsx`, `DeviceInventoryTable.jsx`, `DeviceRequestsTable.jsx`, `UserTable.jsx`.
- **Tour Sub-components (`src/components/tour/`):** `TourOverlay.jsx`.

### 5. Legacy Stylesheets
The following CSS files are retained alongside Tailwind for compatibility:
`layout.css`, `actuators.css`, `thresholds.css`, `datepicker.css`, `dashboard.css`, `device-detail.css`, `alerts.css`, `devices.css`, `sensor-history.css`, `users.css`, `CreateAccountForm.css`, `profile.css`, `fish-info.css`, `landing.css`, `about.css`, `navigation.css`, `mobile-app-download.css`, `variables.css`, `water-tank.css`.

---

## Onboarding Tour & Demo Environment

G.U.A.R.D ships with a guided onboarding tour that runs inside a fully-isolated `/demo` sandbox. New users are **never shown an empty dashboard** — they are automatically routed to `/demo` on first login and can experience every feature before a single real tank is connected.

### How it works

```
User logs in for the first time
        │
        ▼ SmartRedirect checks localStorage key
        │   guard_tour_<userId> === 'true' ?
        │
  No ───┴──▶  /demo  ──▶  DemoPage bootstraps
                │          with static demoData.json
                │
                ▼  TourProvider + DemoProvider mount
                │
                ▼  TourOverlay creates driver.js instance
                │
                ├──▶ Step 1  Dashboard → #tank-grid
                ├──▶ Step 2  Dashboard → #dash-stats
                ├──▶ Step 3  Alerts    → #alerts-table-card
                ├──▶ Step 4  Analytics → #analytics-card
                ├──▶ Step 5  Fish Info → #fish-grid
                ├──▶ Step 6  Profile   → #profile-card
                ├──▶ Step 7  Profile   → #tour-theme-toggle
                │            (Admin only ↓)
                ├──▶ Step 8  Devices → #add-device-btn
                ├──▶ Step 9  Users   → #add-user-btn
                ├──▶ Step 10 Users   → #user-table
                └──▶ Step 11 Devices → #devices-table
                             │
                             ▼  Finish / Skip
                             │  localStorage guard_tour_<userId> = 'true'
                             ▼
                         /dashboard  (live app)
```

### Tour components

| File | Role |
| ---- | ---- |
| `src/pages/DemoPage.jsx` | Entry point for `/demo/*` — wraps `TourProvider` + `DemoProvider`, bootstraps the tour |
| `src/context/TourContext.jsx` | State machine: `isTourActive`, `startTour`, `skipTour`, `finishTour`, `updateStep` |
| `src/context/DemoContext.jsx` | Provides static `demoData.json` to all demo pages via React Context |
| `src/hooks/useTourSteps.js` | Builds role-aware step arrays: 7 steps (USER) or 11 steps (ADMIN) |
| `src/components/tour/TourOverlay.jsx` | Mounts `driver.js`, handles route navigation, instant center auto-scrolling, and step control |
| `src/components/demo/DemoLayout.jsx` | Demo nav: Demo badge, nav IDs, `id="tour-theme-toggle"`, tour-active class sync |
| `src/data/demoData.json` | Static payload: 3 tanks, 5 sensor readings each, 3 alerts, 3 workers, 3 fish species, sensor history |
| `src/styles/tour.css` | Glassmorphism driver.js popover styles, navbar elevation, and smooth stage transitions |
| [`COLOR_PALETTE.md`](code/frontend/COLOR_PALETTE.md) | Dedicated reference guide for frontend color tokens, light/dark modes, and component mappings |

### Key tour UX details

- **Explicit Close Protection:** Backdrop click exit is disabled (`allowClose: false`). The tour can only be closed explicitly by clicking **Skip** / **✕** or completing all steps and clicking **Finish 🎉**.
- **Card-Level Precision:** Highlights specific component cards (`#alerts-table-card`, `#analytics-card`, `#fish-grid`, `#profile-card`) rather than full page wrappers.
- **Bi-Directional Navigation:** URL route verification (`window.location.pathname !== step.route`) ensures smooth backward (`← Back`) and forward (`Next →`) navigation across all 11 steps.
- **Instant Center Auto-Scroll:** Centers target elements in the viewport (`block: 'center'`) before stage highlight calculations, preventing positioning jitter.
- **Preserved App Navbar:** Standard glassmorphism top navigation bar styling is preserved intact during the tour.
- **Role-aware:** `buildTourSteps(role)` returns 7 common steps for `USER` accounts and appends 4 admin-only steps for `ADMIN` accounts.

---

## Database Schema

Prisma models connecting to MongoDB.

### Entity Relationship

```
User (1) ──── (N) Device  (Owner / Assigned Worker)
Device (1) ── (N) SensorReading
Device (1) ── (N) Alert
Fish (N) ──── standalone species knowledge base
```

---

## API Reference

Base URL: `http://localhost:5000/api`

All endpoints except `POST /api/auth/login` and `POST /api/auth/register` require:

```
Authorization: Bearer <jwt>
```

### Authentication (`/api/auth`)

| Method | Path                          | Auth | Description                          |
| ------ | ----------------------------- | ---- | ------------------------------------ |
| POST   | `/api/auth/login`             | —    | Login with username & password       |
| POST   | `/api/auth/register`          | —    | Register a new ADMIN account         |
| GET    | `/api/auth/me`                | ✅   | Get current user profile             |
| PUT    | `/api/auth/me`                | ✅   | Update profile (name, phone, address)|
| POST   | `/api/auth/verify-email`      | —    | Verify email with OTP token          |
| POST   | `/api/auth/change-password`   | ✅   | Change authenticated user's password |

### Tanks / Devices (`/api/tanks`)

| Method | Path                              | Auth | Description                          |
| ------ | --------------------------------- | ---- | ------------------------------------ |
| GET    | `/api/tanks`                      | ✅   | List tanks visible to the user       |
| POST   | `/api/tanks/register`             | ✅   | Register a new tank (ADMIN only)     |
| GET    | `/api/tanks/:tankId/status`       | ✅   | Get tank details & latest readings   |
| DELETE | `/api/tanks/:tankId`              | ✅   | Remove a tank (ADMIN / SUPER_ADMIN)  |
| POST   | `/api/tanks/:tankId/assign-user`  | ✅   | Assign a worker to a tank (ADMIN)    |
| POST   | `/api/tanks/:tankId/unassign-user`| ✅   | Remove worker from a tank (ADMIN)    |
| GET    | `/api/tanks/:tankId/thresholds`   | ✅   | Get threshold config for a tank      |
| PATCH  | `/api/tanks/:tankId/thresholds`   | ✅   | Update thresholds for a tank (ADMIN) |
| POST   | `/api/tanks/:tankId/actuators`    | ✅   | Send actuator command (pump/feeder)  |

### Sensor Telemetry (`/api/sensors`)

| Method | Path                    | Auth | Description                       |
| ------ | ----------------------- | ---- | --------------------------------- |
| GET    | `/api/sensors/latest`   | ✅   | Latest reading per sensor type    |
| GET    | `/api/sensors/history`  | ✅   | Historical readings (date filter) |

### Alerts (`/api/alerts`)

| Method | Path                         | Auth | Description                      |
| ------ | ---------------------------- | ---- | -------------------------------- |
| GET    | `/api/alerts`                | ✅   | List active / resolved alerts    |
| POST   | `/api/alerts/:id/resolve`    | ✅   | Mark an alert as resolved        |

### Users (`/api/auth`) — ADMIN / SUPER_ADMIN only

| Method | Path                           | Auth | Description                      |
| ------ | ------------------------------ | ---- | -------------------------------- |
| GET    | `/api/auth/users`              | ✅   | List all user accounts           |
| POST   | `/api/auth/users`              | ✅   | Create a new USER account        |
| DELETE | `/api/auth/users/:id`          | ✅   | Delete a user account            |

### Fish Species (`/api/fish`)

| Method | Path             | Auth | Description                     |
| ------ | ---------------- | ---- | ------------------------------- |
| GET    | `/api/fish`      | ✅   | List all fish species           |
| POST   | `/api/fish`      | ✅   | Add a new species (ADMIN)       |
| PUT    | `/api/fish/:id`  | ✅   | Update species parameters       |
| DELETE | `/api/fish/:id`  | ✅   | Remove a species (ADMIN)        |

### Device Requests (`/api/device-requests`)

| Method | Path                      | Auth | Description                          |
| ------ | ------------------------- | ---- | ------------------------------------ |
| GET    | `/api/device-requests`    | ✅   | List pending device join requests    |
| POST   | `/api/device-requests`    | ✅   | Submit a new device join request     |

#### Fish Species Catalog & Parameter Ranges

The G.U.A.R.D library contains **20 research-verified freshwater fish species** tailored to tropical aquariums and Sri Lankan aquaculture ponds. Each species includes verified ranges for Temperature (°C), pH, TDS (ppm), and Turbidity (NTU):

- **Nile Tilapia** (*Oreochromis niloticus*): pH 6.0–9.0, Temp 20–35°C, TDS 100–2000 ppm, Turbidity ≤100 NTU
- **Koi Carp** (*Cyprinus rubrofuscus*): pH 6.8–8.2, Temp 15–25°C, TDS 100–1000 ppm, Turbidity ≤40 NTU
- **Common Carp** (*Cyprinus carpio*): pH 6.5–8.5, Temp 18–28°C, TDS 100–500 ppm, Turbidity ≤25 NTU
- **Walking Catfish** (*Clarias batrachus*): pH 6.5–8.0, Temp 22–30°C, TDS 80–450 ppm, Turbidity ≤30 NTU
- **Dwarf Gourami** (*Trichogaster lalius*): pH 6.0–7.5, Temp 22–28°C, TDS 50–300 ppm, Turbidity ≤10 NTU
- **Giant Gourami** (*Osphronemus goramy*): pH 6.5–7.8, Temp 24–30°C, TDS 100–500 ppm, Turbidity ≤15 NTU
- **Silver Arowana** (*Osteoglossum bicirrhosum*): pH 6.0–7.2, Temp 24–30°C, TDS 50–300 ppm, Turbidity ≤8 NTU
- **Tiger Barb** (*Puntigrus tetrazona*): pH 6.0–7.5, Temp 22–26°C, TDS 50–350 ppm, Turbidity ≤12 NTU
- **Rainbow Shark** (*Epalzeorhynchos frenatum*): pH 6.5–7.8, Temp 24–28°C, TDS 100–400 ppm, Turbidity ≤10 NTU
- **Oscar Fish** (*Astronotus ocellatus*): pH 6.5–7.5, Temp 23–28°C, TDS 100–450 ppm, Turbidity ≤12 NTU
- *Plus Guppy, Betta, Molly, Platy, Neon Tetra, Goldfish, Angelfish, Discus, Corydoras Catfish, Zebra Danio.*

#### Local Generated Image Asset System

- **Zero Web Dependencies:** High-resolution generated PNG species images are stored locally in `code/frontend/src/assets/fish/` and `code/backend/uploads/fish/`.
- **Hybrid Asset Resolution:** `getImageUrl()` maps database image paths (`/uploads/fish/*.png`) directly to bundled local assets for instantaneous offline rendering in both live (`/fish`) and demo (`/demo/fish`) modes.

---

## MQTT Protocol

### Topic Format

```
aquamonitor/devices/<deviceUid>/data
```

### Telemetry Payload Example (JSON)

```json
{
  "device_id": "GUARD-D01",
  "device_secret": "my_secure_secret_123",
  "ph": 7.2,
  "temperature": 28.4,
  "tds": 430,
  "turbidity": 12,
  "water_level": 82
}
```

---

## WebSocket Events

Connect to the backend socket:

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:5000");

socket.on("sensor_data", (data) => {
  // Live gauge update — fires every telemetry cycle per device
});

socket.on("alert", (alertData) => {
  // New threshold breach alert
});
```

---

## Alert Rules & Thresholds

Thresholds are **per-device** and configurable from the Devices → Details panel. Default system values:

> **Water Level Note:** Water level is measured as distance (0–200 cm) from the top-mounted ultrasonic sensor to the water surface. A smaller distance represents a higher water level. Therefore, `WATER_LEVEL_LOW` triggers when measured distance exceeds the maximum allowed distance threshold.

| Alert Type        | Condition                               | Default Threshold |
| ----------------- | --------------------------------------- | ----------------- |
| `TEMP_HIGH`       | `temperature > TEMP_MAX`                | **32 °C**         |
| `TEMP_LOW`        | `temperature < TEMP_MIN`                | **20 °C**         |
| `PH_HIGH`         | `ph > PH_MAX`                           | **8.5**           |
| `PH_LOW`          | `ph < PH_MIN`                           | **6.5**           |
| `TDS_HIGH`        | `tds > TDS_MAX`                         | **800 ppm**       |
| `TURBIDITY_HIGH`  | `turbidity > TURBIDITY_MAX`             | **50 NTU**        |
| `WATER_LEVEL_LOW` | `water_level > WATER_LEVEL_MAX_DIST`   | **80 cm (distance)**|

---

## Ports & Services

| Service             | Port         | Protocol       | Description                       |
| ------------------- | ------------ | -------------- | --------------------------------- |
| Backend REST API    | **5000**     | HTTP           | Express API server                |
| Backend WebSocket   | **5000**     | WS             | socket.io real-time alert stream  |
| Frontend Dev Server | **5173**     | HTTP           | Vite React app                    |
| MongoDB             | **27017**    | TCP            | Primary MongoDB database          |
| InfluxDB            | **8086**     | HTTP           | Telemetry time-series database    |
| MQTT Broker         | **1883/8883**| MQTT / MQTTS   | HiveMQ Cloud / Mosquitto          |

---

## Environment Variables

Copy `code/backend/.env.example` → `code/backend/.env` and fill in your values:

```env
# ─── Server ──────────────────────────────────────────────────────────────────
PORT=5000

# ─── MongoDB (Prisma) ────────────────────────────────────────────────────────
DATABASE_URL=mongodb://localhost:27017/iot_db

# ─── JWT ─────────────────────────────────────────────────────────────────────
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=1d

# ─── Google OAuth ────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id

# ─── CORS ────────────────────────────────────────────────────────────────────
CORS_ORIGIN=http://localhost:5173

# ─── Frontend URL (for email verification links) ─────────────────────────────
FRONTEND_URL=http://localhost:5173

# ─── MQTT Broker ─────────────────────────────────────────────────────────────
MQTT_BROKER_URL=mqtts://your-cluster.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=your-mqtt-username
MQTT_PASSWORD=your-mqtt-password

# ─── InfluxDB ────────────────────────────────────────────────────────────────
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your_influxdb_token
INFLUX_ORG=G.U.A.R.D
INFLUX_BUCKET=guard_sensors

# ─── Email (SMTP) ────────────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password

# ─── Super Admin (Initial Setup) ─────────────────────────────────────────────
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_USERNAME=super_admin
SUPER_ADMIN_PASSWORD=your_secure_password
SUPER_ADMIN_FULLNAME=System Super Admin

# ─── Telegram Bot ────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

Configure `code/frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## Developer Helper Scripts

Root scripts and helper commands to manage full-stack services and documentation:

| Script / Command | Command | Purpose |
| :--- | :--- | :--- |
| **Start All** | `./start_all.ps1` or `start_all.bat` | Starts Backend (port 5000) and Frontend (port 5173) |
| **Kill All** | `./kill_all.ps1` or `kill_all.bat` | Terminates all Node.js background processes and frees ports |
| **Docs Preview** | `npx -y live-server docs` | Serves the GitHub Pages documentation site locally with live reload |

---

## Getting Started — Quick Start

### 1. Clone the repository

```powershell
git clone https://github.com/cepdnaclk/e21-3yp-GUARD.git
cd e21-3yp-GUARD
```

### 2. Configure environment files

- Copy `code/backend/.env.example` → `code/backend/.env`
- Copy `code/frontend/.env.local.example` → `code/frontend/.env.local`

### 3. Launch all services

```powershell
./start_all.ps1
```

### 4. Access the application

| Interface | URL |
| --- | --- |
| Frontend App | `http://localhost:5173` |
| Backend Health | `http://localhost:5000/health` |
| Demo / Tour | `http://localhost:5173/demo` |

> **First login?** You will be automatically redirected to `/demo` where the guided onboarding tour starts. Complete or skip it to enter your live dashboard.

### 5. Stop all services

```powershell
./kill_all.ps1
```

---

## Getting Started — Backend

```powershell
cd code/backend
npm install
npx prisma generate
npm run dev
```

---

## Getting Started — Frontend

```powershell
cd code/frontend
npm install
npm run dev
```

---

## Documentation Site (GitHub Pages)

To serve and preview the GitHub Pages documentation site locally with live reloading:

```powershell
npx -y live-server docs
```

Or using absolute path:

```powershell
npx -y live-server "c:\Users\ravin\Documents\Projects\e21-3yp-GUARD\docs"
```

---

## Documentation & Project Manuals

Direct links to project documentation and user manuals:

- 🌐 **Project Page**: [https://projects.ce.pdn.ac.lk/3yp/e21/GUARD/](https://projects.ce.pdn.ac.lk/3yp/e21/GUARD/)
- 📘 **User Manual (Hardware)**: [Direct Download Link](https://drive.google.com/uc?export=download&id=1JOS3uGWiJEPekHrz9HF-d42750VWIrLt)
- 📗 **User Manual (Software)**: [Direct Download Link](https://drive.google.com/uc?export=download&id=1pJbCoCFuLEz7tZp47iNzlGxMiktU6Fu-)
- ⚡ **Quick Start Guide**: [Direct Download Link](https://drive.google.com/uc?export=download&id=1pJbCoCFuLEz7tZp47iNzlGxMiktU6Fu-)

---

## ESP32 / Firmware Integration

Each G.U.A.R.D hardware node is an ESP32 microcontroller fitted with:

| Sensor | Parameter | Interface |
| --- | --- | --- |
| DS18B20 | Temperature (°C) | OneWire |
| pH Probe + Amplifier | pH (0–14) | Analog |
| TDS Probe | TDS (ppm) | Analog |
| Turbidity Sensor | Turbidity (NTU) | Analog |
| JSN-SR04T / HC-SR04 Ultrasonic | Water Level (0–200 cm distance) | Digital / Trigger-Echo |

The firmware publishes a JSON payload to `aquamonitor/devices/<deviceUid>/data` every configurable interval (default 30 s). The backend verifies `device_secret` using bcrypt before recording telemetry.

---

## Docker Support

A `docker-compose.yml` is provided in `code/backend/` for running MongoDB and InfluxDB in containers:

```powershell
cd code/backend
docker-compose up -d
```

This starts:
- **MongoDB** on port `27017`
- **InfluxDB** on port `8086`

---

## License

This project is part of the 3rd Year Software Engineering Project at the Department of Computer Engineering, Faculty of Engineering, University of Peradeniya. All rights reserved.

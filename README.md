# G.U.A.R.D — General Unit for Aquatic Risk Detection

> Smart IoT monitoring & alert system for multi-tank aquatic facilities — featuring a Tailwind CSS Glassmorphism Dual-Mode UI, role-based access control, real-time WebSocket telemetry, and a guided onboarding tour.

**Third Year Project — Team 08 · Department of Computer Engineering, University of Peradeniya**

| Index    | Name     |
| -------- | -------- |
| E/21/036 | Ashan    |
| E/21/067 | Asindu   |
| E/21/231 | Thisen   |
| E/21/362 | Shashika |

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
- **Hardware Disconnection Detection:** Real-time health check for individual sensors (Temp, pH, TDS, Turbidity, Water Level).
- **Onboarding Paradox:** First-time users are never dropped into an empty dashboard — a guided tour runs in a fully-populated demo sandbox.

**Key capabilities:**

- **Real-Time Telemetry Gauges:** Dynamic SVG arc gauges for Temperature (°C), pH, TDS (ppm), Turbidity (NTU), and Water Level (%).
- **Tailwind CSS Glassmorphism Dual-Mode UI:** "Milky Frost" light mode and "Obsidian Glow" dark mode with glassmorphic cards (`bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl`).
- **Multi-Channel Alerts:** Real-time WebSocket alerts (`socket.io`), visual toast notifications, email delivery (SMTP), and Telegram Bot verification (`@GUARD_yp_bot`).
- **Role-Based Access Control:** `SUPER_ADMIN`, `ADMIN`, and `USER` account management with tank assignment.
- **Interactive Analytics:** Sensor history visualization powered by Recharts with a custom glass date picker (`react-day-picker`).
- **Fish Species Knowledge Base:** Comprehensive fish species library with optimal water parameter ranges cross-referenced against tank thresholds (`FishDetailDrawer` & `AddEditModal`).
- **Guided Onboarding Tour:** Role-aware `driver.js` tour across a `/demo` sandbox environment — separate from live data, auto-skippable, and resumable via the "🗺️ Tour" button.
- **ESP32 Device Security:** Device authentication with bcrypt-hashed device secrets.

---

## System Architecture

```
                                ┌──────────────────────────────────────┐
  ESP32 Devices                 │          G.U.A.R.D Backend           │
  (per tank)                    │        Node.js / Express             │
  ┌──────────┐  MQTT publish    │                                      │
  │ Tank 1   │─────────────────▶│  ┌───────────┐  ┌───────────────┐  │
  └──────────┘                  │  │MQTT Client│  │  REST API     │  │
  ┌──────────┐                  │  └─────┬─────┘  └───────┬───────┘  │
  │ Tank 2   │─────────────────▶│        │                │           │
  └──────────┘  topic:          │        ▼                ▼           │
  ┌──────────┐  aquamonitor/    │  ┌──────────────────────────────┐   │
  │ Tank N   │─────────────────▶│  │        Prisma ORM            │   │
  └──────────┘  devices/<uid>   │  └──────────────┬───────────────┘   │
                /data           │                 │                    │
                                │      ┌──────────▼─────────┐        │
┌────────────────┐              │      │     MongoDB         │        │
│  HiveMQ Cloud  │              │      │   port 27017        │        │
│  / Mosquitto   │              │      └────────────────────┘        │
│  port 1883/8883│              │  ┌─────────────────────────────┐   │
└────────────────┘              │  │  InfluxDB (Time-Series)     │   │
                                │  │   port 8086                 │   │
                                │  └─────────────────────────────┘   │
                                │  ┌──────────────────────────────┐  │
                                │  │  Alert Engine (rule-based)   │  │
                                │  └──────────┬───────────────────┘  │
                                └─────────────┼──────────────────────┘
                                              │ WebSocket (socket.io)
                                              │ REST API (JWT-protected)
                                              ▼
                                ┌─────────────────────────────────┐
                                │      React Dashboard UI         │
                                │  Tailwind CSS Glassmorphism     │
                                │  port 5173 (Vite dev)           │
                                │                                  │
                                │  ┌──────────────────────────┐   │
                                │  │  /demo  Onboarding Tour  │   │
                                │  │  (driver.js + demoData)  │   │
                                │  └──────────────────────────┘   │
                                └─────────────────────────────────┘
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
│   │   └── src/
│   │       ├── controllers/            ← Request handlers per domain
│   │       ├── routes/                 ← Express route definitions
│   │       ├── services/               ← Business logic & DB queries
│   │       ├── middleware/
│   │       │   └── authMiddleware.js   ← JWT Bearer guard & role verifiers
│   │       ├── lib/                    ← Prisma & InfluxDB connections
│   │       └── index.js                ← HTTP & WebSocket server entry
│   │
│   └── frontend/                       ← React 19 / Vite / Tailwind CSS Frontend
│       ├── tailwind.config.js          ← Tailwind design tokens & dark mode config
│       ├── postcss.config.js           ← PostCSS configuration
│       └── src/
│           ├── App.jsx                 ← Router root with SmartRedirect
│           ├── main.jsx                ← Base CSS & global tour.css import
│           ├── components/
│           │   ├── Layout.jsx          ← Production glass nav (with 🗺️ Tour button)
│           │   ├── PublicNav.jsx       ← Public top navigation bar
│           │   ├── SensorGauge.jsx     ← SVG arc gauge component (Tailwind)
│           │   ├── WaterTankLevel.jsx  ← Water level visualiser
│           │   ├── ThresholdsPanel.jsx ← Dual-range threshold sliders (Tailwind)
│           │   ├── ActuatorPanel.jsx   ← Pump & feeder controls (Tailwind)
│           │   ├── DatePicker.jsx      ← Glass calendar popup
│           │   ├── admin/              ← Admin-only table & form components
│           │   ├── auth/               ← Auth form components
│           │   ├── demo/
│           │   │   └── DemoLayout.jsx  ← Demo nav (Demo badge + Exit Demo)
│           │   └── tour/
│           │       └── TourOverlay.jsx ← driver.js tour controller
│           ├── context/
│           │   ├── AuthContext.jsx     ← Auth state & user/role
│           │   ├── ThemeContext.jsx    ← Light/Dark mode toggle
│           │   ├── DemoContext.jsx     ← Static demo data provider
│           │   └── TourContext.jsx     ← Tour state machine (skip/finish/reset)
│           ├── data/
│           │   └── demoData.json       ← Static mock payload for /demo
│           ├── hooks/
│           │   └── useTourSteps.js     ← Role-aware step builder (7 / 11 steps)
│           ├── pages/
│           │   ├── Dashboard.jsx       ← Multi-tank monitoring & live gauges
│           │   ├── Devices.jsx         ← Device inventory & registration
│           │   ├── DeviceDetail.jsx    ← Per-tank detail & threshold config
│           │   ├── SensorHistory.jsx   ← Recharts time-series analytics
│           │   ├── Alerts.jsx          ← Alert queue & resolution
│           │   ├── FishInfo.jsx        ← Fish species library & compatibility drawer
│           │   ├── Users.jsx           ← Admin user & tank assignment
│           │   ├── Profile.jsx         ← Profile details, OTP & Telegram verification
│           │   ├── Login.jsx           ← Login page
│           │   ├── Register.jsx        ← Registration page
│           │   ├── VerifyEmail.jsx     ← Email verification gate
│           │   ├── DemoPage.jsx        ← /demo route shell & tour bootstrap
│           │   ├── Landing/            ← Landing.jsx & About.jsx (Tailwind)
│           │   └── demo/               ← Demo page wrappers (Tailwind)
│           │       ├── DashboardDemo.jsx
│           │       ├── DevicesDemo.jsx
│           │       ├── SensorHistoryDemo.jsx
│           │       ├── AlertsDemo.jsx
│           │       ├── FishInfoDemo.jsx
│           │       ├── UsersDemo.jsx
│           │       └── ProfileDemo.jsx
│           ├── services/
│           │   ├── api.js              ← Axios REST client
│           │   └── socket.js           ← socket.io client
│           └── styles/
│               ├── base.css            ← Tailwind directives (@tailwind) & bridge classes
│               ├── tour.css            ← driver.js popover & tour-active styles
│               └── [deprecated CSS]    ← Legacy CSS files deprecated in favor of Tailwind
├── docs/
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

## Tailwind CSS Design System & Migration

The frontend application has been migrated from legacy CSS stylesheets to **Tailwind CSS** using a strict Strangler Fig pattern.

### 1. Configuration (`tailwind.config.js`)
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
- **Components:** `SensorGauge.jsx`, `WaterTankLevel.jsx`, `ThresholdsPanel.jsx`, `ActuatorPanel.jsx`, `DatePicker.jsx`.
- **Production Pages:** `Dashboard.jsx`, `Alerts.jsx`, `Devices.jsx`, `DeviceDetail.jsx`, `SensorHistory.jsx`, `Users.jsx`, `Profile.jsx`, `FishInfo.jsx`, `Landing.jsx`, `About.jsx`.
- **Demo Sandbox Pages:** `DashboardDemo.jsx`, `AlertsDemo.jsx`, `DevicesDemo.jsx`, `UsersDemo.jsx`, `SensorHistoryDemo.jsx`, `FishInfoDemo.jsx`, `ProfileDemo.jsx`.
- **Admin Sub-components:** `CreateAccountForm.jsx`, `AddDeviceForm.jsx`, `TourOverlay.jsx`.

### 5. Deprecated Stylesheets
The following legacy CSS files have been deprecated and wrapped in block comments:
`layout.css`, `actuators.css`, `thresholds.css`, `datepicker.css`, `dashboard.css`, `device-detail.css`, `alerts.css`, `devices.css`, `sensor-history.css`, `users.css`, `CreateAccountForm.css`, `profile.css`, `fish-info.css`, `landing.css`, `about.css`, `navigation.css`.

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
                ├──▶ Step 3  Alerts    → #alerts-page
                ├──▶ Step 4  Analytics → #analytics-page
                ├──▶ Step 5  Fish Info → #fish-page
                ├──▶ Step 6  Profile   → #profile-page
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
| `src/components/tour/TourOverlay.jsx` | Mounts `driver.js`, navigates routes per step, polls DOM with `MutationObserver` |
| `src/components/demo/DemoLayout.jsx` | Demo nav: Demo badge, nav IDs, `id="tour-theme-toggle"`, tour-active class sync |
| `src/data/demoData.json` | Static payload: 3 tanks, 5 sensor readings each, 3 alerts, 3 workers, 3 fish species, sensor history |
| `src/styles/tour.css` | Glassmorphism driver.js popover styles, `html.tour-active` nav elevation, nav-link pulse |

### Key tour UX details

- **Nav highlighting:** When the tour runs, `html.tour-active` is added to `<html>`. This elevates the sticky topnav (`z-index: 10005`) above driver.js's overlay so the active NavLink glows with a pulsing cyan ring.
- **Theme toggle step (Step 7):** Targets `#tour-theme-toggle` inside the elevated topnav with a custom glow animation.
- **Smooth transitions:** `TourOverlay` uses `driver.highlight()` per step with `MutationObserver`-based element detection.
- **Skip & Resume:** Clicking "✕ Exit Demo" or the popover close button marks the tour done in `localStorage`. The "🗺️ Tour" button in the production nav resets the flag and relaunches the tour.
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

Base URL: `http://localhost:5000`

All endpoints except `GET /health` and `POST /auth/login` require:

```
Authorization: Bearer <jwt>
```

### Health & Liveness

| Method | Path      | Auth | Description           |
| ------ | --------- | ---- | --------------------- |
| GET    | `/health` | —    | Server liveness check |

### Authentication (`/auth`)

| Method | Path                    | Auth | Description                          |
| ------ | ----------------------- | ---- | ------------------------------------ |
| POST   | `/auth/login`           | —    | Login with username & password       |
| POST   | `/auth/register`        | —    | Register a new ADMIN account         |
| GET    | `/auth/me`              | ✅   | Get current user profile             |
| PUT    | `/auth/me`              | ✅   | Update profile (name, phone, address)|
| POST   | `/auth/verify-email`    | —    | Verify email with OTP token          |
| POST   | `/auth/change-password` | ✅   | Change authenticated user's password |

### Devices & Tanks (`/devices`)

| Method | Path            | Auth | Description                      |
| ------ | --------------- | ---- | -------------------------------- |
| GET    | `/devices`      | ✅   | List devices visible to the user |
| POST   | `/devices`      | ✅   | Register new ESP32 device        |
| GET    | `/devices/:id`  | ✅   | Get device details & thresholds  |
| PUT    | `/devices/:id`  | ✅   | Update device name / thresholds  |
| DELETE | `/devices/:id`  | ✅   | Remove a device (ADMIN only)     |

### Sensor Telemetry (`/sensor`)

| Method | Path               | Auth | Description                       |
| ------ | ------------------ | ---- | --------------------------------- |
| GET    | `/sensor/latest`   | ✅   | Latest reading per sensor type    |
| GET    | `/sensor/history`  | ✅   | Historical readings (date filter) |

### Alerts (`/alerts`)

| Method | Path               | Auth | Description                      |
| ------ | ------------------ | ---- | -------------------------------- |
| GET    | `/alerts`          | ✅   | List active / resolved alerts    |
| POST   | `/alerts/:id/resolve` | ✅ | Mark an alert as resolved      |

### Users (`/users`) — ADMIN / SUPER_ADMIN only

| Method | Path                       | Auth | Description                      |
| ------ | -------------------------- | ---- | -------------------------------- |
| GET    | `/users`                   | ✅   | List all user accounts           |
| POST   | `/users`                   | ✅   | Create a new USER account        |
| PUT    | `/users/:id/assign-tanks`  | ✅   | Assign tanks to a worker         |
| DELETE | `/users/:id`               | ✅   | Delete a user account            |

### Fish Species (`/fish`)

| Method | Path       | Auth | Description                     |
| ------ | ---------- | ---- | ------------------------------- |
| GET    | `/fish`    | ✅   | List all fish species           |
| POST   | `/fish`    | ✅   | Add a new species (ADMIN)       |
| PUT    | `/fish/:id`| ✅   | Update species parameters       |
| DELETE | `/fish/:id`| ✅   | Remove a species (ADMIN)        |

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

| Alert Type        | Condition                         | Default Threshold |
| ----------------- | --------------------------------- | ----------------- |
| `TEMP_HIGH`       | `temperature > TEMP_MAX`          | **32 °C**         |
| `TEMP_LOW`        | `temperature < TEMP_MIN`          | **20 °C**         |
| `PH_HIGH`         | `ph > PH_MAX`                     | **8.5**           |
| `PH_LOW`          | `ph < PH_MIN`                     | **6.5**           |
| `TDS_HIGH`        | `tds > TDS_MAX`                   | **800 ppm**       |
| `TURBIDITY_HIGH`  | `turbidity > TURBIDITY_MAX`       | **50 NTU**        |
| `WATER_LEVEL_LOW` | `water_level < WATER_LEVEL_MIN`   | **20 %**          |

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

Configure `code/backend/.env`:

```env
PORT=5000
DATABASE_URL="mongodb://localhost:27017/guard"
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=http://localhost:5173
MQTT_BROKER_URL=mqtt://localhost:1883
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your_influxdb_token
INFLUXDB_ORG=guard
INFLUXDB_BUCKET=telemetry
```

Configure `code/frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## Developer Helper Scripts

Root scripts to manage full-stack services:

| Script         | Command                                | Purpose                                                         |
| :------------- | :------------------------------------- | :-------------------------------------------------------------- |
| **Start All**  | `./start_all.ps1` or `start_all.bat`  | Starts Backend (port 5000) and Frontend (port 5173)             |
| **Kill All**   | `./kill_all.ps1` or `kill_all.bat`    | Terminates all Node.js background processes and frees ports     |

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

## ESP32 / Firmware Integration

Each G.U.A.R.D hardware node is an ESP32 microcontroller fitted with:

| Sensor | Parameter | Interface |
| --- | --- | --- |
| DS18B20 | Temperature (°C) | OneWire |
| pH Probe + Amplifier | pH (0–14) | Analog |
| TDS Probe | TDS (ppm) | Analog |
| Turbidity Sensor | Turbidity (NTU) | Analog |
| Ultrasonic / Float | Water Level (%) | Digital |

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

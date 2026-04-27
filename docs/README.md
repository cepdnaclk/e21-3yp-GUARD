---
layout: home
permalink: index.html
repository-name: e21-3yp-GUARD
title: Modular Aquarium Management System
---

# Modular Aquarium Management System

<a id="top"></a>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');

  :root {
    --g-cyan:   #00e5ff;
    --g-teal:   #00b4d8;
    --g-blue:   #0077b6;
    --g-deep:   #03045e;
    --g-dark:   #040d1a;
    --g-card:   rgba(255,255,255,0.04);
    --g-border: rgba(0,229,255,0.18);
    --g-glow:   rgba(0,229,255,0.25);
    --g-text:   #e0f7ff;
    --g-muted:  #7ec8e3;
  }

  html, body {
    background: var(--g-dark) !important;
    color: var(--g-text) !important;
    font-family: 'Inter', 'Space Grotesk', sans-serif !important;
  }

  body {
    background: linear-gradient(135deg, #040d1a 0%, #051829 40%, #040a22 100%) !important;
    min-height: 100vh;
  }

  h1,h2,h3,h4,h5 { color: #e0f7ff !important; font-family: 'Space Grotesk', sans-serif !important; }
  p, li, td, th { color: var(--g-text) !important; }
  a { color: var(--g-cyan) !important; }

  /* ── HERO ─────────────────────────────── */
  .g-hero {
    position: relative;
    overflow: hidden;
    border-radius: 24px;
    border: 1px solid var(--g-border);
    background: linear-gradient(135deg, rgba(0,180,216,0.12) 0%, rgba(3,4,94,0.35) 100%);
    backdrop-filter: blur(20px);
    padding: 48px 40px;
    margin: 24px 0;
    box-shadow: 0 0 60px rgba(0,229,255,0.08), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .g-hero::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 50% at 80% 20%, rgba(0,229,255,0.15) 0%, transparent 70%),
                radial-gradient(ellipse 40% 60% at 10% 80%, rgba(0,119,182,0.2) 0%, transparent 70%);
    pointer-events: none;
  }
  .g-hero-orb {
    position: absolute;
    top: -60px; right: -60px;
    width: 260px; height: 260px;
    background: radial-gradient(circle, rgba(0,229,255,0.18) 0%, transparent 70%);
    border-radius: 50%;
    animation: g-float 7s ease-in-out infinite;
  }
  .g-hero-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 32px;
    align-items: center;
    position: relative;
  }
  .g-kicker {
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 3px;
    font-weight: 700;
    color: var(--g-cyan);
    margin-bottom: 12px;
    opacity: 0.9;
  }
  .g-hero-title {
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    font-weight: 800;
    line-height: 1.15;
    margin: 0 0 16px;
    background: linear-gradient(135deg, #ffffff 0%, var(--g-cyan) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .g-hero-sub {
    color: var(--g-muted) !important;
    line-height: 1.75;
    font-size: 1.05rem;
    margin: 0;
  }
  .g-actions { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 12px; }
  .g-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 22px;
    border-radius: 999px;
    font-weight: 600; font-size: 0.9rem;
    text-decoration: none !important;
    transition: all 0.25s ease;
    border: 1px solid var(--g-cyan);
    background: linear-gradient(135deg, rgba(0,229,255,0.2) 0%, rgba(0,180,216,0.3) 100%);
    color: #fff !important;
    backdrop-filter: blur(8px);
  }
  .g-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(0,229,255,0.4);
    background: linear-gradient(135deg, rgba(0,229,255,0.35) 0%, rgba(0,180,216,0.45) 100%);
  }
  .g-btn-ghost {
    background: transparent;
    border-color: rgba(0,229,255,0.4);
    color: var(--g-cyan) !important;
  }

  /* ── STACK PANEL ─────────────────────── */
  .g-panel {
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--g-border);
    border-radius: 18px;
    padding: 22px;
    backdrop-filter: blur(12px);
  }
  .g-panel-title { font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 2px; color: var(--g-cyan) !important; margin-bottom: 14px; }
  .g-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .g-chip {
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(0,229,255,0.08);
    border: 1px solid rgba(0,229,255,0.25);
    color: var(--g-cyan) !important;
    font-size: 0.78rem; font-weight: 600;
  }
  .g-metric {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 12px;
    margin-top: 6px;
    border-radius: 10px;
    background: rgba(0,229,255,0.05);
    border: 1px solid rgba(0,229,255,0.1);
  }
  .g-metric span { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--g-muted) !important; }
  .g-metric strong { font-size: 0.85rem; color: #fff !important; }

  /* ── DIVIDER ─────────────────────────── */
  .g-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--g-border), transparent);
    border: none;
    margin: 28px 0;
  }

  /* ── FEATURE CARDS ───────────────────── */
  .g-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 16px;
    margin: 20px 0;
  }
  .g-card {
    background: var(--g-card);
    border: 1px solid var(--g-border);
    border-radius: 16px;
    padding: 22px 18px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  .g-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--g-teal), var(--g-cyan));
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .g-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,229,255,0.12); border-color: rgba(0,229,255,0.4); }
  .g-card:hover::before { opacity: 1; }
  .g-card-icon { font-size: 1.8rem; margin-bottom: 12px; display: block; }
  .g-card h4 { margin: 0 0 8px; font-size: 1rem; font-weight: 700; color: #fff !important; }
  .g-card p { margin: 0; font-size: 0.88rem; line-height: 1.6; color: var(--g-muted) !important; }

  /* ── QUICK NAV ───────────────────────── */
  .g-nav-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    margin: 16px 0;
  }
  .g-nav-item {
    display: block;
    text-decoration: none !important;
    padding: 12px 16px;
    border-radius: 12px;
    background: rgba(0,229,255,0.05);
    border: 1px solid rgba(0,229,255,0.15);
    color: var(--g-text) !important;
    font-weight: 600; font-size: 0.88rem;
    transition: all 0.2s ease;
  }
  .g-nav-item:hover { background: rgba(0,229,255,0.12); border-color: var(--g-cyan); color: var(--g-cyan) !important; transform: translateY(-2px); }

  /* ── BACK TO TOP ─────────────────────── */
  .g-back { display: inline-flex; align-items: center; gap: 6px; color: var(--g-cyan) !important; font-weight: 600; font-size: 0.85rem; text-decoration: none !important; margin-top: 8px; }
  .g-back:hover { opacity: 0.75; }

  /* ── TABLES ──────────────────────────── */
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: rgba(0,229,255,0.1); color: var(--g-cyan) !important; padding: 10px 14px; border: 1px solid var(--g-border); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 10px 14px; border: 1px solid rgba(0,229,255,0.1); font-size: 0.9rem; }
  tr:hover td { background: rgba(0,229,255,0.04); }

  /* ── SECTIONS ────────────────────────── */
  .g-section { padding: 8px 0; }
  .g-section h2 { font-size: 1.5rem; font-weight: 700; padding-bottom: 10px; border-bottom: 1px solid var(--g-border); margin-bottom: 18px; }

  /* ── ANIMATIONS ──────────────────────── */
  @keyframes g-float {
    0%,100% { transform: translate(0,0); }
    50%      { transform: translate(-16px, 12px); }
  }

  @media(max-width:760px) {
    .g-hero-grid { grid-template-columns: 1fr; }
    .g-hero { padding: 32px 20px; }
  }
</style>


<div class="g-hero" markdown="0">
<div class="g-hero-orb"></div>
<div class="g-hero-grid">
<div>
<div class="g-kicker">🐟 IoT · Aquaculture · Automation</div>
<h2 class="g-hero-title">Smart Monitoring for Healthier Aquariums</h2>
<p class="g-hero-sub">Reliable, scalable, and affordable aquarium automation for small and medium fish vendors — powered by ESP32 sensing, secure MQTT messaging, and a realtime web dashboard.</p>
<div class="g-actions">
<a class="g-btn" href="#project-snapshot">⚡ Explore Overview</a>
<a class="g-btn g-btn-ghost" href="#solution-architecture">🏗 View Architecture</a>
</div>
</div>
<div class="g-panel">
<div class="g-panel-title">Live Stack</div>
<div class="g-chips">
<span class="g-chip">ESP32</span>
<span class="g-chip">Secure MQTT</span>
<span class="g-chip">Node.js API</span>
<span class="g-chip">React Dashboard</span>
<span class="g-chip">MongoDB</span>
<span class="g-chip">InfluxDB</span>
</div>
<div class="g-metric"><span>Telemetry</span><strong>Realtime streaming</strong></div>
<div class="g-metric"><span>Automation</span><strong>Relay + rule engine</strong></div>
<div class="g-metric"><span>Reliability</span><strong>Fail-safe thresholds</strong></div>
</div>
</div>
</div>


<hr class="g-divider" />

<div class="g-cards" markdown="0">
<div class="g-card">
<span class="g-card-icon">🌡️</span>
<h4>Sensor Fusion</h4>
<p>Temperature, pH, ORP, EC, salinity, and water-level insight in one modular kit.</p>
</div>
<div class="g-card">
<span class="g-card-icon">⚙️</span>
<h4>Automated Control</h4>
<p>Relay-driven pumps, heaters, and filtration triggered by safe thresholds.</p>
</div>
<div class="g-card">
<span class="g-card-icon">📊</span>
<h4>Realtime Dashboard</h4>
<p>Live MQTT ingestion with Socket.IO updates and alert-ready feeds.</p>
</div>
<div class="g-card">
<span class="g-card-icon">🏪</span>
<h4>Vendor Ready</h4>
<p>Low-cost, scalable, and built for the daily operations of small vendors.</p>
</div>
</div>

<hr class="g-divider" />

---

## Team
- E/21/231, Thisen Lakdinu, [email](mailto:thisen@email.com)
- E/21/362, Shashika Sathsarani, [email](mailto:member2@email.com)
- E/21/039, Ravindu Ashan, [email](mailto:member3@email.com)
- E/21/067, Asindu Chandasekara, [email](mailto:member3@email.com)

---

## Project Snapshot

The Modular Aquarium Management System is an IoT-based platform that continuously monitors aquarium water quality and automates corrective actions in real time. The solution is designed for practical field use, especially for small and medium-scale pet fish vendors who need a low-cost but dependable way to maintain healthy tank environments.

### What this system does
- Monitors critical water parameters continuously.
- Detects abnormal trends early and alerts users.
- Automatically controls devices such as pumps, filtration, and heater relays.
- Provides a dashboard-ready data flow for remote monitoring and decision support.
- Supports modular expansion as tank count and monitoring needs grow.

<!-- Image (photo/drawing of the final hardware) should be here -->
<!-- ![System Overview](./images/system_overview.png) -->

<!-- Optional live architecture image -->
<!-- ![Hardware and Data Flow](./images/architecture-overview.png) -->

#### Table of Contents
1. [Introduction](#introduction)
2. [Problem Statement](#problem-statement)
3. [Objectives](#objectives)
4. [Solution Architecture](#solution-architecture)
5. [System Workflow](#system-workflow)
6. [Hardware and Software Design](#hardware-and-software-design)
7. [Implementation Stack and Modules](#implementation-stack-and-modules)
8. [Backend Services and API](#backend-services-and-api)
9. [Firmware Logic and MQTT Protocol](#firmware-logic-and-mqtt-protocol)
10. [Data Storage and Security](#data-storage-and-security)
11. [Testing and Validation](#testing-and-validation)
12. [Detailed Budget](#detailed-budget)
13. [Impact and Future Improvements](#impact-and-future-improvements)
14. [Links](#links)

### Quick Navigation
<div class="g-nav-grid" markdown="0">
<a class="g-nav-item" href="#project-snapshot">📌 Project Snapshot</a>
<a class="g-nav-item" href="#solution-architecture">🏗 Solution Architecture</a>
<a class="g-nav-item" href="#system-workflow">🔄 System Workflow</a>
<a class="g-nav-item" href="#backend-services-and-api">🖥 Backend &amp; API</a>
<a class="g-nav-item" href="#firmware-logic-and-mqtt-protocol">📡 Firmware &amp; MQTT</a>
<a class="g-nav-item" href="#data-storage-and-security">🔒 Data &amp; Security</a>
<a class="g-nav-item" href="#testing-and-validation">✅ Testing</a>
<a class="g-nav-item" href="#detailed-budget">💰 Budget</a>
<a class="g-nav-item" href="#impact-and-future-improvements">🚀 Future Plans</a>
<a class="g-nav-item" href="#links">🔗 Useful Links</a>
</div>

---

## Introduction

Maintaining safe water quality across multiple tanks is difficult when monitoring is done manually. In many aquarium vending environments, parameter checks are infrequent, corrective actions are delayed, and environmental changes can go unnoticed for hours. This directly affects fish health and increases operational risk.

This project introduces a Modular Aquarium Management System that combines sensor monitoring, automation logic, and IoT connectivity to maintain stable tank conditions. The system continuously measures parameters such as temperature, pH, ORP, EC, salinity, and water level, then applies rule-based control to relevant actuators. The modular design allows the platform to start small and scale as required.

<a class="g-back" href="#top">↑ Back to Top</a>

---

## Problem Statement

Small to medium-scale fish vendors commonly experience:
- Inconsistent and manual water quality checks.
- Delayed detection of harmful conditions.
- Limited automation in routine tank maintenance.
- Financial losses due to fish stress, disease, and mortality.

There is a clear need for an affordable, deployable, and easy-to-extend smart monitoring and control system.

<a class="back-top" href="#top">Back to Top</a>

---

## Objectives

- Build a centralized, ESP32-based control system for aquarium environments.
- Continuously capture key water-quality indicators.
- Trigger safe, automated responses when parameters exceed thresholds.
- Enable data visibility through networked logging and dashboard integration.
- Keep the design modular, low-cost, and maintainable.

<a class="back-top" href="#top">Back to Top</a>

---

## Solution Architecture

The platform uses a centralized control model around an ESP32 controller, connected to multiple sensors and relay-driven actuators. Data is sampled from sensor modules, validated and processed by embedded logic, and then used to trigger local control actions. The same data can be transmitted for remote monitoring and alerting.

The architecture is intentionally modular. Sensor modules and control capabilities can be added or removed without redesigning the full platform, making it suitable for varying tank sizes and vendor budgets.

### Main Architectural Components
- Sensor Modules (Water Quality Monitoring)
- Central Control Unit (ESP32)
- Actuator Control Unit (Relays)
- Power Management Unit
- Communication and Data Layer (Wi-Fi / MQTT-ready pipeline)
- Optional Monitoring Dashboard and Alert Interface

<a class="back-top" href="#top">Back to Top</a>

---

## System Workflow

1. Sensor modules periodically acquire water-quality measurements.
2. ESP32 firmware filters, calibrates, and validates readings.
3. Rule engine compares readings against safe operating thresholds.
4. Actuators are switched via relays when corrective action is needed.
5. Processed data is published for visualization and long-term monitoring.
6. Alerts are generated for abnormal or persistent unsafe conditions.

<a class="back-top" href="#top">Back to Top</a>

---

## Hardware and Software Design

### Hardware Design

#### Central Control Unit
- **ESP32 Microcontroller**
  - Handles sensor acquisition, decision logic, and actuator control
  - Provides built-in Wi-Fi for telemetry and remote monitoring

#### Sensors Used
- **Temperature:** DS18B20 waterproof sensor
- **pH:** Gravity pH sensor (DFRobot / pH-4502C)
- **ORP:** ORP probe with signal conditioning
- **Electrical Conductivity (EC):** EC sensor module
- **Salinity & Specific Gravity:** Calculated from EC values
- **TDS:** Dedicated TDS sensor or derived from EC
- **Water Level:** Float switch
- **Turbidity (Optional):** Optical turbidity sensor for water clarity estimation

#### Actuators
Actuators are controlled through a relay board:
- Heater
- Water pump
- Air pump
- Filtration unit

#### Power Management
- 12V DC power supply
- Buck converters (LM2596)
- Voltage regulators
- Fuse and surge protection mechanisms for electrical safety

---

### Software Design

- **Embedded Firmware**
  - Written using Arduino framework
  - Sensor data acquisition and calibration
  - Control logic and automation rules
- **Control Algorithms and Safety**
  - Threshold-based control strategy
  - Fail-safe cutoffs during abnormal or invalid sensor states
  - Controlled actuation to avoid rapid on/off relay toggling
- **Connectivity and Monitoring**
  - Real-time data transmission for dashboard visualization
  - Event/alert notifications for out-of-range parameters

<a class="back-top" href="#top">Back to Top</a>

---

## Implementation Stack and Modules

This project is implemented as a complete multi-layer system:

### 1) ESP32 Firmware Layer
- Written in C++ (Arduino framework) for ESP32.
- Reads DS18B20 temperature, TDS (ADC), and ultrasonic water-level sensor data.
- Controls relays for inlet/outlet pumps and servo-based feeder actions.
- Stores threshold settings in non-volatile memory (Preferences).
- Supports secure MQTT publishing/subscription with TLS root certificate.

### 2) Backend Service Layer
- Runtime: Node.js + Express.
- Realtime transport: Socket.IO.
- Messaging: MQTT client ingestion and command publishing.
- Validation: express-validator.
- Auth and access control: JWT + role-based authorization (SUPER_ADMIN, ADMIN, USER).

### 3) Data Layer
- Primary application state: MongoDB via Prisma.
- Time-series history: InfluxDB (water_quality measurement).

### 4) Frontend Layer
- React + Vite dashboard.
- REST API integration for auth, tanks, sensors, and alerts.
- Socket.IO client for live sensor and alert events.

<a class="back-top" href="#top">Back to Top</a>

---

## Backend Services and API

### Service Capabilities
- REST API server with CORS-enabled frontend access.
- MQTT subscription to live topics for sensor values and alerts.
- Hybrid persistence: latest state in MongoDB + historical series in InfluxDB.
- Real-time push notifications using Socket.IO events.
- Email alert dispatch to tank owners/workers.

### Main API Groups
- **Authentication (`/api/auth`)**
  - Login, register, Google login.
  - Email verification and resend verification.
  - Profile updates.
  - Admin and user management by role.
- **Tank Management (`/api/tanks`)**
  - Register tank, list tanks, get per-tank status.
  - Assign/unassign workers to tanks.
  - Delete tanks with ownership checks.
  - Trigger actuator commands (`feed`, `pump_on`, `pump_off`).
- **Sensors (`/api/sensors`)**
  - Optional HTTP ingest route (`/log`) for testing.
  - Historical analytics route (`/history/:tankId`) from InfluxDB.
- **Alerts (`/api/alerts`)**
  - List alerts and mark alerts as resolved.
  - Test endpoint to simulate MQTT alert processing.

### Realtime Events
- `sensor_data`: pushed on each valid sensor ingestion.
- `alert_new`: pushed when a new alert is persisted.

<a class="back-top" href="#top">Back to Top</a>

---

## Firmware Logic and MQTT Protocol

### ESP32 Control Behavior
- Reads sensors on short polling intervals and publishes data at fixed intervals.
- Uses deadband/hysteresis logic to avoid unstable pump toggling.
- Applies threshold-driven water quality control for temperature, TDS, and level.
- Implements fallback reconnect loops for Wi-Fi and MQTT.
- Supports long-press reset behavior for configuration reset flow.

### MQTT Topics Used
- **Sensor publish topics**
  - `sensor/<deviceId>/temperature`
  - `sensor/<deviceId>/tds`
  - `sensor/<deviceId>/waterlevel`
- **Alert publish topics**
  - `alert/<deviceId>/<parameter>`
- **Command subscribe topic**
  - `device/<deviceId>/command`
- **Threshold update topics**
  - `device/<deviceId>/set/temp_min`
  - `device/<deviceId>/set/temp_max`
  - `device/<deviceId>/set/tds_min`
  - `device/<deviceId>/set/tds_max`
  - `device/<deviceId>/set/water_level`
  - `device/<deviceId>/set/water_stop`

### Payload Pattern
- Sensor payloads are JSON with value and timestamp.
- Alert payloads carry alert type and measured value.
- Actuator commands are published as simple string commands.

<a class="back-top" href="#top">Back to Top</a>

---

## Data Storage and Security

### Data Model
- **User model**
  - Role-aware hierarchy (SUPER_ADMIN, ADMIN, USER).
  - Admin-to-worker ownership mapping.
  - Email verification support.
- **Tank model**
  - Unique tank IDs.
  - Admin owner + worker assignment.
  - Configurable safe ranges and last-known telemetry values.
- **Alert model**
  - Parameter/type/message/value fields.
  - Tank linkage and resolution status.

### Data Flow Design
1. Firmware publishes sensor packets to MQTT.
2. Backend MQTT service validates and maps sensor fields.
3. Tank live status updates in MongoDB.
4. Time-series points write to InfluxDB.
5. Frontend reads status/history and listens for realtime events.

### Security and Reliability Measures
- JWT-based protected routes and role-restricted endpoints.
- Access checks for tank ownership/assignment before operations.
- Input validation on critical routes.
- Duplicate-alert suppression window to reduce notification spam.
- Graceful shutdown of MQTT, Prisma, and Influx write buffers.

<a class="back-top" href="#top">Back to Top</a>

---

## Implementation Highlights

- Built on low-cost, widely available hardware modules.
- Supports gradual deployment from single-tank to multi-tank setups.
- Uses a practical control approach suitable for real-world vendor operations.
- Designed with maintainability in mind, including sensor-level modularity.
- Provides a clear path for cloud integration and advanced analytics.
- Delivers end-to-end IoT flow from edge sensing to realtime dashboard updates.

<a class="back-top" href="#top">Back to Top</a>

---

## Testing and Validation

### Hardware Testing
- Individual sensor calibration and validation
- Relay switching tests under load
- Power stability and fault testing

### Software Testing
- Sensor data accuracy verification
- Control logic testing under simulated conditions
- Fail-safe behavior validation (sensor disconnection, noisy values, power loss)

### Results Summary
- Sensors provided stable readings within acceptable tolerance
- Automation logic maintained safe operating ranges in repeated test runs
- Abnormal conditions triggered expected relay actions and alerts

<a class="back-top" href="#top">Back to Top</a>

---

## Detailed Budget

| Item | Quantity | Unit Cost | Total |
|-----|:--:|:--:|--:|
| ESP32 Development Board | 1 | 4,000 LKR | 4,000 LKR |
| DS18B20 Temperature Sensor | 1 | 800 LKR | 800 LKR |
| pH Sensor Module | 1 | 5,000 LKR | 5,000 LKR |
| ORP Sensor Module | 1 | 6,000 LKR | 6,000 LKR |
| EC Sensor | 1 | 6,500 LKR | 6,500 LKR |
| TDS Sensor | 1 | 2,500 LKR | 2,500 LKR |
| Float Switch | 1 | 600 LKR | 600 LKR |
| Relay Module | 1 | 1,200 LKR | 1,200 LKR |
| Power Supply & Regulators | 1 | 3,000 LKR | 3,000 LKR |
| Miscellaneous | - | 2,000 LKR | 2,000 LKR |

**Estimated Total:** ~ **34,600 LKR**

<a class="back-top" href="#top">Back to Top</a>

---

## Impact and Future Improvements

This project demonstrates that a practical and cost-effective smart aquarium platform can significantly improve maintenance consistency, reduce manual effort, and protect fish health through timely intervention.

Planned future extensions include:
- Cloud-based historical analytics and reporting.
- Mobile app integration for remote operations.
- Adaptive or AI-assisted anomaly detection.
- Product-level packaging for commercial deployment.

[Back to Top](#top)

---

## Links

- [Project Repository](https://github.com/cepdnaclk/{{ page.repository-name }}){:target="_blank"}
- [Project Page](https://cepdnaclk.github.io/{{ page.repository-name }}){:target="_blank"}
- [Department of Computer Engineering](http://www.ce.pdn.ac.lk/)
- [University of Peradeniya](https://eng.pdn.ac.lk/)

[Back to Top](#top)


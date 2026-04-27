---
layout: home
permalink: index.html
repository-name: e21-3yp-GUARD
title: Modular Aquarium Management System
---

# Modular Aquarium Management System

<a id="top"></a>

<style>
  :root {
    --guard-primary: #0f766e;
    --guard-secondary: #0ea5a4;
    --guard-accent: #0b4f7a;
    --guard-bg-soft: #f0fdfa;
    --guard-bg-mid: #e0f2fe;
    --guard-text: #0f172a;
    --guard-muted: #334155;
    --guard-border: #99f6e4;
  }

  .guard-hero {
    background: linear-gradient(135deg, var(--guard-bg-soft) 0%, var(--guard-bg-mid) 100%);
    border: 1px solid var(--guard-border);
    border-radius: 14px;
    padding: 18px 20px;
    margin: 10px 0 14px 0;
  }

  .guard-hero h3 {
    margin: 0 0 8px 0;
    color: var(--guard-accent);
  }

  .guard-hero p {
    margin: 0;
    color: var(--guard-muted);
    line-height: 1.55;
  }

  .guard-badges {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .guard-chip {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid #67e8f9;
    background: #ecfeff;
    color: #155e75;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .quick-nav-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    margin: 10px 0 4px 0;
  }

  .quick-nav-item {
    display: block;
    text-decoration: none;
    background: #ffffff;
    color: var(--guard-text);
    border: 1px solid #bae6fd;
    border-radius: 10px;
    padding: 10px 12px;
    font-weight: 600;
  }

  .quick-nav-item:hover {
    border-color: var(--guard-secondary);
    color: var(--guard-primary);
    transform: translateY(-1px);
  }

  .back-top {
    display: inline-block;
    margin-top: 6px;
    font-weight: 600;
    text-decoration: none;
    color: var(--guard-primary);
  }
</style>

<div class="guard-hero">
  <h3>Smart Monitoring for Healthier Aquariums</h3>
  <p>Reliable, scalable, and affordable aquarium automation for small and medium fish vendors, powered by ESP32 sensing, secure MQTT messaging, and a realtime web dashboard.</p>
  <div class="guard-badges">
    <span class="guard-chip">ESP32</span>
    <span class="guard-chip">Secure MQTT</span>
    <span class="guard-chip">Node.js API</span>
    <span class="guard-chip">React Dashboard</span>
    <span class="guard-chip">MongoDB + InfluxDB</span>
  </div>
</div>

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
<div class="quick-nav-grid">
  <a class="quick-nav-item" href="#project-snapshot">Project Snapshot</a>
  <a class="quick-nav-item" href="#solution-architecture">Solution Architecture</a>
  <a class="quick-nav-item" href="#system-workflow">System Workflow</a>
  <a class="quick-nav-item" href="#backend-services-and-api">Backend Services and API</a>
  <a class="quick-nav-item" href="#firmware-logic-and-mqtt-protocol">Firmware and MQTT</a>
  <a class="quick-nav-item" href="#data-storage-and-security">Data and Security</a>
  <a class="quick-nav-item" href="#testing-and-validation">Testing and Validation</a>
  <a class="quick-nav-item" href="#detailed-budget">Detailed Budget</a>
  <a class="quick-nav-item" href="#impact-and-future-improvements">Future Improvements</a>
  <a class="quick-nav-item" href="#links">Useful Links</a>
</div>

---

## Introduction

Maintaining safe water quality across multiple tanks is difficult when monitoring is done manually. In many aquarium vending environments, parameter checks are infrequent, corrective actions are delayed, and environmental changes can go unnoticed for hours. This directly affects fish health and increases operational risk.

This project introduces a Modular Aquarium Management System that combines sensor monitoring, automation logic, and IoT connectivity to maintain stable tank conditions. The system continuously measures parameters such as temperature, pH, ORP, EC, salinity, and water level, then applies rule-based control to relevant actuators. The modular design allows the platform to start small and scale as required.

<a class="back-top" href="#top">Back to Top</a>

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


# 3YP-GUARD

## 👨‍💻 Team

Third Year Project — Team 08

- E/21/231 - Thisen
- E/21/362 - Shashika
- E/21/039 - Ashan
- E/21/067 - Asindu

---

## 🐠 What is G.U.A.R.D?

## General Unit for Aquatic Risk Detection

### A Modular Safety & Monitoring System for Multi-Tank Ornamental Fish Shops

**G.U.A.R.D** is a smart monitoring and automation system designed to continuously watch aquarium conditions and immediately alert the owner before damage happens.

**Goal:** Prevent fish mortality, reduce manual work, and improve reliability using automation and real-time monitoring.

---

## ❗Motivation

### Practical Problems

Ornamental fish shops manage multiple aquariums simultaneously, each containing species with different environmental requirements.
Small invisible changes in water quality can quickly lead to fish stress, disease, or death — often before the owner notices.

However:

- Manual testing is slow and reactive
- Measurements are sometimes inaccurate
- Continuous monitoring is impossible for humans

### Real-World Impact

| Impact            | Description                          |
| ----------------- | ------------------------------------ |
| Financial Loss    | Expensive fish (ex: Arowana) may die |
| Reputation Damage | Customer trust decreases             |
| Labor Stress      | Staff must constantly check tanks    |

---

## 🚫 Why Existing Solutions Are Not Enough

Current aquarium systems are mostly designed for **single home aquariums**.

They suffer from:

- No scalability
- No modular expansion
- Expensive to scale
- Limited alert features
- No centralized monitoring

---

## 🔍 Core Features

### Water Monitoring

The system continuously measures critical water parameters:

- Temperature
- pH
- Ammonia
- Water Level
- Turbidity

### Alert System

- Mobile notifications
- Web dashboard alerts
- Local LED indicators

### Automation

- Automatic filtration
- Water circulation control
- Optional water change
- Automatic fish feeding
- Lighting control

### Intelligence & Dashboard

- Real-time monitoring
- Historical data visualization
- Centralized control panel

### Scalability

- Plug-and-play tank modules
- Multi-tank architecture
- Easy expansion without shutdown

---

## 🏗 System Architecture

```
Sensors → Microcontroller → Cloud → User Interface → Actuators
```

### Data Flow

1. Sensors read water parameters
2. ESP32 processes and evaluates thresholds
3. Data stored locally + cloud
4. Alerts sent to user
5. System automatically reacts (heater/pump/feeder)

### Components Overview

| Category     | Elements                            |
| ------------ | ----------------------------------- |
| Sensors      | Temp, pH, Level, Turbidity, Ammonia |
| Controller   | ESP32 Microcontroller               |
| Storage      | Local + Cloud Database              |
| Interface    | Web App + Mobile App                |
| Actuators    | Heater, Pump, Feeder, Lights        |
| Connectivity | Wi-Fi                               |

---

## 🔧 Hardware Design

### 1️⃣ Central Control Unit

- ESP32 microcontroller
- Relay module
- Power management unit
- Voltage regulators
- Surge & fuse protection

### 2️⃣ Sensor Modules

- DS18B20 Temperature sensor
- pH sensor
- Water level sensor
- Turbidity sensor
- Leak detection sensor
- Ammonia sensor

### 3️⃣ Actuator Modules

- Aquarium heater
- Water pump
- Air pump
- Automatic feeder (servo/stepper)
- Solenoid valve
- LED lighting system

### 4️⃣ Connectivity

- Built-in Wi-Fi (ESP32)

---

## 💻 Software Design

### 1️⃣ Embedded System (Microcontroller)

Handles real-time operations:

- Sensor reading
- Decision logic
- Scheduling
- Actuator control
- Alerts
- Communication
- Data logging

### 2️⃣ Cloud & Backend

- IoT platform (MQTT / REST API)
- Cloud database
- Backend services (Node.js + NestJS)

### 3️⃣ Frontend

| Platform | Technology      |
| -------- | --------------- |
| Web      | React + Next.js |
| Language | TypeScript      |

### 4️⃣ Firmware Tools

- Arduino IDE / PlatformIO
- ESP32 SDK
- Embedded C/C++

---

## 📅 Project Timeline

| Phase       | Work                                  |
| ----------- | ------------------------------------- |
| Weeks 1–5   | Planning & setup                      |
| Weeks 6–10  | Hardware integration & calibration    |
| Weeks 11–15 | Web & mobile development              |
| Weeks 16–20 | Alerts, scaling, testing & final demo |

---

## 📊 Feasibility Analysis

### Technical

Uses affordable and widely available ESP32 and sensors.

### Economic

Low cost compared to fish losses.

### Operational

Modular design allows adding tanks without shutdown.

### Schedule

6-month development plan.

### Risk Handling

Possible challenges:

- Sensor drift
- Ammonia sensor warm-up
- Water exposure damage
- Internet failure

System designed to tolerate failures and continue local monitoring.

---

## 💰 Example Sensor Budget

| Parameter        | Sensor     |
| ---------------- | ---------- |
| Temperature      | DS18B20    |
| pH               | SEN0161    |
| Turbidity        | SEN0189    |
| Water Level      | P4510      |
| TDS/EC           | SEN0244    |
| Salinity         | Calculated |
| Specific Gravity | Calculated |

---

## 🎯 Expected Outcome

G.U.A.R.D will:

- Reduce fish deaths
- Reduce manual monitoring
- Provide reliable data
- Improve shop reputation
- Enable scalable smart aquarium management

---

## 🌊 Final Vision

> A fish should never die because the owner didn’t notice a change in water quality.

G.U.A.R.D ensures the system notices first.

---

## 🔮 Future Enhancements

G.U.A.R.D is designed as a scalable platform. The following improvements are planned for future versions.

- Fish stress prediction using machine learning
- Automatic disease detection based on behavior patterns
- Chemical dosing control

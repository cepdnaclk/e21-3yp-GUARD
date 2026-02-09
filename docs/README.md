---
layout: home
permalink: index.html

# Please update this with your repository name and project title
repository-name: eYY-3yp-project-template
title: Modular Aquarium Management System
---

# Modular Aquarium Management System

---

## Team
- e21231, Thisen Lakdinu, [email](mailto:thisen@email.com)
- e21362, Shashika Sathsarani, [email](mailto:member2@email.com)
- e21039, Ravindu Ashan, [email](mailto:member3@email.com)
- e21067, Asindu Chandasekara, [email](mailto:member3@email.com)

<!-- Image (photo/drawing of the final hardware) should be here -->
<!-- ![System Overview](./images/system_overview.png) -->

#### Table of Contents
1. [Introduction](#introduction)
2. [Solution Architecture](#solution-architecture)
3. [Hardware & Software Designs](#hardware-and-software-designs)
4. [Testing](#testing)
5. [Detailed budget](#detailed-budget)
6. [Conclusion](#conclusion)
7. [Links](#links)

---

## Introduction

Small to medium-scale pet fish vendors face significant challenges in maintaining optimal aquarium conditions due to manual monitoring, lack of automation, and inconsistent maintenance. Poor water quality can lead to fish stress, disease, and financial loss.

This project proposes a **Modular Aquarium Management System** that automates water quality monitoring and control using low-cost sensors and a centralized controller. The system continuously measures key parameters such as temperature, pH, ORP, EC, salinity, and water level, and automatically controls actuators like heaters, filters, and pumps. The modular design allows vendors to scale the system based on tank size and budget, making it suitable for real-world deployment.

---

## Solution Architecture

The system follows a **centralized control architecture** where an ESP32 microcontroller acts as the main controller. Multiple sensor modules are connected to the controller to collect real-time water quality data. Based on predefined thresholds and control logic, the system automatically operates actuators through relay modules.

Sensor data is processed locally and can be transmitted wirelessly for monitoring and alerts. The modular approach allows individual sensor kits or control units to be added or removed without redesigning the entire system.

**Main architectural components:**
- Sensor Modules (Water Quality Monitoring)
- Central Control Unit (ESP32)
- Actuator Control Unit (Relays)
- Power Management Unit
- Optional User Interface / Dashboard

---

## Hardware and Software Designs

### Hardware Design

#### Central Control Unit
- **ESP32 Microcontroller**
  - Handles sensor data acquisition, processing, and control logic
  - Provides built-in Wi-Fi for remote monitoring

#### Sensors Used
- **Temperature:** DS18B20 waterproof sensor  
- **pH:** Gravity pH sensor (DFRobot / pH-4502C)
- **ORP:** ORP probe with signal conditioning
- **Electrical Conductivity (EC):** EC sensor module
- **Salinity & Specific Gravity:** Calculated from EC values
- **TDS:** Dedicated TDS sensor or derived from EC
- **Water Level:** Float switch
- **Turbidity (Optional):** Optical turbidity sensor

#### Actuators
- Heater
- Water pump
- Air pump
- Filtration unit

Controlled using a **relay module**.

#### Power Management
- 12V DC power supply
- Buck converters (LM2596)
- Voltage regulators
- Fuse and surge protection

---

### Software Design

- **Embedded Firmware**
  - Written using Arduino framework
  - Sensor data acquisition and calibration
  - Control logic and automation rules
- **Control Algorithms**
  - Threshold-based control
  - Safety cutoffs for abnormal conditions
- **Optional Monitoring Interface**
  - Web or mobile dashboard
  - Alert notifications for abnormal parameters

---

## Testing

### Hardware Testing
- Individual sensor calibration and validation
- Relay switching tests under load
- Power stability and fault testing

### Software Testing
- Sensor data accuracy verification
- Control logic testing under simulated conditions
- Fail-safe behavior testing (sensor disconnection, power loss)

### Results Summary
- Sensors provided stable readings within acceptable tolerance
- Automation successfully maintained safe aquarium conditions
- System responded correctly to abnormal water quality conditions

---

## Detailed budget

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

---

## Conclusion

The Modular Aquarium Management System successfully demonstrates an affordable and scalable solution for automating aquarium maintenance in small to medium-sized fish vending operations. The system improves fish health, reduces manual effort, and minimizes losses due to poor water quality.

Future developments include cloud-based analytics, mobile application integration, AI-based anomaly detection, and commercialization as a modular product for aquarium vendors.

---

## Links

- [Project Repository](https://github.com/cepdnaclk/{{ page.repository-name }}){:target="_blank"}
- [Project Page](https://cepdnaclk.github.io/{{ page.repository-name}}){:target="_blank"}
- [Department of Computer Engineering](http://www.ce.pdn.ac.lk/)
- [University of Peradeniya](https://eng.pdn.ac.lk/)


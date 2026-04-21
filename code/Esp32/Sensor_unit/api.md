# ESP32 MQTT Data Flow Summary

## 1️⃣ MQTT Topic Structure

Your MQTT topics are **hierarchical** and unique per device using `DeviceID`.  

| Type       | Topic Example               | Purpose                                         |
|------------|----------------------------|------------------------------------------------|
| Sensor data| `sensor/100/temperature`    | Auto-publish or backend-requested temperature readings |
| Commands   | `device/100/command`        | Backend sends commands like `"temperature"` to request data |

> **Note:** Each ESP32 should have a unique `DeviceID` (currently 100).

---

## 2️⃣ Data Structure Sent by ESP32

Every sensor reading is sent as a **JSON object**:

- `value` → sensor reading  
- `time` → timestamp in `"YYYY-MM-DD HH:MM:SS"` format from NTP  

**Example: Temperature reading**

```json
{
  "value": 27.5,
  "time": "2026-03-09 14:22:10"
}

data structure of commands

topic: device/100/command
payload: "temperature"

then it will send the data at that point to the mqtt and backend can get the data from there.

Attention,

other sensores also work like this so same topic structure will be use

"100" is the device id that we use to sensor also 100-200 will be the device range for easy debug.

# ESP32 to Backend API Structure (MQTT)

This document is the MQTT/API contract for the ESP32 sensor unit firmware.
It is intended for backend implementation and integration.

## 1. Device Identity

- Each ESP32 uses one numeric device ID.
- Current firmware default: `100`
- Topic paths are built using this ID.

Pattern:

`<domain>/<deviceId>/<resource>`

Examples:

- `sensor/100/temperature`
- `device/100/command`
- `device/100/set/temp_min`

## 2. MQTT Topics Overview

### 2.1 Sensor Publish Topics (ESP32 -> MQTT -> Backend)

ESP32 publishes retained JSON messages on:

- `sensor/<deviceId>/temperature`
- `sensor/<deviceId>/waterlevel`
- `sensor/<deviceId>/tds`

Payload format:

```json
{
  "value": 27.5,
  "time": "2026-04-24 10:15:30"
}
```

Field rules:

- `value`: number (float)
- `time`: string in `YYYY-MM-DD HH:MM:SS` (device local time from NTP)

Publish interval behavior:

- Temperature: every 10 seconds
- Water level: every 10 seconds
- TDS: every 10 seconds

### 2.2 Alert Publish Topics (ESP32 -> MQTT -> Backend)

ESP32 publishes retained JSON alerts on:

- `alert/<deviceId>/temperature`
- `alert/<deviceId>/waterlevel`
- `alert/<deviceId>/tds`

Payload format:

```json
{
  "alert": "HIGH",
  "value": 30.2
}
```

`alert` values:

- `LOW`
- `HIGH`

Trigger logic summary:

- temperature: LOW if `< temp_min`, HIGH if `> temp_max`
- tds: LOW if `< tds_min`, HIGH if `> tds_max`
- waterlevel: LOW if `>= water_level_threshold` (tank low), HIGH if `<= water_stop_threshold` (tank high/full region)

### 2.3 Command Topic (Backend -> ESP32)

Topic:

- `device/<deviceId>/command`

Payload (plain text string):

- `feed`
- `pump_on`
- `pump_off`

Command behavior:

- `feed`: rotates servo to feed once
- `pump_on`: manual override on (both pumps ON)
- `pump_off`: manual override off (both pumps OFF)

### 2.4 Threshold Set Topics (Backend -> ESP32)

Topics and payload type:

- `device/<deviceId>/set/temp_min` -> float as text
- `device/<deviceId>/set/temp_max` -> float as text
- `device/<deviceId>/set/tds_min` -> float as text
- `device/<deviceId>/set/tds_max` -> float as text
- `device/<deviceId>/set/water_level` -> float as text
- `device/<deviceId>/set/water_stop` -> float as text

Example payloads:

- `"24.0"`
- `"500"`

Persistence on device:

- Threshold updates are saved in ESP32 flash (`Preferences`) and restored on reboot.

## 3. QoS/Retain Behavior

- Sensor messages: published with retain flag = `true`
- Alert messages: published with retain flag = `true`
- Commands and threshold set messages: consumed as live messages (retain optional, backend-defined)

Backend note:

- Because sensor/alert topics are retained, new subscribers receive the latest state immediately.

## 4. Data Storage Model by Topic

Recommended backend storage split:

### 4.1 `sensor/<deviceId>/<parameter>` -> time-series table

Store every sensor message as an immutable reading record.

Suggested table: `sensor_readings`

Columns:

- `id` (pk)
- `device_id` (int)
- `parameter` (enum/string: `temperature|waterlevel|tds`)
- `value` (float)
- `device_time` (datetime, parsed from payload `time`)
- `received_at` (server timestamp)
- `topic` (string)
- `raw_payload` (json/text, optional)

Suggested unique/index strategy:

- index: (`device_id`, `parameter`, `received_at`)
- optional dedup key: (`device_id`, `parameter`, `device_time`, `value`)

### 4.2 `alert/<deviceId>/<parameter>` -> current state + history

Use two-layer storage:

1. `alert_events` (append-only history)
2. `active_alerts` (latest unresolved/current status per device+parameter)

Suggested `alert_events` columns:

- `id` (pk)
- `device_id` (int)
- `parameter` (string)
- `alert_level` (`LOW|HIGH`)
- `value` (float)
- `received_at` (server timestamp)
- `topic` (string)
- `raw_payload` (json/text, optional)

Suggested `active_alerts` columns:

- `device_id`
- `parameter`
- `current_level`
- `last_value`
- `last_updated_at`

Primary/unique key:

- (`device_id`, `parameter`)

### 4.3 `device/<deviceId>/command` -> command audit log

Store every command sent by backend.

Suggested table: `device_commands`

Columns:

- `id` (pk)
- `device_id` (int)
- `command` (`feed|pump_on|pump_off`)
- `issued_by` (user/system id)
- `issued_at` (server timestamp)
- `status` (`sent|acked|failed`) if your system supports delivery status

### 4.4 `device/<deviceId>/set/<parameter>` -> config history + current config

Store both latest config and history.

Suggested tables:

- `device_config_current`
- `device_config_history`

`device_config_current` key:

- (`device_id`, `config_key`)

`config_key` values:

- `temp_min`
- `temp_max`
- `tds_min`
- `tds_max`
- `water_level`
- `water_stop`

## 5. Parsing Rules for Backend Consumer

1. Split topic by `/`.
2. Route by first segment:
   - `sensor` -> parse `{ value, time }`
   - `alert` -> parse `{ alert, value }`
   - `device` -> command/config channels
3. Convert `deviceId` to integer.
4. Validate payload type before DB write.
5. Reject or quarantine malformed payloads with logging.

## 6. Example End-to-End Messages

Sensor reading:

- Topic: `sensor/100/tds`
- Payload:

```json
{
  "value": 410.3,
  "time": "2026-04-24 10:20:05"
}
```

Alert message:

- Topic: `alert/100/temperature`
- Payload:

```json
{
  "alert": "HIGH",
  "value": 31.4
}
```

Threshold update command:

- Topic: `device/100/set/temp_max`
- Payload: `"28.0"`

Actuator command:

- Topic: `device/100/command`
- Payload: `"feed"`

## 7. Device Range Convention

Current team convention can use `100-200` as device ID range for easier debugging and environment separation.


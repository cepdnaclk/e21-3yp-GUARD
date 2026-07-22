#include "time.h"
#include <esp_task_wdt.h>
#include <Adafruit_NeoPixel.h>
#include <DallasTemperature.h>
#include <ESP32Servo.h>
#include <OneWire.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <WiFiUdp.h>

// 🟢 Include your hidden passwords and public cert
#include "cert.h"
#include "secrets.h"

// ---------------- Pins & Constants ----------------
#define RESET_BUTTON 0
#define RESET_DURATION 3000
#define ONE_WIRE_BUS 4
#define RGB_LED_PIN 48
#define NUMPIXELS 1
const int servoPin = 13;
const int pumpInPin = 9;
const int pumpOutPin = 10;
#define TRIGGER_PIN 5
#define ECHO_PIN 15

#define TDS_PIN 12
#define TDS_POWER_PIN 14
#define PH_PIN 7
#define TURBIDITY_PIN 6
#define VREF 3.3
#define ADC_RESOLUTION 4095

// ---------------- pH Calibration Table ------------
const int PH_NUM_POINTS = 3;
float phCalTable[PH_NUM_POINTS][2] = {
    {2.1131, 9.80}, {2.604, 7.06}, {3.0920, 4.28}};
#define PH_EMA_ALPHA 0.08f
float ph_filtered_voltage = 0.0f;
bool ph_first_reading = true;

// ---------------- Network Config ------------------
const char *mqtt_server = SECRET_MQTT_SERVER;
const int mqtt_port = SECRET_MQTT_PORT;
const char *mqtt_user = SECRET_MQTT_USER;
const char *mqtt_password = SECRET_MQTT_PASS;

// ---------------- Objects -------------------------
Adafruit_NeoPixel pixels(NUMPIXELS, RGB_LED_PIN, NEO_GRB + NEO_KHZ800);
Preferences preferences;
Servo myServo;
WiFiClientSecure espClient;
PubSubClient client(espClient);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ---------------- State & Shared Variables -----------------
// Volatile Thresholds (written by Core 0 via MQTT, read by Core 1)
volatile float tempMin = 24.0;
volatile float tempMax = 28.0;
volatile float tdsMin = 70.0;
volatile float tdsMax = 500.0;
volatile float phMin = 6.0;
volatile float phMax = 8.5;
volatile float turbMin = 0.0;
volatile float turbMax = 50.0;
volatile float waterLevelThreshold = 5.0;
volatile float waterLevelStopThreshold = 4.0;

// Volatile Sensor Readings (written by Core 1, read by Core 0)
volatile float sharedTemp = 25.0f;
volatile float sharedWaterDistance = -1.0f;
volatile float sharedTds = 0.0f;
volatile float sharedPh = 7.0f;
volatile float sharedTurbidity = 0.0f;

// Volatile Sensor Fault Flags (written by Core 1, read by Core 0)
volatile bool tempFault = false;
volatile bool waterFault = false;
volatile bool tdsFault = false;
volatile bool phFault = false;
volatile bool turbFault = false;

// Volatile Alert Flags (written by Core 1, read by Core 0)
volatile bool tempAlert = false;
volatile bool waterAlert = false;
volatile bool tdsAlert = false;
volatile bool phAlert = false;
volatile bool turbAlert = false;
volatile bool sharedHasValidWater = false;

// Volatile Command Flags (written by Core 0, read & cleared by Core 1)
volatile bool commandFeedRequested = false;
volatile bool commandManualPumpMode = false;
volatile bool commandPumpInState = false;
volatile bool commandPumpOutState = false;

// Volatile Hardware States (written by Core 1, read by Core 0)
volatile bool fillPumpOn = false;
volatile bool drainPumpOn = false;
volatile bool servoActive = false;

unsigned long servoStartTime = 0;
const unsigned long SERVO_RUN_TIME = 3000;

// ⏱️ TIMING INTERVALS
const unsigned long POLL_INTERVAL = 2000;
const unsigned long PUBLISH_INTERVAL = 10000;

// ⏱️ TIMING TRACKERS (Core 1 local)
unsigned long lastTempRead = 0;
unsigned long lastWaterRead = 0;
unsigned long lastTdsRead = 0;
unsigned long lastPhRead = 0;
unsigned long lastTurbRead = 0;

// Network status trackers (Core 0 local/global)
unsigned long lastReconnectAttempt = 0;
unsigned long mqttReconnectInterval = 5000;
unsigned long lastWiFiReconnectAttempt = 0;
unsigned long pressStart = 0;

// 🚦 LOCAL DEMAND FLAGS (Core 1 local)
bool tempPumpDemand = false;
bool tdsPumpDemand = false;
bool phPumpDemand = false;
bool turbPumpDemand = false;

String DeviceID = "GUARD-300";
String clientID = "ESP32_" + String(DeviceID);

// Task handles and prototypes
TaskHandle_t NetworkTaskHandle = NULL;
void networkTask(void *pvParameters);

// ---------------- pH Helper Function ---------------
float getMultiPointPH(float voltage) {
  if (voltage <= phCalTable[0][0])
    return phCalTable[0][1];
  if (voltage >= phCalTable[PH_NUM_POINTS - 1][0])
    return phCalTable[PH_NUM_POINTS - 1][1];
  for (int i = 0; i < PH_NUM_POINTS - 1; i++) {
    float v0 = phCalTable[i][0], pH0 = phCalTable[i][1];
    float v1 = phCalTable[i + 1][0], pH1 = phCalTable[i + 1][1];
    if (voltage >= v0 && voltage <= v1)
      return pH0 + (voltage - v0) * (pH1 - pH0) / (v1 - v0);
  }
  return 7.0f;
}

// ---------------- Helper Functions ----------------
String buildTopic(String parameter) {
  return "sensor/" + String(DeviceID) + "/" + parameter;
}
String commandTopic() { return "device/" + String(DeviceID) + "/command"; }
String setThresholdTopic(String parameter) {
  return "device/" + String(DeviceID) + "/set/" + parameter;
}

void validateWaterThresholds() {
  if (waterLevelStopThreshold >= waterLevelThreshold) {
    waterLevelStopThreshold = waterLevelThreshold - 0.5f;
  }
  if (waterLevelStopThreshold < 0.1f) {
    waterLevelStopThreshold = 0.1f;
  }
}

void setPumpStates(bool fillOn, bool drainOn, const String &source) {
  if (fillPumpOn == fillOn && drainPumpOn == drainOn) {
    return;
  }
  digitalWrite(pumpInPin, fillOn ? LOW : HIGH);
  digitalWrite(pumpOutPin, drainOn ? LOW : HIGH);
  fillPumpOn = fillOn;
  drainPumpOn = drainOn;
  Serial.println("[PUMPS] " + source +
                 " -> IN:" + String(fillOn ? "ON" : "OFF") +
                 " OUT:" + String(drainOn ? "ON" : "OFF"));
}

void applyPumpControl() {
  if (commandManualPumpMode) return; // Bypassed in manual override

  bool desiredFillOn = false;
  bool desiredDrainOn = false;

  // Interlock: Only request pump cycling if the sensor is healthy
  bool qualityDemand =
      (!tempFault && tempPumpDemand) ||
      (!tdsFault && tdsPumpDemand) ||
      (!phFault && phPumpDemand) ||
      (!turbFault && turbPumpDemand);

  if (sharedHasValidWater && !waterFault) {
    if (sharedWaterDistance <= waterLevelStopThreshold) {
      desiredFillOn = false;
      desiredDrainOn = true;
    } else if (sharedWaterDistance >= waterLevelThreshold) {
      desiredFillOn = true;
      desiredDrainOn = false;
    } else if (qualityDemand) {
      desiredFillOn = true;
      desiredDrainOn = true;
    }
  } else if (qualityDemand) {
    desiredFillOn = true;
    desiredDrainOn = true;
  }

  setPumpStates(desiredFillOn, desiredDrainOn, "AUTO");
}

float readWaterDistanceCm() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0)
    return -1.0f;
  return (duration * 0.0343f) / 2.0f;
}

void publishSensor(String parameter, float value) {
  String topic = buildTopic(parameter);
  struct tm timeinfo;
  char buf[25];
  if (!getLocalTime(&timeinfo))
    strcpy(buf, "2026-04-23 00:00:00");
  else
    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);

  String payload =
      "{\"value\":" + String(value) + ",\"time\":\"" + String(buf) + "\"}";
  client.publish(topic.c_str(), payload.c_str(), true);
  Serial.println("[MQTT] Sent: " + payload);
}

void publishAlert(String parameter, String alertType, float value) {
  String topic = "alert/" + String(DeviceID) + "/" + parameter;
  String payload =
      "{\"alert\":\"" + alertType + "\",\"value\":" + String(value) + "}";
  client.publish(topic.c_str(), payload.c_str(), true);
  Serial.println("🚨 [ALERT PUBLISHED] " + parameter + " is " + alertType +
                 "! Value: " + String(value));
}

// ---------------- MQTT Callback ------------------
void callback(char *topic, byte *payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++)
    message += (char)payload[i];
  String topicStr = String(topic);

  if (topicStr == setThresholdTopic("water_level")) {
    waterLevelThreshold = message.toFloat();
    validateWaterThresholds();
    preferences.begin("settings", false);
    preferences.putFloat("w_level", waterLevelThreshold);
    preferences.putFloat("w_stop", waterLevelStopThreshold);
    preferences.end();
    Serial.println(
        "[CONFIG] Water Level updated: " + String(waterLevelThreshold) +
        ", Stop: " + String(waterLevelStopThreshold));
  } else if (topicStr == setThresholdTopic("water_stop")) {
    waterLevelStopThreshold = message.toFloat();
    validateWaterThresholds();
    preferences.begin("settings", false);
    preferences.putFloat("w_stop", waterLevelStopThreshold);
    preferences.end();
    Serial.println("[CONFIG] Water Stop updated: " +
                   String(waterLevelStopThreshold));
  } else if (topicStr == setThresholdTopic("temp_min")) {
    tempMin = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("temp_min", tempMin);
    preferences.end();
    Serial.println("[CONFIG] Min Temp updated: " + String(tempMin));
  } else if (topicStr == setThresholdTopic("temp_max")) {
    tempMax = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("temp_max", tempMax);
    preferences.end();
    Serial.println("[CONFIG] Max Temp updated: " + String(tempMax));
  } else if (topicStr == setThresholdTopic("tds_min")) {
    tdsMin = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("tds_min", tdsMin);
    preferences.end();
    Serial.println("[CONFIG] Min TDS updated: " + String(tdsMin));
  } else if (topicStr == setThresholdTopic("tds_max")) {
    tdsMax = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("tds_max", tdsMax);
    preferences.end();
    Serial.println("[CONFIG] Max TDS updated: " + String(tdsMax));
  } else if (topicStr == setThresholdTopic("ph_min")) {
    phMin = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("ph_min", phMin);
    preferences.end();
    Serial.println("[CONFIG] Min pH updated: " + String(phMin));
  } else if (topicStr == setThresholdTopic("ph_max")) {
    phMax = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("ph_max", phMax);
    preferences.end();
    Serial.println("[CONFIG] Max pH updated: " + String(phMax));
  } else if (topicStr == setThresholdTopic("turb_min")) {
    turbMin = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("turb_min", turbMin);
    preferences.end();
    Serial.println("[CONFIG] Min Turbidity updated: " + String(turbMin));
  } else if (topicStr == setThresholdTopic("turb_max")) {
    turbMax = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("turb_max", turbMax);
    preferences.end();
    Serial.println("[CONFIG] Max Turbidity updated: " + String(turbMax));
  } else if (message == "feed") {
    if (!servoActive) {
      commandFeedRequested = true;
    }
  } else if (message == "pump_on") {
    commandManualPumpMode = true;
    commandPumpInState = true;
    commandPumpOutState = true;
  } else if (message == "pump_off") {
    commandManualPumpMode = true;
    commandPumpInState = false;
    commandPumpOutState = false;
  } else if (message == "pump_auto") {
    commandManualPumpMode = false;
    Serial.println("[PUMPS] Restored to AUTOMATIC mode");
  }
}

boolean reconnect() {
  Serial.print("[MQTT] Attempting secure connection...");
  String statusTopic = "device/" + String(DeviceID) + "/status";
  
  if (client.connect(
      clientID.c_str(),
      mqtt_user,
      mqtt_password,
      statusTopic.c_str(), // Will Topic
      1,                   // Will QoS (QoS 1)
      true,                // Will Retain
      "offline"            // Will Message
  )) {
    Serial.println("connected!");
    // Publish online status immediately (retained)
    client.publish(statusTopic.c_str(), "online", true);
    
    client.subscribe(commandTopic().c_str());
    client.subscribe(setThresholdTopic("water_level").c_str());
    client.subscribe(setThresholdTopic("water_stop").c_str());
    client.subscribe(setThresholdTopic("temp_min").c_str());
    client.subscribe(setThresholdTopic("temp_max").c_str());
    client.subscribe(setThresholdTopic("tds_min").c_str());
    client.subscribe(setThresholdTopic("tds_max").c_str());
    client.subscribe(setThresholdTopic("ph_min").c_str());
    client.subscribe(setThresholdTopic("ph_max").c_str());
    client.subscribe(setThresholdTopic("turb_min").c_str());
    client.subscribe(setThresholdTopic("turb_max").c_str());
    return true;
  }
  Serial.print("failed, rc=");
  Serial.println(client.state());
  return false;
}

// ---------------- Setup ---------------------------
void setup() {
  Serial.begin(115200);

  pixels.begin();
  pixels.setBrightness(50);
  pixels.clear();
  pixels.show();

  pinMode(RESET_BUTTON, INPUT_PULLUP);
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(pumpInPin, OUTPUT);
  pinMode(pumpOutPin, OUTPUT);
  digitalWrite(pumpInPin, HIGH);
  digitalWrite(pumpOutPin, HIGH);
  fillPumpOn = false;
  drainPumpOn = false;
  pinMode(TDS_PIN, INPUT);
  pinMode(TDS_POWER_PIN, OUTPUT);
  digitalWrite(TDS_POWER_PIN, LOW); // Start with TDS powered off
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);

  preferences.begin("settings", true);
  waterLevelThreshold = preferences.getFloat("w_level", 5.0);
  waterLevelStopThreshold = preferences.getFloat("w_stop", 4.0);
  tempMin = preferences.getFloat("temp_min", 24.0);
  tempMax = preferences.getFloat("temp_max", 28.0);
  tdsMin = preferences.getFloat("tds_min", 70.0);
  tdsMax = preferences.getFloat("tds_max", 500.0);
  phMin = preferences.getFloat("ph_min", 6.0);
  phMax = preferences.getFloat("ph_max", 8.5);
  turbMin = preferences.getFloat("turb_min", 0.0);
  turbMax = preferences.getFloat("turb_max", 50.0);
  preferences.end();
  validateWaterThresholds();

  sensors.begin();

  // ⚙️ SERVO SETUP (on Core 1)
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  myServo.setPeriodHertz(50);
  myServo.attach(servoPin, 500, 2400);
  myServo.write(90); // Start stopped
  Serial.println("[SERVO] Attached and ready");

  // 🐾 Initialize Watchdog Timer (8 seconds timeout)
  esp_task_wdt_init(8, true); // Panic on timeout
  esp_task_wdt_add(NULL);     // Register Core 1 main loop

  // 🌐 Spin up background network task on Core 0
  xTaskCreatePinnedToCore(
    networkTask,
    "NetworkTask",
    8192,
    NULL,
    1,
    &NetworkTaskHandle,
    0
  );
  Serial.println("[SYSTEM] Dual-core tasks initialized.");
}

// ---------------- Main Loop -----------------------
void loop() {
  unsigned long now = millis();

  // 🐾 1. Feed the Core 1 Watchdog Timer
  esp_task_wdt_reset();

  // ⚙️ 2. SERVO: Asynchronous Non-blocking feeding
  if (commandFeedRequested && !servoActive) {
    servoActive = true;
    commandFeedRequested = false; // Clear request flag
    servoStartTime = millis();
    myServo.write(180); // Start spin
    Serial.println("[SERVO] Asynchronous Feed started — spinning for 3 seconds");
  }

  if (servoActive && (millis() - servoStartTime >= 3000)) {
    myServo.write(90);  // Stop spin
    servoActive = false;
    Serial.println("[SERVO] Asynchronous Feed complete");
  }

  // 🔄 3. Process Pump Controls (Manual Override or Automatic Rules)
  if (commandManualPumpMode) {
    setPumpStates(commandPumpInState, commandPumpOutState, "MANUAL");
  } else {
    applyPumpControl();
  }

  // 🌡️ TEMPERATURE SENSOR (Fast Poll & Edge Detect)
  if (now - lastTempRead > POLL_INTERVAL) {
    lastTempRead = now;
    sensors.requestTemperatures();
    float currentTemp = sensors.getTempCByIndex(0);

    if (currentTemp == DEVICE_DISCONNECTED_C) {
      tempFault = true;
      tempAlert = false;
      tempPumpDemand = false;
      Serial.println("🚨 [FAULT] Temperature sensor probe disconnected!");
    } else {
      tempFault = false;
      sharedTemp = currentTemp;

      bool isAlertNow = false;
      if (currentTemp < tempMin) {
        isAlertNow = true;
      } else if (currentTemp > tempMax) {
        isAlertNow = true;
      }

      tempAlert = isAlertNow;
      tempPumpDemand = isAlertNow;
    }
    if (!commandManualPumpMode) applyPumpControl();
  }

  // 🌊 WATER LEVEL SENSOR (Fast Poll & Edge Detect)
  if (now - lastWaterRead > POLL_INTERVAL) {
    lastWaterRead = now;
    float currentDist = readWaterDistanceCm();

    if (currentDist <= 0) {
      waterFault = true;
      sharedHasValidWater = false;
      waterAlert = false;
      Serial.println("🚨 [FAULT] Water Level Sensor returned invalid value!");
    } else {
      waterFault = false;
      sharedWaterDistance = currentDist;
      sharedHasValidWater = true;

      bool isAlertNow = false;
      if (currentDist >= waterLevelThreshold) {
        isAlertNow = true;
      } else if (currentDist <= waterLevelStopThreshold) {
        isAlertNow = true;
      }

      waterAlert = isAlertNow;
    }
    if (!commandManualPumpMode) applyPumpControl();
  }

  // 🧪 TDS SENSOR (Fast Poll & Edge Detect)
  if (now - lastTdsRead > POLL_INTERVAL) {
    lastTdsRead = now;

    // Power on the TDS sensor and allow it to stabilize
    digitalWrite(TDS_POWER_PIN, HIGH);
    delay(100);

    float rawAdc = 0;
    for (int i = 0; i < 10; i++) {
      rawAdc += analogRead(TDS_PIN);
      delay(10);
    }
    rawAdc = rawAdc / 10.0;

    // Power off the TDS sensor immediately
    digitalWrite(TDS_POWER_PIN, LOW);

    if (rawAdc <= 5.0f || rawAdc >= 4090.0f) {
      tdsFault = true;
      tdsAlert = false;
      tdsPumpDemand = false;
      Serial.println("🚨 [FAULT] TDS Sensor returned out-of-bounds ADC reading!");
    } else {
      tdsFault = false;

      float voltage = rawAdc * (VREF / ADC_RESOLUTION);

      sensors.requestTemperatures();
      float tempC = sensors.getTempCByIndex(0);
      if (tempC == DEVICE_DISCONNECTED_C)
        tempC = 25.0;

      float compensationCoefficient = 1.0 + 0.02 * (tempC - 25.0);
      float compensationVoltage = voltage / compensationCoefficient;
      float tdsValue =
          (133.42 * pow(compensationVoltage, 3) -
           255.86 * pow(compensationVoltage, 2) + 857.39 * compensationVoltage) *
          0.5;

      if (tdsValue < 0)
        tdsValue = 0;

      sharedTds = tdsValue;

      bool isAlertNow = false;
      if (tdsValue < tdsMin) {
        isAlertNow = true;
      } else if (tdsValue > tdsMax) {
        isAlertNow = true;
      }

      tdsAlert = isAlertNow;
      tdsPumpDemand = isAlertNow;
    }
    if (!commandManualPumpMode) applyPumpControl();
  }

  // 🧪 pH SENSOR (Oversampled + EMA Filtered + Edge Detect)
  if (now - lastPhRead > POLL_INTERVAL) {
    lastPhRead = now;

    // 1. Oversample: 20 readings
    int phBuf[20];
    for (int i = 0; i < 20; i++) {
      phBuf[i] = analogRead(PH_PIN);
      delay(20);
    }

    // 2. Bubble sort ascending
    for (int i = 0; i < 19; i++) {
      for (int j = i + 1; j < 20; j++) {
        if (phBuf[i] > phBuf[j]) {
          int t = phBuf[i];
          phBuf[i] = phBuf[j];
          phBuf[j] = t;
        }
      }
    }

    // 3. Average middle 10 — rejects top/bottom 5 outliers
    long phSum = 0;
    for (int i = 5; i < 15; i++)
      phSum += phBuf[i];
    float avgADC = phSum / 10.0f;

    if (avgADC <= 5.0f || avgADC >= 4090.0f) {
      phFault = true;
      phAlert = false;
      phPumpDemand = false;
      Serial.println("🚨 [FAULT] pH Sensor returned out-of-bounds ADC reading!");
    } else {
      phFault = false;

      float ph_raw_voltage = avgADC * (VREF / (float)ADC_RESOLUTION);

      // 4. EMA low-pass filter
      if (ph_first_reading) {
        ph_filtered_voltage = ph_raw_voltage;
        ph_first_reading = false;
      } else {
        ph_filtered_voltage = (PH_EMA_ALPHA * ph_raw_voltage) +
                              ((1.0f - PH_EMA_ALPHA) * ph_filtered_voltage);
      }

      // 5. Convert filtered voltage to pH
      float phValue = getMultiPointPH(ph_filtered_voltage);
      phValue = constrain(phValue, 0.0f, 14.0f);

      sharedPh = phValue;

      bool isAlertNow = false;
      if (phValue < phMin) {
        isAlertNow = true;
      } else if (phValue > phMax) {
        isAlertNow = true;
      }

      phAlert = isAlertNow;
      phPumpDemand = isAlertNow;
    }
    if (!commandManualPumpMode) applyPumpControl();
  }

  // 🌫️ TURBIDITY SENSOR (800-Sample Average + Edge Detect)
  if (now - lastTurbRead > POLL_INTERVAL) {
    lastTurbRead = now;

    // 1. Average 800 samples for stable reading
    long turbSum = 0;
    for (int i = 0; i < 800; i++) {
      turbSum += analogRead(TURBIDITY_PIN);
    }
    float avgADC = turbSum / 800.0f;

    if (avgADC <= 5.0f) {
      turbFault = true;
      turbAlert = false;
      turbPumpDemand = false;
      Serial.println("🚨 [FAULT] Turbidity Sensor returned 0 ADC!");
    } else {
      turbFault = false;

      // 2. Convert ADC to voltage (ESP32: 3.3V / 12-bit)
      float turbVoltage = avgADC * (VREF / (float)ADC_RESOLUTION);

      // 3. Calibration mapping
      float turbVoltage5V = 2.5f + (avgADC / 2900.0f) * (4.2f - 2.5f);

      if (turbVoltage5V > 4.2f)
        turbVoltage5V = 4.2f;
      if (turbVoltage5V < 2.5f)
        turbVoltage5V = 2.5f;

      float turbNTU;
      if (turbVoltage5V >= 4.2f) {
        turbNTU = 0.0f;
      } else {
        turbNTU = -1120.4f * (turbVoltage5V * turbVoltage5V) +
                  5742.3f * turbVoltage5V - 4352.9f;
        if (turbNTU < 0.0f)
          turbNTU = 0.0f;
      }

      if (turbNTU >= 1800.0f) {
        turbNTU = (turbNTU - 1800.0f) * (3000.0f / (3000.0f - 1800.0f));
      } else {
        turbNTU = 0.0f;
      }
      if (turbNTU > 3000.0f) {
        turbNTU = 3000.0f;
      }

      sharedTurbidity = turbNTU;

      bool isAlertNow = false;
      if (turbNTU < turbMin) {
        isAlertNow = true;
      } else if (turbNTU > turbMax) {
        isAlertNow = true;
      }

      turbAlert = isAlertNow;
      turbPumpDemand = isAlertNow;
    }
    if (!commandManualPumpMode) applyPumpControl();
  }

  // 🚦 UNIFIED MASTER LED LOGIC (Color-Coded Priority System)
  if (WiFi.status() != WL_CONNECTED || !client.connected()) {
    // 1. NETWORK ERROR (Wi-Fi or MQTT disconnected)
    pixels.setPixelColor(0, pixels.Color(255, 255, 0)); // 🟡 YELLOW
  } else if (tempFault || waterFault || tdsFault || phFault || turbFault) {
    // 1.5 SENSOR FAULT INDICATOR
    pixels.setPixelColor(0, pixels.Color(255, 255, 255)); // ⚪ WHITE
  } else if (waterAlert) {
    // 2. WATER LEVEL ERROR
    pixels.setPixelColor(0, pixels.Color(255, 0, 0)); // 🔴 RED
  } else if (tempAlert) {
    // 3. TEMPERATURE ERROR
    pixels.setPixelColor(0, pixels.Color(255, 0, 255)); // 🟣 PURPLE
  } else if (tdsAlert) {
    // 4. TDS / QUALITY ERROR
    pixels.setPixelColor(0, pixels.Color(0, 0, 255)); // 🔵 BLUE
  } else if (phAlert) {
    // 5. pH LEVEL ERROR
    pixels.setPixelColor(0, pixels.Color(255, 165, 0)); // 🟠 ORANGE
  } else if (turbAlert) {
    // 6. TURBIDITY ERROR
    pixels.setPixelColor(0, pixels.Color(0, 255, 255)); // 🩵 CYAN
  } else {
    // 7. SYSTEM NORMAL
    pixels.setPixelColor(0, pixels.Color(0, 255, 0)); // 🟢 GREEN
  }

  pixels.show();

  // 🔄 Hardware Reset Button
  if (digitalRead(RESET_BUTTON) == LOW) {
    if (pressStart == 0)
      pressStart = millis();
    if (millis() - pressStart >= RESET_DURATION) {
      WiFiManager wm;
      wm.resetSettings();
      ESP.restart();
    }
  } else {
    pressStart = 0;
  }
}

// ---------------- Background Network Task (Core 0) ----------------
void networkTask(void *pvParameters) {
  // Add this task to Watchdog Timer (WDT)
  esp_task_wdt_add(NULL);

  WiFi.disconnect(true, true);
  vTaskDelay(pdMS_TO_TICKS(100));
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  WiFi.setAutoReconnect(true);

  // De-register WDT while blocking in the Config Portal
  esp_task_wdt_delete(NULL);

  WiFiManager wm;
  wm.setConfigPortalTimeout(30); // 30 seconds config portal timeout
  wm.autoConnect(("ESP32_GUARD_" + String(DeviceID)).c_str());

  // Re-register to WDT after portal returns
  esp_task_wdt_add(NULL);

  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("[NetworkTask] Syncing Time");
  unsigned long startMs = millis();
  while (time(nullptr) < 1000000 && millis() - startMs < 10000) {
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(500));
    Serial.print(".");
  }
  if (time(nullptr) < 1000000) {
    Serial.println(" NTP Time sync timed out (operating offline).");
  } else {
    Serial.println(" Time sync complete.");
  }

  espClient.setCACert(root_ca);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  // Core 0 Local Timing Trackers
  unsigned long lastTempPubTime = 0;
  unsigned long lastWaterPubTime = 0;
  unsigned long lastTdsPubTime = 0;
  unsigned long lastPhPubTime = 0;
  unsigned long lastTurbPubTime = 0;
  unsigned long lastStatusPubTime = 0;

  // Local copy of alert states for edge-detection
  bool lastPubTempAlert = false;
  bool lastPubWaterAlert = false;
  bool lastPubTdsAlert = false;
  bool lastPubPhAlert = false;
  bool lastPubTurbAlert = false;

  while (true) {
    esp_task_wdt_reset(); // Feed Core 0 Watchdog

    unsigned long now = millis();

    // 1. WiFi Reconnect Manager
    if (WiFi.status() != WL_CONNECTED) {
      if (now - lastWiFiReconnectAttempt > 10000) {
        Serial.println("🌐 [NetworkTask] WiFi Disconnected! Reconnecting...");
        WiFi.disconnect();
        WiFi.reconnect();
        lastWiFiReconnectAttempt = now;
      }
    }
    // 2. MQTT Reconnect Manager
    else if (!client.connected()) {
      if (now - lastReconnectAttempt > mqttReconnectInterval) {
        lastReconnectAttempt = now;
        if (reconnect()) {
          lastReconnectAttempt = 0;
          mqttReconnectInterval = 5000;
        } else {
          mqttReconnectInterval = 30000;
        }
      }
    }
    // 3. MQTT Client Loop & Publishing
    else {
      client.loop();

      // Read values into local variables for consistency
      float tVal = sharedTemp;
      float wVal = sharedWaterDistance;
      float tdsVal = sharedTds;
      float phVal = sharedPh;
      float turbVal = sharedTurbidity;

      bool tAlert = tempAlert;
      bool wAlert = waterAlert;
      bool tdsAlertState = tdsAlert;
      bool phAlertState = phAlert;
      bool turbAlertState = turbAlert;

      // A. Temperature
      if (!tempFault) {
        if ((tAlert && !lastPubTempAlert) || (now - lastTempPubTime > PUBLISH_INTERVAL)) {
          publishSensor("temperature", tVal);
          lastTempPubTime = now;
          if (tAlert && !lastPubTempAlert) {
            publishAlert("temperature", tVal < tempMin ? "LOW" : "HIGH", tVal);
            lastPubTempAlert = true;
          }
        }
        if (!tAlert) {
          lastPubTempAlert = false;
        }
      }

      // B. Water Level
      if (!waterFault && sharedHasValidWater) {
        if ((wAlert && !lastPubWaterAlert) || (now - lastWaterPubTime > PUBLISH_INTERVAL)) {
          publishSensor("waterlevel", wVal);
          lastWaterPubTime = now;
          if (wAlert && !lastPubWaterAlert) {
            publishAlert("waterlevel", wVal >= waterLevelThreshold ? "LOW" : "HIGH", wVal);
            lastPubWaterAlert = true;
          }
        }
        if (!wAlert) {
          lastPubWaterAlert = false;
        }
      }

      // C. TDS
      if (!tdsFault) {
        if ((tdsAlertState && !lastPubTdsAlert) || (now - lastTdsPubTime > PUBLISH_INTERVAL)) {
          publishSensor("tds", tdsVal);
          lastTdsPubTime = now;
          if (tdsAlertState && !lastPubTdsAlert) {
            publishAlert("tds", tdsVal < tdsMin ? "LOW" : "HIGH", tdsVal);
            lastPubTdsAlert = true;
          }
        }
        if (!tdsAlertState) {
          lastPubTdsAlert = false;
        }
      }

      // D. pH
      if (!phFault) {
        if ((phAlertState && !lastPubPhAlert) || (now - lastPhPubTime > PUBLISH_INTERVAL)) {
          publishSensor("ph", phVal);
          lastPhPubTime = now;
          if (phAlertState && !lastPubPhAlert) {
            publishAlert("ph", phVal < phMin ? "LOW" : "HIGH", phVal);
            lastPubPhAlert = true;
          }
        }
        if (!phAlertState) {
          lastPubPhAlert = false;
        }
      }

      // E. Turbidity
      if (!turbFault) {
        if ((turbAlertState && !lastPubTurbAlert) || (now - lastTurbPubTime > PUBLISH_INTERVAL)) {
          publishSensor("turbidity", turbVal);
          lastTurbPubTime = now;
          if (turbAlertState && !lastPubTurbAlert) {
            publishAlert("turbidity", turbVal < turbMin ? "LOW" : "HIGH", turbVal);
            lastPubTurbAlert = true;
          }
        }
        if (!turbAlertState) {
          lastPubTurbAlert = false;
        }
      }

      // F. Health Status JSON publishing (Every 10 seconds)
      if (now - lastStatusPubTime > 10000) {
        lastStatusPubTime = now;
        String topic = "sensor/" + String(DeviceID) + "/status";
        String payload = "{\"temp_ok\":" + String(tempFault ? "false" : "true") +
                         ",\"water_ok\":" + String(waterFault ? "false" : "true") +
                         ",\"tds_ok\":" + String(tdsFault ? "false" : "true") +
                         ",\"ph_ok\":" + String(phFault ? "false" : "true") +
                         ",\"turb_ok\":" + String(turbFault ? "false" : "true") + "}";
        client.publish(topic.c_str(), payload.c_str(), true);
      }
    }

    // Yield control to FreeRTOS (approx 100ms sleep)
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}
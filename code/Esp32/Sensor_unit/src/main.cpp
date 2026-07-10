#include "time.h"
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

// ---------------- State Variables -----------------
float tempMin = 24.0;
float tempMax = 28.0;
float tdsMin = 70.0;
float tdsMax = 500.0;
float phMin = 6.0;
float phMax = 8.5;
float turbMin = 0.0;
float turbMax = 50.0;
float waterLevelThreshold = 5.0;
float waterLevelStopThreshold = 4.0;

bool servoActive = false;
unsigned long servoStartTime = 0;
const unsigned long SERVO_RUN_TIME = 3000;

// ⏱️ TIMING INTERVALS
const unsigned long POLL_INTERVAL = 2000;
const unsigned long PUBLISH_INTERVAL = 10000;

// ⏱️ TIMING TRACKERS
unsigned long lastTempRead = 0;
unsigned long lastWaterRead = 0;
unsigned long lastTdsRead = 0;
unsigned long lastPhRead = 0;
unsigned long lastTurbRead = 0;

unsigned long lastTempPub = 0;
unsigned long lastWaterPub = 0;
unsigned long lastTdsPub = 0;
unsigned long lastPhPub = 0;
unsigned long lastTurbPub = 0;

// 🟢 NEW: Split Reconnect Trackers
unsigned long lastReconnectAttempt = 0;     // For MQTT
unsigned long lastWiFiReconnectAttempt = 0; // For Wi-Fi
unsigned long pressStart = 0;

// 🚦 SYSTEM HEALTH FLAGS
bool tempAlert = false;
bool waterAlert = false;
bool tdsAlert = false;
bool phAlert = false;
bool turbAlert = false;

bool tempPumpDemand = false;
bool tdsPumpDemand = false;
bool phPumpDemand = false;
bool turbPumpDemand = false;
bool fillPumpOn = false;
bool drainPumpOn = false;
float lastWaterDistanceCm = -1.0f;
bool hasValidWaterDistance = false;

String DeviceID = "GUARD-300";
String clientID = "ESP32_" + String(DeviceID);

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
  bool desiredFillOn = false;
  bool desiredDrainOn = false;
  bool qualityDemand =
      tempPumpDemand || tdsPumpDemand || phPumpDemand || turbPumpDemand;

  if (hasValidWaterDistance) {
    if (lastWaterDistanceCm <= waterLevelStopThreshold) {
      desiredFillOn = false;
      desiredDrainOn = true;
    } else if (lastWaterDistanceCm >= waterLevelThreshold) {
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

void setManualPumpState(bool turnOn) {
  if (turnOn) {
    setPumpStates(true, true, "MANUAL");
  } else {
    setPumpStates(false, false, "MANUAL");
  }
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
  } else if (message == "feed" && !servoActive) {
    servoActive = true;
    Serial.println("[SERVO] Feed started — spinning for 3 seconds");
    delay(100);
    myServo.write(180); // Full speed
    delay(5000);        // Run for 3 seconds (same as test code)
    myServo.write(90);  // Stop
    servoActive = false;
    Serial.println("[SERVO] Feed complete");
  } else if (message == "pump_on") {
    setManualPumpState(true);
  } else if (message == "pump_off") {
    setManualPumpState(false);
  }
}

boolean reconnect() {
  Serial.print("[MQTT] Attempting secure connection...");
  if (client.connect(clientID.c_str(), mqtt_user, mqtt_password)) {
    Serial.println("connected!");
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

  // 🟢 WI-FI CONFIGURATION
  WiFi.disconnect(true, true);
  delay(100);

  WiFi.mode(WIFI_STA);

  // 🚨 THE FIX: Lower the radio power to prevent the brownout crash
  WiFi.setTxPower(WIFI_POWER_8_5dBm);

  WiFi.setAutoReconnect(true);

  WiFiManager wm;
  wm.autoConnect(("ESP32_GUARD_" + String(DeviceID)).c_str());
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Syncing Time");
  while (time(nullptr) < 1000000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Ready!");

  espClient.setCACert(root_ca);

  sensors.begin();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  // ⚙️ SERVO SETUP (must be AFTER WiFi to avoid timer conflicts)
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  myServo.setPeriodHertz(50);
  myServo.attach(servoPin, 500, 2400);
  myServo.write(90); // Start stopped
  Serial.println("[SERVO] Attached and ready");
}

// ---------------- Main Loop -----------------------
void loop() {
  unsigned long now = millis();

  // 🌐 1. ACTIVE WI-FI RECONNECT MANAGER
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWiFiReconnectAttempt > 10000) { // Check every 10 seconds
      Serial.println("🌐 [WIFI] Disconnected! Forcing radio reconnect...");
      WiFi.disconnect();
      WiFi.reconnect(); // Kick the radio
      lastWiFiReconnectAttempt = now;
    }
    // Notice there is NO return here! The loop continues so pumps stay alive.
  }
  // ☁️ 2. ACTIVE MQTT RECONNECT MANAGER (Only try if Wi-Fi is working)
  else if (!client.connected()) {
    if (now - lastReconnectAttempt > 5000) { // Check every 5 seconds
      lastReconnectAttempt = now;
      if (reconnect())
        lastReconnectAttempt = 0;
    }
  }
  // 📡 3. NORMAL MQTT LISTENER
  else {
    client.loop();
  }

  // ⚙️ SERVO: Now handled entirely in MQTT callback with delay(3000)

  // 🌡️ TEMPERATURE SENSOR (Fast Poll & Edge Detect)
  if (now - lastTempRead > POLL_INTERVAL) {
    lastTempRead = now;
    sensors.requestTemperatures();
    float currentTemp = sensors.getTempCByIndex(0);

    if (currentTemp != DEVICE_DISCONNECTED_C) {
      bool isAlertNow = false;
      String alertType = "";

      if (currentTemp < tempMin) {
        isAlertNow = true;
        alertType = "LOW";
      } else if (currentTemp > tempMax) {
        isAlertNow = true;
        alertType = "HIGH";
      }

      if ((isAlertNow && !tempAlert) ||
          (now - lastTempPub > PUBLISH_INTERVAL)) {
        if (client.connected())
          publishSensor("temperature", currentTemp);
        lastTempPub = now;

        if (isAlertNow && !tempAlert) {
          if (client.connected())
            publishAlert("temperature", alertType, currentTemp);
        }
      }

      tempAlert = isAlertNow;
      tempPumpDemand = isAlertNow;
      applyPumpControl();
    }
  }

  // 🌊 WATER LEVEL SENSOR (Fast Poll & Edge Detect)
  if (now - lastWaterRead > POLL_INTERVAL) {
    lastWaterRead = now;
    float currentDist = readWaterDistanceCm();

    if (currentDist > 0) {
      lastWaterDistanceCm = currentDist;
      hasValidWaterDistance = true;

      bool isAlertNow = false;
      String alertType = "";

      if (currentDist >= waterLevelThreshold) {
        isAlertNow = true;
        alertType = "LOW";
      } else if (currentDist <= waterLevelStopThreshold) {
        isAlertNow = true;
        alertType = "HIGH";
      }

      if ((isAlertNow && !waterAlert) ||
          (now - lastWaterPub > PUBLISH_INTERVAL)) {
        if (client.connected())
          publishSensor("waterlevel", currentDist);
        lastWaterPub = now;

        if (isAlertNow && !waterAlert) {
          if (client.connected())
            publishAlert("waterlevel", alertType, currentDist);
        }
      }

      waterAlert = isAlertNow;
      applyPumpControl();
    }
  }

  // 🧪 TDS SENSOR (Fast Poll & Edge Detect)
  if (now - lastTdsRead > POLL_INTERVAL) {
    lastTdsRead = now;

    float rawAdc = 0;
    for (int i = 0; i < 10; i++) {
      rawAdc += analogRead(TDS_PIN);
      delay(10);
    }
    rawAdc = rawAdc / 10.0;

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

    bool isAlertNow = false;
    String alertType = "";

    if (tdsValue < tdsMin) {
      isAlertNow = true;
      alertType = "LOW";
    } else if (tdsValue > tdsMax) {
      isAlertNow = true;
      alertType = "HIGH";
    }

    if ((isAlertNow && !tdsAlert) || (now - lastTdsPub > PUBLISH_INTERVAL)) {
      if (client.connected())
        publishSensor("tds", tdsValue);
      lastTdsPub = now;

      if (isAlertNow && !tdsAlert) {
        if (client.connected())
          publishAlert("tds", alertType, tdsValue);
      }
    }

    tdsAlert = isAlertNow;
    tdsPumpDemand = isAlertNow;
    applyPumpControl();
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
    float ph_raw_voltage = (phSum / 10.0f) * (VREF / (float)ADC_RESOLUTION);

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

    bool isAlertNow = false;
    String alertType = "";

    if (phValue < phMin) {
      isAlertNow = true;
      alertType = "LOW";
    } else if (phValue > phMax) {
      isAlertNow = true;
      alertType = "HIGH";
    }

    if ((isAlertNow && !phAlert) || (now - lastPhPub > PUBLISH_INTERVAL)) {
      if (client.connected())
        publishSensor("ph", phValue);
      lastPhPub = now;

      if (isAlertNow && !phAlert) {
        if (client.connected())
          publishAlert("ph", alertType, phValue);
      }
    }

    phAlert = isAlertNow;
    phPumpDemand = isAlertNow;
    applyPumpControl();
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

    // 2. Convert ADC to voltage (ESP32: 3.3V / 12-bit)
    float turbVoltage = avgADC * (VREF / (float)ADC_RESOLUTION);

    // 3. Calibration mapping: Map the sensor's full range (0 to 2900 ADC)
    //    to the active range of the calibration curve (2.5V to 4.2V).
    //    This ensures 2900 ADC (pure water) maps to 4.2V (0 NTU)
    //    and 0 ADC (obstructed) maps to 2.5V (3000 NTU).
    float turbVoltage5V = 2.5f + (avgADC / 2900.0f) * (4.2f - 2.5f);

    // Constrain turbVoltage5V to the [2.5, 4.2] range to avoid out-of-bounds
    // formula behavior
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

    // Linearly map the calculated NTU (ranging from 1800 in pure water to 3000 in dirty water)
    // to the target [0, 3000] NTU range.
    if (turbNTU >= 1800.0f) {
      turbNTU = (turbNTU - 1800.0f) * (3000.0f / (3000.0f - 1800.0f));
    } else {
      turbNTU = 0.0f;
    }
    if (turbNTU > 3000.0f) {
      turbNTU = 3000.0f;
    }

    bool isAlertNow = false;
    String alertType = "";

    if (turbNTU < turbMin) {
      isAlertNow = true;
      alertType = "LOW";
    } else if (turbNTU > turbMax) {
      isAlertNow = true;
      alertType = "HIGH";
    }

    if ((isAlertNow && !turbAlert) || (now - lastTurbPub > PUBLISH_INTERVAL)) {
      if (client.connected())
        publishSensor("turbidity", turbNTU);
      lastTurbPub = now;

      if (isAlertNow && !turbAlert) {
        if (client.connected())
          publishAlert("turbidity", alertType, turbNTU);
      }
    }

    turbAlert = isAlertNow;
    turbPumpDemand = isAlertNow;
    applyPumpControl();
  }

  // 🚦 UNIFIED MASTER LED LOGIC
  // 🚦 UNIFIED MASTER LED LOGIC (Color-Coded Priority System)

  if (WiFi.status() != WL_CONNECTED || !client.connected()) {
    // 1. NETWORK ERROR (Wi-Fi or MQTT disconnected)
    pixels.setPixelColor(0, pixels.Color(255, 255, 0)); // 🟡 YELLOW
  } else if (waterAlert) {
    // 2. WATER LEVEL ERROR
    pixels.setPixelColor(0, pixels.Color(255, 0, 0)); // 🔴 RED
  } else if (tempAlert) {
    // 3. TEMPERATURE ERROR
    // Note: NeoPixel Purple/Magenta is 255 Red + 255 Blue
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

  pixels.show(); // Push the final selected color to the bulb

  // 🔄 Hardware Reset
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
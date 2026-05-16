#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h> 
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFiUdp.h>
#include "time.h"
#include <ESP32Servo.h> 
#include <Preferences.h>
#include <Adafruit_NeoPixel.h>

// 🟢 Include your hidden passwords and public cert
#include "secrets.h"
#include "cert.h"

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
#define VREF 3.3          
#define ADC_RESOLUTION 4095

// ---------------- Network Config ------------------
const char* mqtt_server = SECRET_MQTT_SERVER;
const int mqtt_port = SECRET_MQTT_PORT; 
const char* mqtt_user = SECRET_MQTT_USER;          
const char* mqtt_password = SECRET_MQTT_PASS; 

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

unsigned long lastTempPub = 0;
unsigned long lastWaterPub = 0;
unsigned long lastTdsPub = 0;

// 🟢 NEW: Split Reconnect Trackers
unsigned long lastReconnectAttempt = 0;      // For MQTT
unsigned long lastWiFiReconnectAttempt = 0;  // For Wi-Fi
unsigned long pressStart = 0;

// 🚦 SYSTEM HEALTH FLAGS
bool tempAlert = false;
bool waterAlert = false;
bool tdsAlert = false;

bool tempPumpDemand = false;
bool tdsPumpDemand = false;
bool fillPumpOn = false;
bool drainPumpOn = false;
float lastWaterDistanceCm = -1.0f;
bool hasValidWaterDistance = false;

String DeviceID = "GUARD-300"; 
String clientID = "ESP32_" + String(DeviceID);

// ---------------- Helper Functions ----------------
String buildTopic(String parameter) { return "sensor/" + String(DeviceID) + "/" + parameter; }
String commandTopic() { return "device/" + String(DeviceID) + "/command"; }
String setThresholdTopic(String parameter) { return "device/" + String(DeviceID) + "/set/" + parameter; }

void validateWaterThresholds() {
  if (waterLevelStopThreshold >= waterLevelThreshold) {
    waterLevelStopThreshold = waterLevelThreshold - 0.5f;
  }
  if (waterLevelStopThreshold < 0.1f) {
    waterLevelStopThreshold = 0.1f;
  }
}

void setPumpStates(bool fillOn, bool drainOn, const String& source) {
  if (fillPumpOn == fillOn && drainPumpOn == drainOn) {
    return;
  }
  digitalWrite(pumpInPin, fillOn ? LOW : HIGH);
  digitalWrite(pumpOutPin, drainOn ? LOW : HIGH);
  fillPumpOn = fillOn;
  drainPumpOn = drainOn;
  Serial.println("[PUMPS] " + source + " -> IN:" + String(fillOn ? "ON" : "OFF") + " OUT:" + String(drainOn ? "ON" : "OFF"));
}

void applyPumpControl() {
  bool desiredFillOn = false;
  bool desiredDrainOn = false;
  bool qualityDemand = tempPumpDemand || tdsPumpDemand;

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
  if (duration == 0) return -1.0f;
  return (duration * 0.0343f) / 2.0f;
}

void publishSensor(String parameter, float value) {
  String topic = buildTopic(parameter);
  struct tm timeinfo;
  char buf[25];
  if (!getLocalTime(&timeinfo)) strcpy(buf, "2026-04-23 00:00:00");
  else strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);
  
  String payload = "{\"value\":" + String(value) + ",\"time\":\"" + String(buf) + "\"}";
  client.publish(topic.c_str(), payload.c_str(), true);
  Serial.println("[MQTT] Sent: " + payload);
}

void publishAlert(String parameter, String alertType, float value) {
  String topic = "alert/" + String(DeviceID) + "/" + parameter; 
  String payload = "{\"alert\":\"" + alertType + "\",\"value\":" + String(value) + "}";
  client.publish(topic.c_str(), payload.c_str(), true);
  Serial.println("🚨 [ALERT PUBLISHED] " + parameter + " is " + alertType + "! Value: " + String(value));
}

// ---------------- MQTT Callback ------------------
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  String topicStr = String(topic);

  if (topicStr == setThresholdTopic("water_level")) {
    waterLevelThreshold = message.toFloat();
    validateWaterThresholds();
    preferences.begin("settings", false);
    preferences.putFloat("w_level", waterLevelThreshold);
    preferences.putFloat("w_stop", waterLevelStopThreshold);
    preferences.end();
    Serial.println("[CONFIG] Water Level updated: " + String(waterLevelThreshold) + ", Stop: " + String(waterLevelStopThreshold));
  }
  else if (topicStr == setThresholdTopic("water_stop")) {
    waterLevelStopThreshold = message.toFloat();
    validateWaterThresholds();
    preferences.begin("settings", false);
    preferences.putFloat("w_stop", waterLevelStopThreshold);
    preferences.end();
    Serial.println("[CONFIG] Water Stop updated: " + String(waterLevelStopThreshold));
  }
  else if (topicStr == setThresholdTopic("temp_min")) {
    tempMin = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("temp_min", tempMin);
    preferences.end();
    Serial.println("[CONFIG] Min Temp updated: " + String(tempMin));
  }
  else if (topicStr == setThresholdTopic("temp_max")) {
    tempMax = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("temp_max", tempMax);
    preferences.end();
    Serial.println("[CONFIG] Max Temp updated: " + String(tempMax));
  }
  else if (topicStr == setThresholdTopic("tds_min")) {
    tdsMin = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("tds_min", tdsMin);
    preferences.end();
    Serial.println("[CONFIG] Min TDS updated: " + String(tdsMin));
  }
  else if (topicStr == setThresholdTopic("tds_max")) {
    tdsMax = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("tds_max", tdsMax);
    preferences.end();
    Serial.println("[CONFIG] Max TDS updated: " + String(tdsMax));
  }
  else if (message == "feed" && !servoActive) {
    myServo.attach(servoPin, 500, 2400);
    myServo.write(180); 
    servoActive = true;
    servoStartTime = millis();
  } 
  else if (message == "pump_on") {
    setManualPumpState(true);
  }
  else if (message == "pump_off") {
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

  preferences.begin("settings", true);
  waterLevelThreshold = preferences.getFloat("w_level", 5.0);
  waterLevelStopThreshold = preferences.getFloat("w_stop", 4.0);
  tempMin = preferences.getFloat("temp_min", 24.0);
  tempMax = preferences.getFloat("temp_max", 28.0);
  tdsMin = preferences.getFloat("tds_min", 70.0);
  tdsMax = preferences.getFloat("tds_max", 500.0);
  preferences.end();
  validateWaterThresholds();

  ESP32PWM::allocateTimer(0);
  myServo.setPeriodHertz(50);

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
          if (reconnect()) lastReconnectAttempt = 0;
      }
  } 
  // 📡 3. NORMAL MQTT LISTENER
  else {
      client.loop();
  }

  // ⚙️ SERVO LOGIC
  if (servoActive && (now - servoStartTime >= SERVO_RUN_TIME)) {
    myServo.write(90); 
    delay(100);       
    myServo.detach();  
    servoActive = false;
  }

  // 🌡️ TEMPERATURE SENSOR (Fast Poll & Edge Detect)
  if (now - lastTempRead > POLL_INTERVAL) {
    lastTempRead = now;
    sensors.requestTemperatures();
    float currentTemp = sensors.getTempCByIndex(0);
    
    if(currentTemp != DEVICE_DISCONNECTED_C) {
      bool isAlertNow = false;
      String alertType = "";

      if (currentTemp < tempMin) {
          isAlertNow = true;
          alertType = "LOW";
      } else if (currentTemp > tempMax) {
          isAlertNow = true;
          alertType = "HIGH";
      }

      if ((isAlertNow && !tempAlert) || (now - lastTempPub > PUBLISH_INTERVAL)) {
          if (client.connected()) publishSensor("temperature", currentTemp);
          lastTempPub = now; 
          
          if (isAlertNow && !tempAlert) { 
              if (client.connected()) publishAlert("temperature", alertType, currentTemp);
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

      if ((isAlertNow && !waterAlert) || (now - lastWaterPub > PUBLISH_INTERVAL)) {
          if (client.connected()) publishSensor("waterlevel", currentDist);
          lastWaterPub = now;
          
          if (isAlertNow && !waterAlert) {
              if (client.connected()) publishAlert("waterlevel", alertType, currentDist);
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
    for(int i = 0; i < 10; i++) {
        rawAdc += analogRead(TDS_PIN);
        delay(10); 
    }
    rawAdc = rawAdc / 10.0;

    float voltage = rawAdc * (VREF / ADC_RESOLUTION);

    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);
    if (tempC == DEVICE_DISCONNECTED_C) tempC = 25.0;

    float compensationCoefficient = 1.0 + 0.02 * (tempC - 25.0);
    float compensationVoltage = voltage / compensationCoefficient;
    float tdsValue = (133.42 * pow(compensationVoltage, 3) - 255.86 * pow(compensationVoltage, 2) + 857.39 * compensationVoltage) * 0.5;

    if (tdsValue < 0) tdsValue = 0;

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
        if (client.connected()) publishSensor("tds", tdsValue);
        lastTdsPub = now;
        
        if (isAlertNow && !tdsAlert) {
            if (client.connected()) publishAlert("tds", alertType, tdsValue);
        }
    }

    tdsAlert = isAlertNow;
    tdsPumpDemand = isAlertNow;
    applyPumpControl();
  }

  // 🚦 UNIFIED MASTER LED LOGIC
  // 🚦 UNIFIED MASTER LED LOGIC (Color-Coded Priority System)
  
  if (WiFi.status() != WL_CONNECTED || !client.connected()) {
      // 1. NETWORK ERROR (Wi-Fi or MQTT disconnected)
      pixels.setPixelColor(0, pixels.Color(255, 255, 0)); // 🟡 YELLOW
  } 
  else if (waterAlert) {
      // 2. WATER LEVEL ERROR
      pixels.setPixelColor(0, pixels.Color(255, 0, 0));   // 🔴 RED
  } 
  else if (tempAlert) {
      // 3. TEMPERATURE ERROR
      // Note: NeoPixel Purple/Magenta is 255 Red + 255 Blue
      pixels.setPixelColor(0, pixels.Color(255, 0, 255)); // 🟣 PURPLE
  } 
  else if (tdsAlert) {
      // 4. TDS / QUALITY ERROR
      pixels.setPixelColor(0, pixels.Color(0, 0, 255));   // 🔵 BLUE
  } 
  else {
      // 5. SYSTEM NORMAL
      pixels.setPixelColor(0, pixels.Color(0, 255, 0));   // 🟢 GREEN
  }
  
  pixels.show(); // Push the final selected color to the bulb

  // 🔄 Hardware Reset
  if (digitalRead(RESET_BUTTON) == LOW) {
    if (pressStart == 0) pressStart = millis();
    if (millis() - pressStart >= RESET_DURATION) {
      WiFiManager wm;
      wm.resetSettings();
      ESP.restart();
    }
  } else { pressStart = 0; }
}
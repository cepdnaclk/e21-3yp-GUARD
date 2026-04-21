#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFiUdp.h>
#include "time.h"
#include <ESP32Servo.h> 

// ---------------- WiFi Reset -----------------------
#define RESET_BUTTON 0
#define RESET_DURATION 3000
unsigned long pressStart = 0;

// ---------------- Servo Setup ---------------------
Servo myServo;
const int servoPin = 13; // Updated to 13
bool servoActive = false;
unsigned long servoStartTime = 0;
const unsigned long SERVO_RUN_TIME = 3000; 

// ---------------- Pump Setup ---------------------
const int pumpPin = 18; // Updated to 18

// ---------------- Sensor & Timing -----------------
unsigned long lastTempTime = 0;
unsigned long lastReconnectAttempt = 0;
const unsigned long TEMP_INTERVAL = 10000; 

// ---------------- Device Data ---------------------
unsigned long DeviceID = 300;
String clientID = "ESP32_" + String(DeviceID);

const char* mqtt_server = "192.168.1.5";
const char* mqtt_user = "Admin";         
const char* mqtt_password = "B88vf9kp:}Xj"; 

// ---------------- DS18B20 Setup -------------------
#define ONE_WIRE_BUS 4 
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

void publishSensor(String parameter, float value);

// ---------------- MQTT Setup ----------------------
WiFiClient espClient;
PubSubClient client(espClient);

String buildTopic(String parameter) {
  return "sensor/" + String(DeviceID) + "/" + parameter;
}

String commandTopic() {
  return "device/" + String(DeviceID) + "/command";
}

boolean reconnect() {
  Serial.print("[MQTT] Attempting connection... ");
  if (client.connect(clientID.c_str(), mqtt_user, mqtt_password)) {
    Serial.println("CONNECTED");
    client.subscribe(commandTopic().c_str());
    return true;
  } else {
    Serial.print("FAILED, rc=");
    Serial.println(client.state());
    return false;
  }
}

// ---------------- MQTT Callback ------------------
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.println("[MQTT] Received: " + message);

  // ACTION: Feeding Motor
  if (message == "feed") {
    if (!servoActive) {
      Serial.println("[ACTION] Rotating servo...");
      myServo.attach(servoPin, 500, 2400);
      myServo.write(180); 
      servoActive = true;
      servoStartTime = millis();
    }
  } 
  // ACTION: Manual Temp Request
  else if (message == "temperature") {
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);
    if(tempC != DEVICE_DISCONNECTED_C) {
      publishSensor("temperature", tempC);
    }
  }
  // ACTION: Pump Control
  else if (message == "pump_on") {
    digitalWrite(pumpPin, HIGH);
    Serial.println("[ACTION] Pump ON");
  }
  else if (message == "pump_off") {
    digitalWrite(pumpPin, LOW);
    Serial.println("[ACTION] Pump OFF");
  }
}

// ---------------- NTP & Time ----------------------
void initTime() {
  configTime(19800, 0, "pool.ntp.org"); // GMT+5:30
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) Serial.println("[INFO] Time Synchronized.");
}

String getTimeStamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return "0000-00-00 00:00:00";
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(buf);
}

void publishSensor(String parameter, float value) {
  String topic = buildTopic(parameter);
  String payload = "{\"value\":" + String(value) + ",\"time\":\"" + getTimeStamp() + "\"}";
  client.publish(topic.c_str(), payload.c_str(), true);
  Serial.println("[MQTT] Data Sent: " + payload);
}

// ---------------- Setup ---------------------------
void setup() {
  Serial.begin(115200); 
  
  pinMode(RESET_BUTTON, INPUT_PULLUP);
  pinMode(pumpPin, OUTPUT);
  digitalWrite(pumpPin, LOW); // Start with pump off

  // ESP32 Specific Servo Timer Allocation
  ESP32PWM::allocateTimer(0);
  myServo.setPeriodHertz(50);

  WiFiManager wm;
  Serial.println("[SYSTEM] Starting WiFiManager...");
  wm.autoConnect(("ESP32_Setup" + String(DeviceID)).c_str());

  initTime();
  sensors.begin();
  
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

// ---------------- Main Loop -----------------------
void loop() {
  // 1. Keep MQTT Alive
  if (!client.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      if (reconnect()) lastReconnectAttempt = 0;
    }
  } else {
    client.loop();
  }

  // 2. Non-blocking Servo Logic
  if (servoActive) {
    if (millis() - servoStartTime >= SERVO_RUN_TIME) {
      myServo.write(90); // Stop signal
      delay(100);       
      myServo.detach();  // Detach to stop any buzzing/drifting
      servoActive = false;
      Serial.println("[SERVO] Cycle complete. Detached.");
    }
  }

  // 3. Periodic Sensor Readings
  unsigned long now = millis();
  if (now - lastTempTime > TEMP_INTERVAL) {
    lastTempTime = now;
    if (client.connected()) {
      sensors.requestTemperatures();
      float tempC = sensors.getTempCByIndex(0);
      if(tempC != DEVICE_DISCONNECTED_C) publishSensor("temperature", tempC);
    }
  }

  // 4. WiFi Settings Reset
  if (digitalRead(RESET_BUTTON) == LOW) {
    if (pressStart == 0) pressStart = millis();
    if (millis() - pressStart >= RESET_DURATION) {
      Serial.println("[SYSTEM] Resetting WiFi settings...");
      WiFiManager wm;
      wm.resetSettings();
      ESP.restart();
    }
  } else { pressStart = 0; }
}
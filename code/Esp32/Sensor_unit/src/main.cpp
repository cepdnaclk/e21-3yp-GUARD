#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFiUdp.h>
#include "time.h"
#include <ESP32Servo.h> 
#include <Preferences.h>
#include <Adafruit_NeoPixel.h> // Required for ESP32-S3 Onboard LED

// ---------------- Pins & Constants ----------------
#define RESET_BUTTON 0
#define RESET_DURATION 3000
#define ONE_WIRE_BUS 4 
#define RGB_LED_PIN 48   // Standard NeoPixel pin for ESP32-S3 DevKits
#define NUMPIXELS 1      // Most S3 boards have 1 onboard LED
const int servoPin = 13;
const int pumpPin = 18;

// ---------------- Objects -------------------------
Adafruit_NeoPixel pixels(NUMPIXELS, RGB_LED_PIN, NEO_GRB + NEO_KHZ800);
Preferences preferences;
Servo myServo;
WiFiClient espClient;
PubSubClient client(espClient);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ---------------- State Variables -----------------
float tempThreshold = 30.0; 
bool servoActive = false;
unsigned long servoStartTime = 0;
const unsigned long SERVO_RUN_TIME = 3000; 
unsigned long lastTempTime = 0;
unsigned long lastReconnectAttempt = 0;
const unsigned long TEMP_INTERVAL = 10000; 
unsigned long pressStart = 0;

unsigned long DeviceID = 100;
String clientID = "ESP32_" + String(DeviceID);

// ---------------- Network Config ------------------
const char* mqtt_server = "172.20.10.6";
const char* mqtt_user = "Admin";         
const char* mqtt_password = "B88vf9kp:}Xj"; 

// ---------------- Helper Functions ----------------
String buildTopic(String parameter) { return "sensor/" + String(DeviceID) + "/" + parameter; }
String commandTopic() { return "device/" + String(DeviceID) + "/command"; }
String setThresholdTopic() { return "device/" + String(DeviceID) + "/set/temperature/value"; }

void publishSensor(String parameter, float value) {
  String topic = buildTopic(parameter);
  struct tm timeinfo;
  char buf[25];
  if (!getLocalTime(&timeinfo)) strcpy(buf, "0000-00-00 00:00:00");
  else strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);
  
  String payload = "{\"value\":" + String(value) + ",\"time\":\"" + String(buf) + "\"}";
  client.publish(topic.c_str(), payload.c_str(), true);
  Serial.println("[MQTT] Sent: " + payload);
}

// ---------------- MQTT Callback ------------------
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  String topicStr = String(topic);

  // 1. SET THRESHOLD
  if (topicStr == setThresholdTopic()) {
    tempThreshold = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("threshold", tempThreshold);
    preferences.end();
    Serial.printf("[CONFIG] New threshold saved: %.2f\n", tempThreshold);
  }
  // 2. SERVO/FEED
  else if (message == "feed" && !servoActive) {
    myServo.attach(servoPin, 500, 2400);
    myServo.write(180); 
    servoActive = true;
    servoStartTime = millis();
  } 
  // 3. PUMP CONTROL
  else if (message == "pump_on") digitalWrite(pumpPin, LOW);
  else if (message == "pump_off") digitalWrite(pumpPin, HIGH);
}

boolean reconnect() {
  if (client.connect(clientID.c_str(), mqtt_user, mqtt_password)) {
    client.subscribe(commandTopic().c_str());
    client.subscribe(setThresholdTopic().c_str());
    return true;
  }
  return false;
}

// ---------------- Setup ---------------------------
void setup() {
  Serial.begin(115200); 
  
  // Initialize Hardware
  pixels.begin();
  pixels.setBrightness(50); // Set to 50/255 so it's not blinding
  pixels.clear();
  pixels.show();

  pinMode(RESET_BUTTON, INPUT_PULLUP);
  pinMode(pumpPin, OUTPUT);
  digitalWrite(pumpPin, LOW);

  // Load saved threshold
  preferences.begin("settings", true);
  tempThreshold = preferences.getFloat("threshold", 30.0);
  preferences.end();

  ESP32PWM::allocateTimer(0);
  myServo.setPeriodHertz(50);

  WiFiManager wm;
  wm.autoConnect(("ESP32_Setup" + String(DeviceID)).c_str());

  configTime(19800, 0, "pool.ntp.org");
  sensors.begin();
  
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

// ---------------- Main Loop -----------------------
void loop() {
  if (!client.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      if (reconnect()) lastReconnectAttempt = 0;
    }
  } else {
    client.loop();
  }

  // Servo Logic
  if (servoActive && (millis() - servoStartTime >= SERVO_RUN_TIME)) {
    myServo.write(90); 
    delay(100);       
    myServo.detach();  
    servoActive = false;
  }

  // Sensor & LED Logic
  unsigned long now = millis();
  if (now - lastTempTime > TEMP_INTERVAL) {
    lastTempTime = now;
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);
    
    if(tempC != DEVICE_DISCONNECTED_C) {
      if (client.connected()) publishSensor("temperature", tempC);

      // RGB LED Threshold Check
      if (tempC >= tempThreshold) {
        pixels.setPixelColor(0, pixels.Color(255, 0, 0)); // RED for Alert
        Serial.println("[ALERT] High Temp - LED RED");
      } else {
        pixels.setPixelColor(0, pixels.Color(0, 255, 0)); // GREEN for OK
        Serial.println("[OK] Temp Safe - LED GREEN");
      }
      pixels.show();
    }
  }

  // WiFi Reset
  if (digitalRead(RESET_BUTTON) == LOW) {
    if (pressStart == 0) pressStart = millis();
    if (millis() - pressStart >= RESET_DURATION) {
      WiFiManager wm;
      wm.resetSettings();
      ESP.restart();
    }
  } else { pressStart = 0; }
}
#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFiUdp.h>
#include "time.h"

// ---------------- WiFi Reset -----------------------
#define RESET_BUTTON 0
#define RESET_DURATION 3000
//---------------------------------------------------

// ---------------- Sensor Timing -------------------
unsigned long lastTempTime = 0;
const unsigned long TEMP_INTERVAL = 10000; // 10 seconds for testing
//---------------------------------------------------

// ---------------- Device Data ---------------------
unsigned long DeviceID = 100;
unsigned long pressStart = 0;
const char* mqtt_server = "192.168.1.173";
String clientID = "ESP32_" + String(DeviceID);
//---------------------------------------------------

// ---------------- DS18B20 Setup -------------------
#define ONE_WIRE_BUS 4 // GPIO4 connected to DQ
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
//---------------------------------------------------

// ---------------- MQTT Topics ---------------------
String buildTopic(String parameter) {
  return "sensor/" + String(DeviceID) + "/" + parameter;
}

String commandTopic() {
  return "device/" + String(DeviceID) + "/command";
}
//---------------------------------------------------

// ---------------- MQTT ---------------------------
WiFiClient espClient;
PubSubClient client(espClient);

void reconnect() {
  Serial.print("Connecting to MQTT broker at ");
  Serial.print(mqtt_server);
  Serial.println(" ...");

  if (client.connect(clientID.c_str())) {
    Serial.println("MQTT connected");
    // Re-subscribe after reconnect
    client.subscribe(commandTopic().c_str());
  } else {
    Serial.print("Failed, rc=");
    Serial.print(client.state());
    Serial.println(" retrying later");
  }
}
//---------------------------------------------------

// ---------------- NTP Time ------------------------
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800; // Sri Lanka GMT+5:30
const int daylightOffset_sec = 0;

String getTimeStamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "00-00-0000 00:00:00";
  }
  char buf[20];
  strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(buf);
}
//---------------------------------------------------

// ---------------- Publish Sensor ------------------
void publishSensor(String parameter, float value) {
  String topic = buildTopic(parameter);

  String payload = "{";
  payload += "\"value\":" + String(value);
  payload += ",\"time\":\"" + getTimeStamp() + "\"";
  payload += "}";

  client.publish(topic.c_str(), payload.c_str());

  Serial.print("Published -> ");
  Serial.print(topic);
  Serial.print(" : ");
  Serial.println(payload);
}
//---------------------------------------------------

// ---------------- MQTT Callback ------------------
void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("Command received: ");
  Serial.println(message);

  if (message == "temperature") {
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);
    publishSensor("temperature", tempC);
  }
}
//---------------------------------------------------

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\nWiFiManager AutoConnect");

  pinMode(RESET_BUTTON, INPUT_PULLUP);

  // ---------------- WiFi Setup -------------------
  WiFiManager wm;
  if (wm.autoConnect("ESP32_Setup_100")) {
    Serial.println("Connected!");
  } else {
    Serial.println("Failed to connect");
  }

  // ---------------- NTP Setup --------------------
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  // ---------------- DS18B20 ----------------------
  sensors.begin();

  // ---------------- MQTT Setup -------------------
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  if (!client.connected()) {
    reconnect();
  }
  client.subscribe(commandTopic().c_str());
}

//---------------------------------------------------
void loop() {
  // ---------------- MQTT Connection ----------------
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();

  // ---------------- Sensor Auto-Publish -----------
  if (now - lastTempTime > TEMP_INTERVAL) {
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);
    publishSensor("temperature", tempC);
    lastTempTime = now;
  }

  // ---------------- WiFi Reset Button -------------
  if (digitalRead(RESET_BUTTON) == LOW) {
    if (pressStart == 0) pressStart = millis();
    if (millis() - pressStart >= RESET_DURATION) {
      Serial.println("Resetting WiFi...");
      WiFiManager wm;
      wm.resetSettings();
      ESP.restart();
    }
  } else {
    pressStart = 0;
  }

  delay(1000); // minimal blocking
}
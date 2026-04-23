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

// ---------------- Pins & Constants ----------------
#define RESET_BUTTON 0
#define RESET_DURATION 3000
#define ONE_WIRE_BUS 4 
#define RGB_LED_PIN 48   
#define NUMPIXELS 1      
const int servoPin = 13;
const int pumpPin = 18;
#define TRIGGER_PIN 5
#define ECHO_PIN 15

// ---------------- Network Config ------------------
const char* mqtt_server = "71d3962284c44824be0bfe8cfedfedb7.s1.eu.hivemq.cloud";
const int mqtt_port = 8883; 
const char* mqtt_user = "thisen";          
const char* mqtt_password = "Thisen123thi"; 

// ISRG Root X1 — Let's Encrypt Root CA
static const char* root_ca = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";

// ---------------- Objects -------------------------
Adafruit_NeoPixel pixels(NUMPIXELS, RGB_LED_PIN, NEO_GRB + NEO_KHZ800);
Preferences preferences;
Servo myServo;
WiFiClientSecure espClient; 
PubSubClient client(espClient);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ---------------- State Variables -----------------
float tempThreshold = 30.0; 
float waterLevelThreshold = 5.0;
bool servoActive = false;
unsigned long servoStartTime = 0;
const unsigned long SERVO_RUN_TIME = 3000; 
unsigned long lastTempTime = 0;
unsigned long lastWaterTime = 0;
unsigned long lastReconnectAttempt = 0;
const unsigned long TEMP_INTERVAL = 10000; 
const unsigned long WATER_INTERVAL = 10000;
unsigned long pressStart = 0;

unsigned long DeviceID = 100;
String clientID = "ESP32_" + String(DeviceID);

// ---------------- Helper Functions ----------------
String buildTopic(String parameter) { return "sensor/" + String(DeviceID) + "/" + parameter; }
String commandTopic() { return "device/" + String(DeviceID) + "/command"; }
String setThresholdTopic(String parameter) { return "device/" + String(DeviceID) + "/set/" + parameter; }

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

// ---------------- MQTT Callback ------------------
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  String topicStr = String(topic);

  if (topicStr == setThresholdTopic("temperature")) {
    tempThreshold = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("threshold", tempThreshold);
    preferences.end();
  }
  else if (topicStr == setThresholdTopic("water_level")) {
    waterLevelThreshold = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("water_threshold", waterLevelThreshold);
    preferences.end();
  }
  else if (message == "feed" && !servoActive) {
    myServo.attach(servoPin, 500, 2400);
    myServo.write(180); 
    servoActive = true;
    servoStartTime = millis();
  } 
  else if (message == "pump_on") digitalWrite(pumpPin, LOW);
  else if (message == "pump_off") digitalWrite(pumpPin, HIGH);
}

boolean reconnect() {
  Serial.print("[MQTT] Attempting secure connection...");
  if (client.connect(clientID.c_str(), mqtt_user, mqtt_password)) {
    Serial.println("connected!");
    client.subscribe(commandTopic().c_str());
    client.subscribe(setThresholdTopic("temperature").c_str());
    client.subscribe(setThresholdTopic("water_level").c_str());
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
  pinMode(pumpPin, OUTPUT);
  digitalWrite(pumpPin, HIGH);

  preferences.begin("settings", true);
  tempThreshold = preferences.getFloat("threshold", 30.0);
  waterLevelThreshold = preferences.getFloat("water_threshold", 20.0);
  preferences.end();

  ESP32PWM::allocateTimer(0);
  myServo.setPeriodHertz(50);

  WiFiManager wm;
  wm.autoConnect(("ESP32_GUARD_" + String(DeviceID)).c_str());

  // --- TLS CRITICAL: NTP Sync ---
  // Sri Lanka: UTC +5:30 = 19800 seconds
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov"); 
  Serial.print("Syncing Time");
  while (time(nullptr) < 1000000) { // Wait for actual time sync
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Ready!");

  // --- TLS: Set Certificate ---
  espClient.setCACert(root_ca);

  sensors.begin();
  client.setServer(mqtt_server, mqtt_port);
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

  // Servo & Sensor logic remains the same...
  if (servoActive && (millis() - servoStartTime >= SERVO_RUN_TIME)) {
    myServo.write(90); 
    delay(100);       
    myServo.detach();  
    servoActive = false;
  }

  unsigned long now = millis();
  
  if (now - lastTempTime > TEMP_INTERVAL) {
    lastTempTime = now;
    sensors.requestTemperatures();
    float currentTemp = sensors.getTempCByIndex(0);
    if(currentTemp != DEVICE_DISCONNECTED_C) {
      if (client.connected()) publishSensor("temperature", currentTemp);
      if (currentTemp >= tempThreshold) pixels.setPixelColor(0, pixels.Color(255, 0, 0)); 
      else pixels.setPixelColor(0, pixels.Color(0, 255, 0));
      pixels.show();
    }
  }

  if (now - lastWaterTime > WATER_INTERVAL) {
    lastWaterTime = now;
    float currentDist = readWaterDistanceCm();
    if (currentDist > 0) {
      if (client.connected()) publishSensor("water_level", currentDist);
      if (currentDist >= waterLevelThreshold) {
         pixels.setPixelColor(0, pixels.Color(255, 0, 0)); 
         Serial.println("[ALERT] Low Water!");
      }
      pixels.show();
    }
  }

  // Reset Logic
  if (digitalRead(RESET_BUTTON) == LOW) {
    if (pressStart == 0) pressStart = millis();
    if (millis() - pressStart >= RESET_DURATION) {
      WiFiManager wm;
      wm.resetSettings();
      ESP.restart();
    }
  } else { pressStart = 0; }
}
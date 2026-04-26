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

#define TDS_PIN 12        // 🔵 TDS ADDED
#define VREF 3.3          // 🔵 TDS ADDED
#define ADC_RESOLUTION 4095

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
const unsigned long POLL_INTERVAL = 2000;     // Read sensors every 2 seconds
const unsigned long PUBLISH_INTERVAL = 10000; // Routine publish every 10 seconds

// ⏱️ TIMING TRACKERS
unsigned long lastTempRead = 0;
unsigned long lastWaterRead = 0;
unsigned long lastTdsRead = 0;

unsigned long lastTempPub = 0;
unsigned long lastWaterPub = 0;
unsigned long lastTdsPub = 0;
unsigned long lastReconnectAttempt = 0;
unsigned long lastTdsTime = 0;   // 🔵 TDS ADDED
const unsigned long TEMP_INTERVAL = 10000; 
const unsigned long WATER_INTERVAL = 10000;
const unsigned long TDS_INTERVAL = 10000;   // 🔵 TDS ADDED
unsigned long pressStart = 0;

// 🚦 SYSTEM HEALTH FLAGS
bool tempAlert = false;
bool waterAlert = false;
bool tdsAlert = false;

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

  if (topicStr == setThresholdTopic("temperature")) {
    tempThreshold = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("w_level", waterLevelThreshold);
    preferences.putFloat("w_stop", waterLevelStopThreshold);
    preferences.end();
  }
  else if (topicStr == setThresholdTopic("water_level")) {
    waterLevelThreshold = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("temp_min", tempMin);
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
  pinMode(pumpPin, OUTPUT);
  digitalWrite(pumpPin, HIGH);
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

  WiFi.mode(WIFI_STA); 

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
  if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WIFI] Disconnected. Waiting for auto-reconnect...");
      delay(1000);
      return; 
  }

  if (!client.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      if (reconnect()) lastReconnectAttempt = 0;
    }
  } else {
    client.loop();
  }

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
      if (client.connected()) publishSensor("waterlevel", currentDist);
      if (currentDist >= waterLevelThreshold) {
         pixels.setPixelColor(0, pixels.Color(255, 0, 0)); 
         Serial.println("[ALERT] Low Water!");
      }
      pixels.show();
    }
  }

  // 🧪 🔵 TDS PUBLISH LOOP (Custom Native Math)
  if (now - lastTdsTime > TDS_INTERVAL) {
    lastTdsTime = now;

    // 1. Take a quick average of 10 readings to filter out electrical noise
    float rawAdc = 0;
    for(int i = 0; i < 10; i++) {
        rawAdc += analogRead(TDS_PIN);
        delay(10); 
    }
    rawAdc = rawAdc / 10.0;

    // 2. Convert the raw ADC number into actual Voltage
    float voltage = rawAdc * (VREF / ADC_RESOLUTION);

    // 3. Get temperature for compensation (Assume 25°C if probe is disconnected)
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);
    if (tempC == DEVICE_DISCONNECTED_C) tempC = 25.0;

    // 4. Apply DFRobot's exact temperature compensation formula
    float compensationCoefficient = 1.0 + 0.02 * (tempC - 25.0);
    float compensationVoltage = voltage / compensationCoefficient;

    // 5. Apply the official DFRobot TDS mathematical curve
    float tdsValue = (133.42 * pow(compensationVoltage, 3) - 255.86 * pow(compensationVoltage, 2) + 857.39 * compensationVoltage) * 0.5;

    // Clean up negative noise
    if (tdsValue < 0) tdsValue = 0;

    // Send it to the MQTT Broker
    if (client.connected()) {
      publishSensor("tds", tdsValue);
    }
    
    // Print to Serial for debugging
    Serial.print("[TDS Raw ADC] ");
    Serial.print(rawAdc);
    Serial.print("  |  [Calculated TDS] ");
    Serial.print(tdsValue);
    Serial.println(" ppm");
  }
  pixels.show();

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
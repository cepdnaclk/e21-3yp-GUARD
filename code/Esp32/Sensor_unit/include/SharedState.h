
#ifndef SHARED_STATE_H
#define SHARED_STATE_H

#include <Adafruit_NeoPixel.h>
#include <Arduino.h>
#include <DallasTemperature.h>
#include <ESP32Servo.h>
#include <OneWire.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>

// ---------------- Pins & Constants ----------------
#define RESET_BUTTON 0
#define RESET_DURATION 3000
#define ONE_WIRE_BUS 4
#ifdef BOARD_ESP32_WROOM
#define RGB_LED_PIN 2
#else
#define RGB_LED_PIN 48
#endif
#define NUMPIXELS 4
extern const int servoPin;
extern const int pumpInPin;
extern const int pumpOutPin;
#define TRIGGER_PIN 5
#define ECHO_PIN 15

#ifdef BOARD_ESP32_WROOM
#define TDS_PIN 34
#define TDS_POWER_PIN 18
#define PH_PIN 32
#define TURBIDITY_PIN 33
#else
#define TDS_PIN 12
#define TDS_POWER_PIN 18
#define PH_PIN 7
#define TURBIDITY_PIN 6
#endif
#define VREF 3.3
#define ADC_RESOLUTION 4095

extern const unsigned long SERVO_RUN_TIME;
extern const unsigned long POLL_INTERVAL;
extern const unsigned long PUBLISH_INTERVAL;

// ---------------- pH Calibration Table ------------
extern const int PH_NUM_POINTS;
extern float phCalTable[3][2];
#define PH_EMA_ALPHA 0.08f
extern float ph_filtered_voltage;
extern bool ph_first_reading;

// ---------------- Network Config ------------------
extern const char *mqtt_server;
extern const int mqtt_port;
extern const char *mqtt_user;
extern const char *mqtt_password;
extern String DeviceID;
extern String clientID;

// ---------------- Objects -------------------------
extern Adafruit_NeoPixel pixels;
extern Preferences preferences;
extern Servo myServo;
extern WiFiClientSecure espClient;
extern PubSubClient client;
extern OneWire oneWire;
extern DallasTemperature sensors;

// ---------------- State & Shared Variables -----------------
// Volatile Thresholds (written by Core 0 via MQTT, read by Core 1)
extern volatile float tempMin;
extern volatile float tempMax;
extern volatile float tdsMin;
extern volatile float tdsMax;
extern volatile float phMin;
extern volatile float phMax;
extern volatile float turbMin;
extern volatile float turbMax;
extern volatile float waterLevelThreshold;
extern volatile float waterLevelStopThreshold;

// Volatile Sensor Readings (written by Core 1, read by Core 0)
extern volatile float sharedTemp;
extern volatile float sharedWaterDistance;
extern volatile float sharedTds;
extern volatile float sharedPh;
extern volatile float sharedTurbidity;

// Volatile Sensor Fault Flags (written by Core 1, read by Core 0)
extern volatile bool tempFault;
extern volatile bool waterFault;
extern volatile bool tdsFault;
extern volatile bool phFault;
extern volatile bool turbFault;

// Volatile Alert Flags (written by Core 1, read by Core 0)
extern volatile bool tempAlert;
extern volatile bool waterAlert;
extern volatile bool tdsAlert;
extern volatile bool phAlert;
extern volatile bool turbAlert;
extern volatile bool sharedHasValidWater;

// Volatile Command Flags (written by Core 0, read & cleared by Core 1)
extern volatile bool commandFeedRequested;
extern volatile bool commandManualPumpMode;
extern volatile bool commandPumpInState;
extern volatile bool commandPumpOutState;

// Volatile Hardware States (written by Core 1, read by Core 0)
extern volatile bool fillPumpOn;
extern volatile bool drainPumpOn;
extern volatile bool servoActive;
extern unsigned long servoStartTime;

// Network status trackers (Core 0 local/global)
extern unsigned long lastReconnectAttempt;
extern unsigned long mqttReconnectInterval;
extern unsigned long lastWiFiReconnectAttempt;
extern unsigned long pressStart;

// 🚦 LOCAL DEMAND FLAGS (Core 1 local)
extern bool tempPumpDemand;
extern bool tdsPumpDemand;
extern bool phPumpDemand;
extern bool turbPumpDemand;

#endif // SHARED_STATE_H

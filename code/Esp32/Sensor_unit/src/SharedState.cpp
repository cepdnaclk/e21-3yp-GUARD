#include "SharedState.h"
#include "secrets.h"

// Constants
#ifdef BOARD_ESP32_WROOM
const int servoPin = 13;
const int pumpInPin = 25;
const int pumpOutPin = 26;
#else
const int servoPin = 13;
const int pumpInPin = 9;
const int pumpOutPin = 10;
#endif
const unsigned long SERVO_RUN_TIME = 3000;
const unsigned long POLL_INTERVAL = 2000;
const unsigned long PUBLISH_INTERVAL = 10000;

// pH Calibration
const int PH_NUM_POINTS = 3;
float phCalTable[3][2] = {{2.1131, 9.80}, {2.604, 7.06}, {3.0920, 4.28}};
float ph_filtered_voltage = 0.0f;
bool ph_first_reading = true;

// Network Config
const char *mqtt_server = SECRET_MQTT_SERVER;
const int mqtt_port = SECRET_MQTT_PORT;
const char *mqtt_user = SECRET_MQTT_USER;
const char *mqtt_password = SECRET_MQTT_PASS;
String DeviceID = "GUARD-300";
String clientID = "ESP32_" + DeviceID;

// Objects
Adafruit_NeoPixel pixels(NUMPIXELS, RGB_LED_PIN, NEO_GRB + NEO_KHZ800);
Preferences preferences;
Servo myServo;
WiFiClientSecure espClient;
PubSubClient client(espClient);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// State Variables
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

volatile float sharedTemp = 25.0f;
volatile float sharedWaterDistance = -1.0f;
volatile float sharedTds = 0.0f;
volatile float sharedPh = 7.0f;
volatile float sharedTurbidity = 0.0f;

volatile bool tempFault = false;
volatile bool waterFault = false;
volatile bool tdsFault = false;
volatile bool phFault = false;
volatile bool turbFault = false;

volatile bool tempAlert = false;
volatile bool waterAlert = false;
volatile bool tdsAlert = false;
volatile bool phAlert = false;
volatile bool turbAlert = false;
volatile bool sharedHasValidWater = false;

volatile bool commandFeedRequested = false;
volatile bool commandManualPumpMode = false;
volatile bool commandPumpInState = false;
volatile bool commandPumpOutState = false;

volatile bool fillPumpOn = false;
volatile bool drainPumpOn = false;
volatile bool servoActive = false;
unsigned long servoStartTime = 0;

unsigned long lastReconnectAttempt = 0;
unsigned long mqttReconnectInterval = 5000;
unsigned long lastWiFiReconnectAttempt = 0;
unsigned long pressStart = 0;

bool tempPumpDemand = false;
bool tdsPumpDemand = false;
bool phPumpDemand = false;
bool turbPumpDemand = false;

#include "Actuators.h"
#include "SharedState.h"

void initActuators() {
  pixels.begin();
  pixels.setBrightness(50);
  pixels.clear();
  pixels.show();

  pinMode(pumpInPin, OUTPUT);
  pinMode(pumpOutPin, OUTPUT);
  digitalWrite(pumpInPin, HIGH);
  digitalWrite(pumpOutPin, HIGH);
  fillPumpOn = false;
  drainPumpOn = false;

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  myServo.setPeriodHertz(50);
  myServo.attach(servoPin, 500, 2400);
  myServo.write(90); // Start stopped
  Serial.println("[SERVO] Attached and ready");
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

  // State machine for hysteresis
  static bool isFilling = false;
  static bool isDraining = false;

  bool desiredFillOn = false;
  bool desiredDrainOn = false;

  // Interlock: Only request pump cycling if the sensor is healthy
  bool qualityDemand =
      (!tempFault && tempPumpDemand) ||
      (!tdsFault && tdsPumpDemand) ||
      (!phFault && phPumpDemand) ||
      (!turbFault && turbPumpDemand);

  if (sharedHasValidWater && !waterFault) {
    float safeMidpoint = (waterLevelThreshold + waterLevelStopThreshold) / 2.0f;

    // Drain Logic (Emergency Overflow)
    if (sharedWaterDistance <= waterLevelStopThreshold) {
      isDraining = true;
      isFilling = false; // Mutually exclusive
    } else if (isDraining && sharedWaterDistance >= safeMidpoint) {
      isDraining = false;
    }

    // Fill Logic (Auto-Top-Off)
    if (sharedWaterDistance >= waterLevelThreshold) {
      isFilling = true;
      isDraining = false; // Mutually exclusive
    } else if (isFilling && sharedWaterDistance <= safeMidpoint) {
      isFilling = false;
    }

    desiredFillOn = isFilling;
    desiredDrainOn = isDraining;

    // Override level logic if emergency water quality cycling is needed
    if (qualityDemand) {
      desiredFillOn = true;
      desiredDrainOn = true;
    }
  } else {
    // Sensor fault: reset state machine to prevent runaway
    isFilling = false;
    isDraining = false;
    if (qualityDemand) {
      desiredFillOn = true;
      desiredDrainOn = true;
    }
  }

  setPumpStates(desiredFillOn, desiredDrainOn, "AUTO");
}

void handleServo() {
  if (commandFeedRequested && !servoActive) {
    servoActive = true;
    commandFeedRequested = false; // Clear request flag
    servoStartTime = millis();
    myServo.write(180); // Start spin
    Serial.println("[SERVO] Asynchronous Feed started — spinning for 3 seconds");
  }

  if (servoActive && (millis() - servoStartTime >= SERVO_RUN_TIME)) {
    myServo.write(90);  // Stop spin
    servoActive = false;
    Serial.println("[SERVO] Asynchronous Feed complete");
  }
}

void updateLED() {
  uint32_t color = pixels.Color(0, 255, 0); // Default to 🟢 GREEN
  
  if (WiFi.status() != WL_CONNECTED || !client.connected()) {
    // 1. NETWORK ERROR (Wi-Fi or MQTT disconnected)
    color = pixels.Color(255, 255, 0); // 🟡 YELLOW
  } else if (tempFault || waterFault || tdsFault || phFault || turbFault) {
    // 1.5 SENSOR FAULT INDICATOR
    color = pixels.Color(255, 255, 255); // ⚪ WHITE
  } else if (waterAlert) {
    // 2. WATER LEVEL ERROR
    color = pixels.Color(255, 0, 0); // 🔴 RED
  } else if (tempAlert) {
    // 3. TEMPERATURE ERROR
    color = pixels.Color(255, 0, 255); // 🟣 PURPLE
  } else if (tdsAlert) {
    // 4. TDS / QUALITY ERROR
    color = pixels.Color(0, 0, 255); // 🔵 BLUE
  } else if (phAlert) {
    // 5. pH LEVEL ERROR
    color = pixels.Color(255, 165, 0); // 🟠 ORANGE
  } else if (turbAlert) {
    // 6. TURBIDITY ERROR
    color = pixels.Color(0, 255, 255); // 🩵 CYAN
  }

  // Light up ALL LEDs on the strip!
  pixels.fill(color, 0, NUMPIXELS);
  pixels.show();
}

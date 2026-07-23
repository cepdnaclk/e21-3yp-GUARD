#include <Arduino.h>
#include <esp_task_wdt.h>
#include <WiFiManager.h>

#include "SharedState.h"
#include "ConfigStore.h"
#include "Sensors.h"
#include "Actuators.h"
#include "Network.h"

TaskHandle_t NetworkTaskHandle = NULL;

void setup() {
  Serial.begin(115200);

  initActuators();
  
  pinMode(RESET_BUTTON, INPUT_PULLUP);

  loadPreferences();
  
  initSensors();

  // 🐾 Initialize Watchdog Timer (8 seconds timeout)
  esp_task_wdt_init(8, true); // Panic on timeout
  esp_task_wdt_add(NULL);     // Register Core 1 main loop

  // 🌐 Spin up background network task on Core 0
  xTaskCreatePinnedToCore(
    networkTask,
    "NetworkTask",
    8192,
    NULL,
    1,
    &NetworkTaskHandle,
    0
  );
  Serial.println("[SYSTEM] Dual-core tasks initialized.");
}

void loop() {
  unsigned long now = millis();

  // 🐾 1. Feed the Core 1 Watchdog Timer
  esp_task_wdt_reset();

  // ⚙️ 2. SERVO: Asynchronous Non-blocking feeding
  handleServo();

  // 🔄 3. Process Pump Controls (Manual Override or Automatic Rules)
  if (commandManualPumpMode) {
    setPumpStates(commandPumpInState, commandPumpOutState, "MANUAL");
  } else {
    applyPumpControl();
  }

  // 🌡️🌊🧪 4. Poll Sensors and Evaluate Logic
  updateSensors(now);

  // 🚦 5. Update Master LED Status
  updateLED();

  // 🔄 6. Hardware Reset Button
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
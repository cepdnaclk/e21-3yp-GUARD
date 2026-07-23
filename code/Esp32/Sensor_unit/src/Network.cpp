#include "Network.h"
#include "SharedState.h"
#include "ConfigStore.h"
#include <esp_task_wdt.h>
#include <WiFiManager.h>
#include "cert.h"

// Helper functions (internal to Network.cpp)
static String buildTopic(String parameter) {
  return "sensor/" + String(DeviceID) + "/" + parameter;
}

static String commandTopic() { return "device/" + String(DeviceID) + "/command"; }

static String setThresholdTopic(String parameter) {
  return "device/" + String(DeviceID) + "/set/" + parameter;
}

static void publishSensor(String parameter, float value) {
  String topic = buildTopic(parameter);
  struct tm timeinfo;
  char buf[25];
  if (!getLocalTime(&timeinfo))
    strcpy(buf, "2026-04-23 00:00:00");
  else
    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);

  String payload =
      "{\"value\":" + String(value) + ",\"time\":\"" + String(buf) + "\"}";
  client.publish(topic.c_str(), payload.c_str(), true);
  Serial.println("[MQTT] Sent: " + payload);
}

static void publishAlert(String parameter, String alertType, float value) {
  String topic = "alert/" + String(DeviceID) + "/" + parameter;
  String payload =
      "{\"alert\":\"" + alertType + "\",\"value\":" + String(value) + "}";
  client.publish(topic.c_str(), payload.c_str(), true);
  Serial.println("🚨 [ALERT PUBLISHED] " + parameter + " is " + alertType +
                 "! Value: " + String(value));
}

static void callback(char *topic, byte *payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++)
    message += (char)payload[i];
  String topicStr = String(topic);

  if (topicStr == setThresholdTopic("water_level")) {
    waterLevelThreshold = message.toFloat();
    validateWaterThresholds();
    preferences.begin("settings", false);
    preferences.putFloat("w_level", waterLevelThreshold);
    preferences.putFloat("w_stop", waterLevelStopThreshold);
    preferences.end();
    Serial.println(
        "[CONFIG] Water Level updated: " + String(waterLevelThreshold) +
        ", Stop: " + String(waterLevelStopThreshold));
  } else if (topicStr == setThresholdTopic("water_stop")) {
    waterLevelStopThreshold = message.toFloat();
    validateWaterThresholds();
    preferences.begin("settings", false);
    preferences.putFloat("w_stop", waterLevelStopThreshold);
    preferences.end();
    Serial.println("[CONFIG] Water Stop updated: " +
                   String(waterLevelStopThreshold));
  } else if (topicStr == setThresholdTopic("temp_min")) {
    tempMin = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("temp_min", tempMin);
    preferences.end();
    Serial.println("[CONFIG] Min Temp updated: " + String(tempMin));
  } else if (topicStr == setThresholdTopic("temp_max")) {
    tempMax = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("temp_max", tempMax);
    preferences.end();
    Serial.println("[CONFIG] Max Temp updated: " + String(tempMax));
  } else if (topicStr == setThresholdTopic("tds_min")) {
    tdsMin = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("tds_min", tdsMin);
    preferences.end();
    Serial.println("[CONFIG] Min TDS updated: " + String(tdsMin));
  } else if (topicStr == setThresholdTopic("tds_max")) {
    tdsMax = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("tds_max", tdsMax);
    preferences.end();
    Serial.println("[CONFIG] Max TDS updated: " + String(tdsMax));
  } else if (topicStr == setThresholdTopic("ph_min")) {
    phMin = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("ph_min", phMin);
    preferences.end();
    Serial.println("[CONFIG] Min pH updated: " + String(phMin));
  } else if (topicStr == setThresholdTopic("ph_max")) {
    phMax = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("ph_max", phMax);
    preferences.end();
    Serial.println("[CONFIG] Max pH updated: " + String(phMax));
  } else if (topicStr == setThresholdTopic("turb_min")) {
    turbMin = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("turb_min", turbMin);
    preferences.end();
    Serial.println("[CONFIG] Min Turbidity updated: " + String(turbMin));
  } else if (topicStr == setThresholdTopic("turb_max")) {
    turbMax = message.toFloat();
    preferences.begin("settings", false);
    preferences.putFloat("turb_max", turbMax);
    preferences.end();
    Serial.println("[CONFIG] Max Turbidity updated: " + String(turbMax));
  } else if (message == "feed") {
    if (!servoActive) {
      commandFeedRequested = true;
    }
  } else if (message == "pump_on") {
    commandManualPumpMode = true;
    commandPumpInState = true;
    commandPumpOutState = true;
  } else if (message == "pump_off") {
    commandManualPumpMode = true;
    commandPumpInState = false;
    commandPumpOutState = false;
  } else if (message == "pump_auto") {
    commandManualPumpMode = false;
    Serial.println("[PUMPS] Restored to AUTOMATIC mode");
  }
}

static boolean reconnect() {
  Serial.print("[MQTT] Attempting secure connection...");
  String statusTopic = "device/" + String(DeviceID) + "/status";
  
  if (client.connect(
      clientID.c_str(),
      mqtt_user,
      mqtt_password,
      statusTopic.c_str(), // Will Topic
      1,                   // Will QoS (QoS 1)
      true,                // Will Retain
      "offline"            // Will Message
  )) {
    Serial.println("connected!");
    // Publish online status immediately (retained)
    client.publish(statusTopic.c_str(), "online", true);
    
    client.subscribe(commandTopic().c_str());
    client.subscribe(setThresholdTopic("water_level").c_str());
    client.subscribe(setThresholdTopic("water_stop").c_str());
    client.subscribe(setThresholdTopic("temp_min").c_str());
    client.subscribe(setThresholdTopic("temp_max").c_str());
    client.subscribe(setThresholdTopic("tds_min").c_str());
    client.subscribe(setThresholdTopic("tds_max").c_str());
    client.subscribe(setThresholdTopic("ph_min").c_str());
    client.subscribe(setThresholdTopic("ph_max").c_str());
    client.subscribe(setThresholdTopic("turb_min").c_str());
    client.subscribe(setThresholdTopic("turb_max").c_str());
    return true;
  }
  Serial.print("failed, rc=");
  Serial.println(client.state());
  return false;
}

void networkTask(void *pvParameters) {
  // Add this task to Watchdog Timer (WDT)
  esp_task_wdt_add(NULL);

  WiFi.disconnect(true, true);
  vTaskDelay(pdMS_TO_TICKS(100));
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  WiFi.setAutoReconnect(true);

  // De-register WDT while blocking in the Config Portal
  esp_task_wdt_delete(NULL);

  WiFiManager wm;
  wm.setConfigPortalTimeout(30); // 30 seconds config portal timeout
  wm.autoConnect(("ESP32_GUARD_" + String(DeviceID)).c_str());

  // Re-register to WDT after portal returns
  esp_task_wdt_add(NULL);

  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("[NetworkTask] Syncing Time");
  unsigned long startMs = millis();
  while (time(nullptr) < 1000000 && millis() - startMs < 10000) {
    esp_task_wdt_reset();
    vTaskDelay(pdMS_TO_TICKS(500));
    Serial.print(".");
  }
  if (time(nullptr) < 1000000) {
    Serial.println(" NTP Time sync timed out (operating offline).");
  } else {
    Serial.println(" Time sync complete.");
  }

  espClient.setCACert(root_ca);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  // Core 0 Local Timing Trackers
  unsigned long lastTempPubTime = 0;
  unsigned long lastWaterPubTime = 0;
  unsigned long lastTdsPubTime = 0;
  unsigned long lastPhPubTime = 0;
  unsigned long lastTurbPubTime = 0;
  unsigned long lastStatusPubTime = 0;

  // Local copy of alert states for edge-detection
  bool lastPubTempAlert = false;
  bool lastPubWaterAlert = false;
  bool lastPubTdsAlert = false;
  bool lastPubPhAlert = false;
  bool lastPubTurbAlert = false;

  while (true) {
    esp_task_wdt_reset(); // Feed Core 0 Watchdog

    unsigned long now = millis();

    // 1. WiFi Reconnect Manager
    if (WiFi.status() != WL_CONNECTED) {
      if (now - lastWiFiReconnectAttempt > 10000) {
        Serial.println("🌐 [NetworkTask] WiFi Disconnected! Reconnecting...");
        WiFi.disconnect();
        WiFi.reconnect();
        lastWiFiReconnectAttempt = now;
      }
    }
    // 2. MQTT Reconnect Manager
    else if (!client.connected()) {
      if (now - lastReconnectAttempt > mqttReconnectInterval) {
        lastReconnectAttempt = now;
        if (reconnect()) {
          lastReconnectAttempt = 0;
          mqttReconnectInterval = 5000;
        } else {
          mqttReconnectInterval = 30000;
        }
      }
    }
    // 3. MQTT Client Loop & Publishing
    else {
      client.loop();

      // Read values into local variables for consistency
      float tVal = sharedTemp;
      float wVal = sharedWaterDistance;
      float tdsVal = sharedTds;
      float phVal = sharedPh;
      float turbVal = sharedTurbidity;

      bool tAlert = tempAlert;
      bool wAlert = waterAlert;
      bool tdsAlertState = tdsAlert;
      bool phAlertState = phAlert;
      bool turbAlertState = turbAlert;

      // A. Temperature
      if (!tempFault) {
        if ((tAlert && !lastPubTempAlert) || (now - lastTempPubTime > PUBLISH_INTERVAL)) {
          publishSensor("temperature", tVal);
          lastTempPubTime = now;
          if (tAlert && !lastPubTempAlert) {
            publishAlert("temperature", tVal < tempMin ? "LOW" : "HIGH", tVal);
            lastPubTempAlert = true;
          }
        }
        if (!tAlert) {
          lastPubTempAlert = false;
        }
      }

      // B. Water Level
      if (!waterFault && sharedHasValidWater) {
        if ((wAlert && !lastPubWaterAlert) || (now - lastWaterPubTime > PUBLISH_INTERVAL)) {
          publishSensor("waterlevel", wVal);
          lastWaterPubTime = now;
          if (wAlert && !lastPubWaterAlert) {
            publishAlert("waterlevel", wVal >= waterLevelThreshold ? "LOW" : "HIGH", wVal);
            lastPubWaterAlert = true;
          }
        }
        if (!wAlert) {
          lastPubWaterAlert = false;
        }
      }

      // C. TDS
      if (!tdsFault) {
        if ((tdsAlertState && !lastPubTdsAlert) || (now - lastTdsPubTime > PUBLISH_INTERVAL)) {
          publishSensor("tds", tdsVal);
          lastTdsPubTime = now;
          if (tdsAlertState && !lastPubTdsAlert) {
            publishAlert("tds", tdsVal < tdsMin ? "LOW" : "HIGH", tdsVal);
            lastPubTdsAlert = true;
          }
        }
        if (!tdsAlertState) {
          lastPubTdsAlert = false;
        }
      }

      // D. pH
      if (!phFault) {
        if ((phAlertState && !lastPubPhAlert) || (now - lastPhPubTime > PUBLISH_INTERVAL)) {
          publishSensor("ph", phVal);
          lastPhPubTime = now;
          if (phAlertState && !lastPubPhAlert) {
            publishAlert("ph", phVal < phMin ? "LOW" : "HIGH", phVal);
            lastPubPhAlert = true;
          }
        }
        if (!phAlertState) {
          lastPubPhAlert = false;
        }
      }

      // E. Turbidity
      if (!turbFault) {
        if ((turbAlertState && !lastPubTurbAlert) || (now - lastTurbPubTime > PUBLISH_INTERVAL)) {
          publishSensor("turbidity", turbVal);
          lastTurbPubTime = now;
          if (turbAlertState && !lastPubTurbAlert) {
            publishAlert("turbidity", turbVal < turbMin ? "LOW" : "HIGH", turbVal);
            lastPubTurbAlert = true;
          }
        }
        if (!turbAlertState) {
          lastPubTurbAlert = false;
        }
      }

      // F. Health Status JSON publishing (Every 10 seconds)
      if (now - lastStatusPubTime > 10000) {
        lastStatusPubTime = now;
        String topic = "sensor/" + String(DeviceID) + "/status";
        String payload = "{\"temp_ok\":" + String(tempFault ? "false" : "true") +
                         ",\"water_ok\":" + String(waterFault ? "false" : "true") +
                         ",\"tds_ok\":" + String(tdsFault ? "false" : "true") +
                         ",\"ph_ok\":" + String(phFault ? "false" : "true") +
                         ",\"turb_ok\":" + String(turbFault ? "false" : "true") + "}";
        client.publish(topic.c_str(), payload.c_str(), true);
      }
    }

    // Yield control to FreeRTOS (approx 100ms sleep)
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

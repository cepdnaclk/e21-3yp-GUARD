#include "Sensors.h"
#include "SharedState.h"
#include "Actuators.h" // for applyPumpControl

// ⏱️ TIMING TRACKERS (Core 1 local)
static unsigned long lastTempRead = 0;
static unsigned long lastWaterRead = 0;
static unsigned long lastTdsRead = 0;
static unsigned long lastPhRead = 0;
static unsigned long lastTurbRead = 0;

float getMultiPointPH(float voltage) {
  if (voltage <= phCalTable[0][0])
    return phCalTable[0][1];
  if (voltage >= phCalTable[PH_NUM_POINTS - 1][0])
    return phCalTable[PH_NUM_POINTS - 1][1];
  for (int i = 0; i < PH_NUM_POINTS - 1; i++) {
    float v0 = phCalTable[i][0], pH0 = phCalTable[i][1];
    float v1 = phCalTable[i + 1][0], pH1 = phCalTable[i + 1][1];
    if (voltage >= v0 && voltage <= v1)
      return pH0 + (voltage - v0) * (pH1 - pH0) / (v1 - v0);
  }
  return 7.0f;
}

float readWaterDistanceCm() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0)
    return -1.0f;
  return (duration * 0.0343f) / 2.0f;
}

void initSensors() {
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(TDS_PIN, INPUT);
  pinMode(TDS_POWER_PIN, OUTPUT);
  digitalWrite(TDS_POWER_PIN, LOW); // Start with TDS powered off
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);

  sensors.begin();
}

void updateSensors(unsigned long now) {
  // 🌡️ TEMPERATURE SENSOR (Fast Poll & Edge Detect)
  if (now - lastTempRead > POLL_INTERVAL) {
    lastTempRead = now;
    sensors.requestTemperatures();
    float currentTemp = sensors.getTempCByIndex(0);

    if (currentTemp == DEVICE_DISCONNECTED_C) {
      tempFault = true;
      tempAlert = false;
      tempPumpDemand = false;
      Serial.println("🚨 [FAULT] Temperature sensor probe disconnected!");
    } else {
      tempFault = false;
      sharedTemp = currentTemp;

      bool isAlertNow = false;
      if (currentTemp < tempMin) {
        isAlertNow = true;
      } else if (currentTemp > tempMax) {
        isAlertNow = true;
      }

      tempAlert = isAlertNow;
      tempPumpDemand = isAlertNow;
    }
    if (!commandManualPumpMode) applyPumpControl();
  }

  // 🌊 WATER LEVEL SENSOR (Fast Poll & Edge Detect)
  if (now - lastWaterRead > POLL_INTERVAL) {
    lastWaterRead = now;
    float currentDist = readWaterDistanceCm();

    if (currentDist <= 0) {
      waterFault = true;
      sharedHasValidWater = false;
      waterAlert = false;
      Serial.println("🚨 [FAULT] Water Level Sensor returned invalid value!");
    } else {
      waterFault = false;
      sharedWaterDistance = currentDist;
      sharedHasValidWater = true;

      bool isAlertNow = false;
      if (currentDist >= waterLevelThreshold) {
        isAlertNow = true;
      } else if (currentDist <= waterLevelStopThreshold) {
        isAlertNow = true;
      }

      waterAlert = isAlertNow;
    }
    if (!commandManualPumpMode) applyPumpControl();
  }

  // 🧪 TDS SENSOR (Fast Poll & Edge Detect)
  if (now - lastTdsRead > POLL_INTERVAL) {
    lastTdsRead = now;

    // Power on the TDS sensor and allow it to stabilize
    digitalWrite(TDS_POWER_PIN, HIGH);
    delay(100);

    float rawAdc = 0;
    for (int i = 0; i < 10; i++) {
      rawAdc += analogRead(TDS_PIN);
      delay(10);
    }
    rawAdc = rawAdc / 10.0;

    // Power off the TDS sensor immediately
    digitalWrite(TDS_POWER_PIN, LOW);

    if (rawAdc <= 5.0f || rawAdc >= 4090.0f) {
      tdsFault = true;
      tdsAlert = false;
      tdsPumpDemand = false;
      Serial.println("🚨 [FAULT] TDS Sensor returned out-of-bounds ADC reading!");
    } else {
      tdsFault = false;

      float voltage = rawAdc * (VREF / ADC_RESOLUTION);

      sensors.requestTemperatures();
      float tempC = sensors.getTempCByIndex(0);
      if (tempC == DEVICE_DISCONNECTED_C)
        tempC = 25.0;

      float compensationCoefficient = 1.0 + 0.02 * (tempC - 25.0);
      float compensationVoltage = voltage / compensationCoefficient;
      float tdsValue =
          (133.42 * pow(compensationVoltage, 3) -
           255.86 * pow(compensationVoltage, 2) + 857.39 * compensationVoltage) *
          0.5;

      if (tdsValue < 0)
        tdsValue = 0;

      sharedTds = tdsValue;

      bool isAlertNow = false;
      if (tdsValue < tdsMin) {
        isAlertNow = true;
      } else if (tdsValue > tdsMax) {
        isAlertNow = true;
      }

      tdsAlert = isAlertNow;
      tdsPumpDemand = isAlertNow;
    }
    if (!commandManualPumpMode) applyPumpControl();
  }

  // 🧪 pH SENSOR (Oversampled + EMA Filtered + Edge Detect)
  if (now - lastPhRead > POLL_INTERVAL) {
    lastPhRead = now;

    // 1. Oversample: 20 readings
    int phBuf[20];
    for (int i = 0; i < 20; i++) {
      phBuf[i] = analogRead(PH_PIN);
      delay(20);
    }

    // 2. Bubble sort ascending
    for (int i = 0; i < 19; i++) {
      for (int j = i + 1; j < 20; j++) {
        if (phBuf[i] > phBuf[j]) {
          int t = phBuf[i];
          phBuf[i] = phBuf[j];
          phBuf[j] = t;
        }
      }
    }

    // 3. Average middle 10 — rejects top/bottom 5 outliers
    long phSum = 0;
    for (int i = 5; i < 15; i++)
      phSum += phBuf[i];
    float avgADC = phSum / 10.0f;

    if (avgADC <= 5.0f || avgADC >= 4090.0f) {
      phFault = true;
      phAlert = false;
      phPumpDemand = false;
      Serial.println("🚨 [FAULT] pH Sensor returned out-of-bounds ADC reading!");
    } else {
      phFault = false;

      float ph_raw_voltage = avgADC * (VREF / (float)ADC_RESOLUTION);

      // 4. EMA low-pass filter
      if (ph_first_reading) {
        ph_filtered_voltage = ph_raw_voltage;
        ph_first_reading = false;
      } else {
        ph_filtered_voltage = (PH_EMA_ALPHA * ph_raw_voltage) +
                              ((1.0f - PH_EMA_ALPHA) * ph_filtered_voltage);
      }

      // 5. Convert filtered voltage to pH
      float phValue = getMultiPointPH(ph_filtered_voltage);
      phValue = constrain(phValue, 0.0f, 14.0f);

      sharedPh = phValue;

      bool isAlertNow = false;
      if (phValue < phMin) {
        isAlertNow = true;
      } else if (phValue > phMax) {
        isAlertNow = true;
      }

      phAlert = isAlertNow;
      phPumpDemand = isAlertNow;
    }
    if (!commandManualPumpMode) applyPumpControl();
  }

  // 🌫️ TURBIDITY SENSOR (800-Sample Average + Edge Detect)
  if (now - lastTurbRead > POLL_INTERVAL) {
    lastTurbRead = now;

    // 1. Average 800 samples for stable reading
    long turbSum = 0;
    for (int i = 0; i < 800; i++) {
      turbSum += analogRead(TURBIDITY_PIN);
    }
    float avgADC = turbSum / 800.0f;

    if (avgADC <= 5.0f) {
      turbFault = true;
      turbAlert = false;
      turbPumpDemand = false;
      Serial.println("🚨 [FAULT] Turbidity Sensor returned 0 ADC!");
    } else {
      turbFault = false;

      // 2. Convert ADC to voltage (ESP32: 3.3V / 12-bit)
      float turbVoltage = avgADC * (VREF / (float)ADC_RESOLUTION);

      // 3. Calibration mapping
      float turbVoltage5V = 2.5f + (avgADC / 2900.0f) * (4.2f - 2.5f);

      if (turbVoltage5V > 4.2f)
        turbVoltage5V = 4.2f;
      if (turbVoltage5V < 2.5f)
        turbVoltage5V = 2.5f;

      float turbNTU;
      if (turbVoltage5V >= 4.2f) {
        turbNTU = 0.0f;
      } else {
        turbNTU = -1120.4f * (turbVoltage5V * turbVoltage5V) +
                  5742.3f * turbVoltage5V - 4352.9f;
        if (turbNTU < 0.0f)
          turbNTU = 0.0f;
      }

      if (turbNTU >= 1800.0f) {
        turbNTU = (turbNTU - 1800.0f) * (3000.0f / (3000.0f - 1800.0f));
      } else {
        turbNTU = 0.0f;
      }
      if (turbNTU > 3000.0f) {
        turbNTU = 3000.0f;
      }

      sharedTurbidity = turbNTU;

      bool isAlertNow = false;
      if (turbNTU < turbMin) {
        isAlertNow = true;
      } else if (turbNTU > turbMax) {
        isAlertNow = true;
      }

      turbAlert = isAlertNow;
      turbPumpDemand = isAlertNow;
    }
    if (!commandManualPumpMode) applyPumpControl();
  }
}

#include "ConfigStore.h"
#include "SharedState.h"

void validateWaterThresholds() {
  if (waterLevelStopThreshold >= waterLevelThreshold) {
    waterLevelStopThreshold = waterLevelThreshold - 0.5f;
  }
  if (waterLevelStopThreshold < 0.1f) {
    waterLevelStopThreshold = 0.1f;
  }
}

void loadPreferences() {
  preferences.begin("settings", true);
  waterLevelThreshold = preferences.getFloat("w_level", 5.0);
  waterLevelStopThreshold = preferences.getFloat("w_stop", 4.0);
  tempMin = preferences.getFloat("temp_min", 24.0);
  tempMax = preferences.getFloat("temp_max", 28.0);
  tdsMin = preferences.getFloat("tds_min", 70.0);
  tdsMax = preferences.getFloat("tds_max", 500.0);
  phMin = preferences.getFloat("ph_min", 6.0);
  phMax = preferences.getFloat("ph_max", 8.5);
  turbMin = preferences.getFloat("turb_min", 0.0);
  turbMax = preferences.getFloat("turb_max", 50.0);
  preferences.end();
  validateWaterThresholds();
}

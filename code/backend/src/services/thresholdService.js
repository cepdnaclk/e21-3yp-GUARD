import { publishActuatorCommand } from "./mqttService.js";

/**
 * Publishes threshold values to the ESP32 via MQTT.
 * Per spec §2.4: each threshold is a separate topic with a float-as-text payload.
 *
 * @param {string} tankId - Human-readable device ID (e.g., "GUARD-100")
 * @param {Object} thresholds - Map of { mqtt_key: numericValue }
 *   Valid keys: temp_min, temp_max, tds_min, tds_max, water_level, water_stop
 */
export const publishThresholdsToDevice = async (tankId, thresholds) => {
  const publishPromises = Object.entries(thresholds).map(([key, value]) => {
    const topic = `device/${tankId}/set/${key}`;
    const payload = String(parseFloat(value)); // Must be a plain float string per spec
    console.log(`📡 Publishing threshold to ESP32: ${topic} = ${payload}`);
    return publishActuatorCommand(topic, payload);
  });

  await Promise.all(publishPromises);
};

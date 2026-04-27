import prisma from "../lib/prisma.js";
import { findAccessibleTank } from "../lib/tankAccess.js";
import { publishThresholdsToDevice } from "../services/thresholdService.js";

// Allowed threshold keys and their MQTT topic suffix mapping (per spec §2.4)
const THRESHOLD_MQTT_MAP = {
  tempMin:             "temp_min",
  tempMax:             "temp_max",
  tdsMin:              "tds_min",
  tdsMax:              "tds_max",
  waterLevelThreshold: "water_level",
  waterStopThreshold:  "water_stop",
};

// Threshold keys that are DB-only (not sent to ESP32)
const DB_ONLY_THRESHOLDS = ["phMin", "phMax", "turbidityMax"];

const ALL_THRESHOLD_KEYS = [...Object.keys(THRESHOLD_MQTT_MAP), ...DB_ONLY_THRESHOLDS];

/**
 * PATCH /api/tanks/:tankId/thresholds
 * Admins can update sensor thresholds. Changes are:
 *  1. Saved to MongoDB
 *  2. Published to the ESP32 via MQTT (for supported keys)
 */
export const updateThresholds = async (req, res) => {
  const { tankId } = req.params;
  const updates = req.body;

  // Validate: only known threshold keys are allowed
  const unknownKeys = Object.keys(updates).filter(k => !ALL_THRESHOLD_KEYS.includes(k));
  if (unknownKeys.length > 0) {
    return res.status(400).json({ error: `Unknown threshold fields: ${unknownKeys.join(", ")}` });
  }

  // Validate: all values must be finite numbers
  for (const [key, val] of Object.entries(updates)) {
    const num = parseFloat(val);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      return res.status(400).json({ error: `Invalid value for "${key}": must be a number.` });
    }
    updates[key] = num; // Normalize to float
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "At least one threshold field must be provided." });
  }

  try {
    // Access control: admin must own the tank
    const tank = await findAccessibleTank(tankId, req.user);
    if (!tank) {
      return res.status(404).json({ error: "Tank not found or access denied." });
    }

    // Only ADMIN (owner) and SUPER_ADMIN can update thresholds
    if (req.user.role === "USER") {
      return res.status(403).json({ error: "Workers cannot update device thresholds." });
    }

    // Save to DB
    const updatedTank = await prisma.tank.update({
      where: { tankId },
      data: updates,
    });

    // Publish MQTT threshold updates to the ESP32 for supported keys
    const mqttKeys = Object.keys(updates).filter(k => THRESHOLD_MQTT_MAP[k]);
    if (mqttKeys.length > 0) {
      const mqttUpdates = {};
      for (const key of mqttKeys) {
        mqttUpdates[THRESHOLD_MQTT_MAP[key]] = updates[key];
      }
      try {
        await publishThresholdsToDevice(tankId, mqttUpdates);
      } catch (mqttErr) {
        // Non-fatal: DB was already updated. Log but don't fail the request.
        console.warn(`⚠️ MQTT threshold publish failed for ${tankId}: ${mqttErr.message}`);
      }
    }

    return res.status(200).json({
      message: "Thresholds updated successfully.",
      thresholds: {
        tempMin:             updatedTank.tempMin,
        tempMax:             updatedTank.tempMax,
        phMin:               updatedTank.phMin,
        phMax:               updatedTank.phMax,
        tdsMin:              updatedTank.tdsMin,
        tdsMax:              updatedTank.tdsMax,
        turbidityMax:        updatedTank.turbidityMax,
        waterLevelThreshold: updatedTank.waterLevelThreshold,
        waterStopThreshold:  updatedTank.waterStopThreshold,
      },
    });
  } catch (error) {
    console.error("Update thresholds error:", error);
    return res.status(500).json({ error: "Failed to update thresholds." });
  }
};

/**
 * GET /api/tanks/:tankId/thresholds
 * Returns the current configured thresholds for a tank.
 */
export const getThresholds = async (req, res) => {
  const { tankId } = req.params;

  try {
    const tank = await findAccessibleTank(tankId, req.user);
    if (!tank) {
      return res.status(404).json({ error: "Tank not found or access denied." });
    }

    return res.status(200).json({
      tankId: tank.tankId,
      thresholds: {
        tempMin:             tank.tempMin,
        tempMax:             tank.tempMax,
        phMin:               tank.phMin,
        phMax:               tank.phMax,
        tdsMin:              tank.tdsMin,
        tdsMax:              tank.tdsMax,
        turbidityMax:        tank.turbidityMax,
        waterLevelThreshold: tank.waterLevelThreshold,
        waterStopThreshold:  tank.waterStopThreshold,
      },
    });
  } catch (error) {
    console.error("Get thresholds error:", error);
    return res.status(500).json({ error: "Failed to fetch thresholds." });
  }
};

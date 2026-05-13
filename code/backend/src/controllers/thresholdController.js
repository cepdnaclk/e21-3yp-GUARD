import prisma from "../lib/prisma.js";
import { findAccessibleTank } from "../lib/tankAccess.js";
import { publishThresholdsToDevice } from "../services/thresholdService.js";
import { processAlert } from "../services/mqttService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";

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
 * Build a standardised threshold response object from a tank record.
 */
const buildThresholdResponse = (tank) => ({
  tempMin:             tank.tempMin,
  tempMax:             tank.tempMax,
  phMin:               tank.phMin,
  phMax:               tank.phMax,
  tdsMin:              tank.tdsMin,
  tdsMax:              tank.tdsMax,
  turbidityMax:        tank.turbidityMax,
  waterLevelThreshold: tank.waterLevelThreshold,
  waterStopThreshold:  tank.waterStopThreshold,
});

/**
 * PATCH /api/tanks/:tankId/thresholds
 */
export const updateThresholds = asyncHandler(async (req, res) => {
  const { tankId } = req.params;
  const updates = req.body;

  // Validate: only known threshold keys are allowed
  const unknownKeys = Object.keys(updates).filter(k => !ALL_THRESHOLD_KEYS.includes(k));
  if (unknownKeys.length > 0) {
    throw new AppError(`Unknown threshold fields: ${unknownKeys.join(", ")}`, 400);
  }

  // Validate: all values must be finite numbers
  for (const [key, val] of Object.entries(updates)) {
    const num = parseFloat(val);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      throw new AppError(`Invalid value for "${key}": must be a number.`, 400);
    }
    updates[key] = num; // Normalize to float
  }

  // Cross-validation to ensure min < max
  if (updates.tempMin !== undefined && updates.tempMax !== undefined && updates.tempMin >= updates.tempMax) {
    throw new AppError("Temperature Min must be less than Temperature Max.", 400);
  }
  if (updates.phMin !== undefined && updates.phMax !== undefined && updates.phMin >= updates.phMax) {
    throw new AppError("pH Min must be less than pH Max.", 400);
  }
  if (updates.tdsMin !== undefined && updates.tdsMax !== undefined && updates.tdsMin >= updates.tdsMax) {
    throw new AppError("TDS Min must be less than TDS Max.", 400);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one threshold field must be provided.", 400);
  }

  // Access control: admin must own the tank
  const tank = await findAccessibleTank(tankId, req.user);
  if (!tank) {
    throw new AppError("Tank not found or access denied.", 404);
  }

  // Only ADMIN (owner) and SUPER_ADMIN can update thresholds
  if (req.user.role === "USER") {
    throw new AppError("Workers cannot update device thresholds.", 403);
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

  // Proactive Alert Check: if the NEW thresholds now exclude the CURRENT sensor values, trigger immediately.
  const checkProactiveAlert = async (param, value, min, max) => {
    if (value === null || value === undefined) return;
    if (min !== undefined && value < min) {
      await processAlert(tankId, param, 'LOW', value);
    } else if (max !== undefined && value > max) {
      await processAlert(tankId, param, 'HIGH', value);
    }
  };

  if (updates.tempMin !== undefined || updates.tempMax !== undefined) {
    await checkProactiveAlert('temperature', updatedTank.lastTemp, updatedTank.tempMin, updatedTank.tempMax);
  }
  if (updates.phMin !== undefined || updates.phMax !== undefined) {
    await checkProactiveAlert('ph', updatedTank.lastPh, updatedTank.phMin, updatedTank.phMax);
  }
  if (updates.tdsMin !== undefined || updates.tdsMax !== undefined) {
    await checkProactiveAlert('tds', updatedTank.lastTds, updatedTank.tdsMin, updatedTank.tdsMax);
  }
  if (updates.turbidityMax !== undefined) {
    await checkProactiveAlert('turbidity', updatedTank.lastTurb, undefined, updatedTank.turbidityMax);
  }
  if (updates.waterLevelThreshold !== undefined || updates.waterStopThreshold !== undefined) {
    if (updatedTank.lastWaterLevel >= updatedTank.waterLevelThreshold) {
      await processAlert(tankId, 'waterlevel', 'LOW', updatedTank.lastWaterLevel);
    }
  }

  return res.status(200).json({
    message: "Thresholds updated successfully.",
    thresholds: buildThresholdResponse(updatedTank),
  });
});

/**
 * GET /api/tanks/:tankId/thresholds
 */
export const getThresholds = asyncHandler(async (req, res) => {
  const { tankId } = req.params;

  const tank = await findAccessibleTank(tankId, req.user);
  if (!tank) {
    throw new AppError("Tank not found or access denied.", 404);
  }

  return res.status(200).json({
    tankId: tank.tankId,
    thresholds: buildThresholdResponse(tank),
  });
});

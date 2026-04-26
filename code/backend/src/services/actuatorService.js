import prisma from "../lib/prisma.js";
import { findAccessibleTank } from "../lib/tankAccess.js";
import { publishActuatorCommand } from "./mqttService.js";

const SUPPORTED_COMMANDS = ["feed", "pump_on", "pump_off"];

const assertTankAccess = async (tankId, user) => {
  const tank = await findAccessibleTank(tankId, user);

  if (!tank) {
    const error = new Error("Tank not found or no access.");
    error.status = 404;
    throw error;
  }
};

export const publishTankActuatorCommand = async (tankId, command, user) => {
  await assertTankAccess(tankId, user);

  if (!SUPPORTED_COMMANDS.includes(command)) {
    const error = new Error("Invalid command. Use feed, pump_on, or pump_off.");
    error.status = 400;
    throw error;
  }

  const topic = `device/${tankId}/command`;
  const payload = command;

  await publishActuatorCommand(topic, payload);

  return { topic, payload };
};

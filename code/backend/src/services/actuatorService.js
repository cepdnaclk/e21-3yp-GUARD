import prisma from "../lib/prisma.js";
import { publishActuatorCommand } from "./mqttService.js";

const SUPPORTED_COMMANDS = ["feed", "pump_on", "pump_off"];

const findAccessibleTank = async (tankId, user) => {
  if (user.role === "ADMIN") {
    return prisma.tank.findFirst({
      where: { tankId, adminId: user.userId },
      select: { tankId: true },
    });
  }

  if (user.role === "USER") {
    return prisma.tank.findFirst({
      where: { tankId, workerIds: { has: user.userId } },
      select: { tankId: true },
    });
  }

  return null;
};

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

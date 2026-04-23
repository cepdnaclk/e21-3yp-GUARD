import prisma from "../lib/prisma.js";

const uniqueIds = (arr) => [...new Set(arr || [])];

const findAccessibleTank = async (tankId, user) => {
  if (user.role === "ADMIN") {
    return prisma.tank.findFirst({
      where: { tankId, adminId: user.userId },
    });
  }

  if (user.role === "USER") {
    return prisma.tank.findFirst({
      where: { tankId, workerIds: { has: user.userId } },
    });
  }

  return null;
};

export const registerTank = async (req, res) => {
  const { name, tankId, workerIds = [] } = req.body;
  const adminId = req.user.userId;

  if (!name || !tankId) {
    return res.status(400).json({ error: "name and tankId are required." });
  }

  try {
    const cleanWorkerIds = uniqueIds(workerIds);

    if (cleanWorkerIds.length > 0) {
      const validWorkers = await prisma.user.count({
        where: {
          id: { in: cleanWorkerIds },
          role: "USER",
          adminId,
        },
      });

      if (validWorkers !== cleanWorkerIds.length) {
        return res.status(400).json({
          error: "One or more users are invalid or not under this admin.",
        });
      }
    }

    const tank = await prisma.tank.create({
      data: {
        name,
        tankId,
        adminId,
        workerIds: cleanWorkerIds,
      },
    });

    return res.status(201).json({
      message: "Tank registered successfully.",
      tank,
    });
  } catch (error) {
    console.error("Tank registration error:", error);
    return res.status(400).json({ error: "Registration failed. Tank ID might already exist." });
  }
};

export const assignUserToTank = async (req, res) => {
  const { tankId } = req.params;
  const { userId } = req.body;
  const adminId = req.user.userId;

  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  try {
    const tank = await prisma.tank.findFirst({
      where: { tankId, adminId },
    });

    if (!tank) {
      return res.status(404).json({ error: "Tank not found for this admin." });
    }

    const worker = await prisma.user.findFirst({
      where: { id: userId, role: "USER", adminId },
    });

    if (!worker) {
      return res.status(404).json({ error: "User not found under this admin." });
    }

    const nextWorkerIds = uniqueIds([...(tank.workerIds || []), userId]);
    const nextAssignedTankIds = uniqueIds([...(worker.assignedTankIds || []), tank.id]);

    await prisma.tank.update({
      where: { id: tank.id },
      data: { workerIds: nextWorkerIds },
    });

    await prisma.user.update({
      where: { id: worker.id },
      data: { assignedTankIds: nextAssignedTankIds },
    });

    return res.status(200).json({ message: "User assigned to tank." });
  } catch (error) {
    console.error("Assign user error:", error);
    return res.status(500).json({ error: "Failed to assign user to tank." });
  }
};

export const getAllTanks = async (req, res) => {
  try {
    let where = {};

    if (req.user.role === "ADMIN") {
      where = { adminId: req.user.userId };
    } else if (req.user.role === "USER") {
      where = { workerIds: { has: req.user.userId } };
    } else {
      return res.status(403).json({ error: "SUPER_ADMIN has no tank access." });
    }

    const tanks = await prisma.tank.findMany({ where });

    const processed = tanks.map((tank) => {
      const hasValues = tank.lastTemp !== null && tank.lastPh !== null;
      const isHealthy =
        hasValues &&
        tank.lastTemp >= tank.tempMin &&
        tank.lastTemp <= tank.tempMax &&
        tank.lastPh >= tank.phMin &&
        tank.lastPh <= tank.phMax;

      return { ...tank, isHealthy };
    });

    return res.json(processed);
  } catch (error) {
    console.error("Get tanks error:", error);
    return res.status(500).json({ error: "Failed to fetch tanks." });
  }
};

export const getTankStatus = async (req, res) => {
  const { tankId } = req.params;

  try {
    const tank = await findAccessibleTank(tankId, req.user);

    if (!tank) {
      return res.status(404).json({ error: "Tank not found or no access." });
    }

    return res.json({
      name: tank.name,
      tankId: tank.tankId,
      status: tank.status,
      currentStats: {
        temp: tank.lastTemp,
        pH: tank.lastPh,
        tds: tank.lastTds,
        turbidity: tank.lastTurb,
        waterLevel: tank.lastWaterLevel,
      },
    });
  } catch (error) {
    console.error("Get tank status error:", error);
    return res.status(500).json({ error: "Error fetching tank status." });
  }
};
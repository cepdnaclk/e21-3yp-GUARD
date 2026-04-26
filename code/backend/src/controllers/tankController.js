import prisma from "../lib/prisma.js";
import { findAccessibleTank } from "../lib/tankAccess.js";

const uniqueIds = (arr) => [...new Set(arr || [])];


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

    if (req.user.role === "SUPER_ADMIN") {
      where = {};
    } else if (req.user.role === "ADMIN") {
      where = { adminId: req.user.userId };
    } else if (req.user.role === "USER") {
      where = { workerIds: { has: req.user.userId } };
    } else {
      return res.status(403).json({ error: "Access denied." });
    }

    const tanks = await prisma.tank.findMany({ where });

    const tanksWithWorkers = await Promise.all(
      tanks.map(async (tank) => {
        let workers = [];
        if (Array.isArray(tank.workerIds) && tank.workerIds.length > 0) {
          workers = await prisma.user.findMany({
            where: { id: { in: tank.workerIds } },
            select: { id: true, username: true, fullName: true },
          });
        }
        return { ...tank, workers };
      })
    );

    const processed = tanksWithWorkers.map((tank) => {
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
    const tank = await prisma.tank.findUnique({
      where: { tankId },
      include: {
        workers: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });

    if (!tank) {
      return res.status(404).json({ error: "Tank not found." });
    }

    // Verify access
    const accessible = await findAccessibleTank(tankId, req.user);
    if (!accessible) {
      return res.status(403).json({ error: "Access denied." });
    }

    return res.json({
      name: tank.name,
      tankId: tank.tankId,
      status: tank.status,
      workers: tank.workers, // Include worker details
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

export const unassignUserFromTank = async (req, res) => {
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
      return res.status(404).json({ error: `Tank ${tankId} not found or you are not the owner.` });
    }

    const worker = await prisma.user.findFirst({
      where: { id: userId, role: "USER", adminId },
    });

    if (!worker) {
      return res.status(404).json({ error: "Worker not found or not created by you." });
    }

    const nextWorkerIds = (tank.workerIds || []).filter(id => id !== userId);
    const nextAssignedTankIds = (worker.assignedTankIds || []).filter(id => id !== tank.id);

    await prisma.tank.update({
      where: { id: tank.id },
      data: { workerIds: nextWorkerIds },
    });

    await prisma.user.update({
      where: { id: worker.id },
      data: { assignedTankIds: nextAssignedTankIds },
    });

    return res.status(200).json({ message: "User unassigned from tank successfully." });
  } catch (error) {
    console.error("Unassign user error:", error);
    return res.status(500).json({ error: "Failed to unassign user from tank." });
  }
};

export const deleteTankByAdmin = async (req, res) => {
  const { tankId } = req.params;
  const { name } = req.body;

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied- only for Admins" });
  }

  if (!name) {
    return res.status(400).json({ error: "name is required." });
  }

  try {
    const tank = await prisma.tank.findFirst({
      where: {
        tankId,
        name,
        adminId: req.user.userId,
      },
      select: {
        id: true,
        tankId: true,
        name: true,
      },
    });

    if (!tank) {
      return res.status(404).json({ error: "Tank not found." });
    }

    const assignedUsers = await prisma.user.findMany({
      where: {
        assignedTankIds: { has: tank.id },
      },
      select: {
        id: true,
        assignedTankIds: true,
      },
    });

    await Promise.all(
      assignedUsers.map((user) =>
        prisma.user.update({
          where: { id: user.id },
          data: {
            assignedTankIds: (user.assignedTankIds || []).filter((assignedTankId) => assignedTankId !== tank.id),
          },
        })
      )
    );

    await prisma.tank.delete({
      where: { id: tank.id },
    });

    return res.status(200).json({
      message: "Tank deleted successfully.",
      tankId: tank.tankId,
      name: tank.name,
    });
  } catch (error) {
    console.error("Delete tank error:", error);
    return res.status(500).json({ error: "Failed to delete tank." });
  }
};
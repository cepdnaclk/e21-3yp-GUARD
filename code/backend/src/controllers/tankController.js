import prisma from "../lib/prisma.js";
import { findAccessibleTank } from "../lib/tankAccess.js";

const uniqueIds = (arr) => [...new Set(arr || [])];

// Always store/look up product keys in XXXX-XXXX-XXXX-XXXX format
const formatProductKey = (raw) => {
  const clean = (raw || '').replace(/-/g, '').toUpperCase();
  return clean.replace(/(.{4})(?=.)/g, '$1-');
};


export const registerTank = async (req, res) => {
  const { productKey: rawKey, name, workerIds = [] } = req.body;
  const adminId = req.user.userId;

  if (!rawKey || !name) {
    return res.status(400).json({ error: "productKey and name are required." });
  }

  const productKey = formatProductKey(rawKey);

  try {
    const tank = await prisma.tank.findUnique({
      where: { productKey }
    });

    if (!tank) {
      return res.status(404).json({ error: "Invalid product key. Please check the key on your device." });
    }

    if (tank.isRegistered) {
      return res.status(400).json({ error: "This device is already registered to an account." });
    }

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

    // Claim the device: assign this admin, set name, mark registered
    const updatedTank = await prisma.tank.update({
      where: { id: tank.id },
      data: {
        adminId,
        name,
        workerIds: cleanWorkerIds,
        isRegistered: true,
      },
    });

    return res.status(200).json({
      message: "Device registered successfully.",
      tank: updatedTank,
    });
  } catch (error) {
    console.error("Tank registration error:", error);
    return res.status(500).json({ error: "Registration failed." });
  }
};

export const addProduct = async (req, res) => {
  const { productKey: rawKey, tankId } = req.body;

  if (req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Only Super Admin can add products." });
  }

  if (!rawKey || !tankId) {
    return res.status(400).json({ error: "productKey and tankId are required." });
  }

  const productKey = formatProductKey(rawKey);

  try {
    // Device enters DB with NO admin — it floats until an admin claims it with the product key
    const tank = await prisma.tank.create({
      data: {
        tankId,
        productKey,
        name: "Unregistered Device",
        isRegistered: false,
      },
    });

    return res.status(201).json({
      message: "Product added to inventory. Admin can now register it using the product key.",
      tank,
    });
  } catch (error) {
    console.error("Add product error:", error);
    return res.status(400).json({ error: "Failed to add product. Product Key or Tank ID might already exist." });
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
      updatedAt: tank.updatedAt,
      workers: tank.workers,
      currentStats: {
        temp: tank.lastTemp,
        pH: tank.lastPh,
        tds: tank.lastTds,
        turbidity: tank.lastTurb,
        waterLevel: tank.lastWaterLevel,
        lastReadingTime: tank.lastReadingTime,
      },
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
  const isSuperAdmin = req.user.role === "SUPER_ADMIN";
  const isAdmin = req.user.role === "ADMIN";

  if (!isSuperAdmin && !isAdmin) {
    return res.status(403).json({ error: "Access denied." });
  }

  // ADMIN must confirm with device name; SUPER_ADMIN can delete by tankId alone
  if (isAdmin && !name) {
    return res.status(400).json({ error: "name is required." });
  }

  try {
    const whereClause = isSuperAdmin
      ? { tankId }
      : { tankId, name, adminId: req.user.userId };

    const tank = await prisma.tank.findFirst({
      where: whereClause,
      select: { id: true, tankId: true, name: true },
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
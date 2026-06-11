import prisma from "../lib/prisma.js";
import { findAccessibleTank } from "../lib/tankAccess.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import { addTankToAllowlist } from "../services/mqttService.js";

const uniqueIds = (arr) => [...new Set(arr || [])];

// Always store/look up product keys in XXXX-XXXX-XXXX-XXXX format
const formatProductKey = (raw) => {
  const clean = (raw || '').replace(/-/g, '').toUpperCase();
  return clean.replace(/(.{4})(?=.)/g, '$1-');
};


export const registerTank = asyncHandler(async (req, res) => {
  const { productKey: rawKey, name, workerIds = [] } = req.body;
  const adminId = req.user.userId;

  if (!rawKey || !name) {
    throw new AppError("productKey and name are required.", 400);
  }

  const productKey = formatProductKey(rawKey);

  const tank = await prisma.tank.findUnique({
    where: { productKey }
  });

  if (!tank) {
    throw new AppError("Invalid product key. Please check the key on your device.", 404);
  }

  if (tank.isRegistered) {
    throw new AppError("This device is already registered to an account.", 400);
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
      throw new AppError("One or more users are invalid or not under this admin.", 400);
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

  // Immediately add to the in-memory MQTT allowlist so the device can
  // start sending data without waiting for the next cache refresh cycle.
  addTankToAllowlist(updatedTank.tankId);

  return res.status(200).json({
    message: "Device registered successfully.",
    tank: updatedTank,
  });
});

export const addProduct = asyncHandler(async (req, res) => {
  const { productKey: rawKey, tankId } = req.body;

  if (req.user.role !== "SUPER_ADMIN") {
    throw new AppError("Only Super Admin can add products.", 403);
  }

  if (!rawKey || !tankId) {
    throw new AppError("productKey and tankId are required.", 400);
  }

  const productKey = formatProductKey(rawKey);

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
});

export const assignUserToTank = asyncHandler(async (req, res) => {
  const { tankId } = req.params;
  const { userId } = req.body;
  const adminId = req.user.userId;

  if (!userId) {
    throw new AppError("userId is required.", 400);
  }

  const tank = await prisma.tank.findFirst({
    where: { tankId, adminId },
  });

  if (!tank) {
    throw new AppError("Tank not found for this admin.", 404);
  }

  const worker = await prisma.user.findFirst({
    where: { id: userId, role: "USER", adminId },
  });

  if (!worker) {
    throw new AppError("User not found under this admin.", 404);
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
});

export const getAllTanks = asyncHandler(async (req, res) => {
  let where = {};

  if (req.user.role === "SUPER_ADMIN") {
    where = {};
  } else if (req.user.role === "ADMIN") {
    where = { adminId: req.user.userId };
  } else if (req.user.role === "USER") {
    where = { workerIds: { has: req.user.userId } };
  } else {
    throw new AppError("Access denied.", 403);
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
});

export const getTankStatus = asyncHandler(async (req, res) => {
  const { tankId } = req.params;

  const tank = await prisma.tank.findUnique({
    where: { tankId },
    include: {
      workers: {
        select: { id: true, fullName: true, username: true }
      }
    }
  });

  if (!tank) {
    throw new AppError("Tank not found.", 404);
  }

  // Verify access
  const accessible = await findAccessibleTank(tankId, req.user);
  if (!accessible) {
    throw new AppError("Access denied.", 403);
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
});

export const unassignUserFromTank = asyncHandler(async (req, res) => {
  const { tankId } = req.params;
  const { userId } = req.body;
  const adminId = req.user.userId;

  if (!userId) {
    throw new AppError("userId is required.", 400);
  }

  const tank = await prisma.tank.findFirst({
    where: { tankId, adminId },
  });

  if (!tank) {
    throw new AppError(`Tank ${tankId} not found or you are not the owner.`, 404);
  }

  const worker = await prisma.user.findFirst({
    where: { id: userId, role: "USER", adminId },
  });

  if (!worker) {
    throw new AppError("Worker not found or not created by you.", 404);
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
});

export const deleteTankByAdmin = asyncHandler(async (req, res) => {
  const { tankId } = req.params;
  const { name } = req.body;
  const isSuperAdmin = req.user.role === "SUPER_ADMIN";
  const isAdmin = req.user.role === "ADMIN";

  if (!isSuperAdmin && !isAdmin) {
    throw new AppError("Access denied.", 403);
  }

  // ADMIN must confirm with device name; SUPER_ADMIN can delete by tankId alone
  if (isAdmin && !name) {
    throw new AppError("name is required.", 400);
  }

  const whereClause = isSuperAdmin
    ? { tankId }
    : { tankId, name, adminId: req.user.userId };

  const tank = await prisma.tank.findFirst({
    where: whereClause,
    select: { id: true, tankId: true, name: true },
  });

  if (!tank) {
    throw new AppError("Tank not found.", 404);
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
});
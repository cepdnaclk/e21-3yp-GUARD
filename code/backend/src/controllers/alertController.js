import prisma from '../lib/prisma.js';
import { clearAlertCooldown } from '../services/mqttService.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../lib/AppError.js';

export const getAlerts = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const { tankId, resolved } = req.query;

    let query = {};

    // 1. Role-based access control
    if (role === 'ADMIN') {
        query.tank = { adminId: userId };
    } else if (role === 'USER') {
        query.tank = { workerIds: { has: userId } };
    }

    // 2. Filters
    if (tankId) query.tankId = tankId;
    if (resolved === 'true' || resolved === 'false') query.resolved = resolved === 'true';

    const alerts = await prisma.alert.findMany({
        where: query,
        include: {
            tank: {
                select: { name: true, tankId: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    res.json(alerts);
});

export const resolveAlert = asyncHandler(async (req, res) => {
    const { alertId } = req.body;
    const { userId, role } = req.user;

    if (!alertId) throw new AppError('alertId is required', 400);

    // Find the alert and its tank to verify access
    const alert = await prisma.alert.findUnique({
        where: { id: alertId },
        include: { tank: true }
    });

    if (!alert) throw new AppError('Alert not found', 404);

    // Verify access
    const isOwner = role === 'ADMIN' && alert.tank.adminId === userId;
    const isWorker = role === 'USER' && alert.tank.workerIds.includes(userId);

    if (!isOwner && !isWorker) {
        throw new AppError('You do not have permission to resolve this alert', 403);
    }

    const updated = await prisma.alert.update({
        where: { id: alertId },
        data: { resolved: true }
    });

    // Clear the cooldown for this category so a new alert can trigger 
    // if the condition still exists on the next sensor reading.
    clearAlertCooldown(updated.tankId, updated.type);

    res.json({ message: 'Alert resolved successfully', alert: updated });
});

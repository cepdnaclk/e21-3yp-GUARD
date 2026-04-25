import prisma from '../lib/prisma.js';

export const getAlerts = async (req, res) => {
    const { userId, role } = req.user;
    const { tankId, resolved } = req.query;

    try {
        let query = {};

        // 1. Role-based access control
        if (role === 'ADMIN') {
            // Admins see alerts for tanks they own
            query.tank = { adminId: userId };
        } else if (role === 'USER') {
            // Workers see alerts for tanks they are assigned to
            query.tank = { workerIds: { has: userId } };
        }

        // 2. Filters
        if (tankId) query.tankId = tankId;
        if (resolved !== undefined) query.resolved = resolved === 'true';

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
    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
};

export const resolveAlert = async (req, res) => {
    const { alertId } = req.body;
    const { userId, role } = req.user;

    if (!alertId) return res.status(400).json({ error: 'alertId is required' });

    try {
        // Find the alert and its tank to verify access
        const alert = await prisma.alert.findUnique({
            where: { id: alertId },
            include: { tank: true }
        });

        if (!alert) return res.status(404).json({ error: 'Alert not found' });

        // Verify access
        const isOwner = role === 'ADMIN' && alert.tank.adminId === userId;
        const isWorker = role === 'USER' && alert.tank.workerIds.includes(userId);

        if (!isOwner && !isWorker) {
            return res.status(403).json({ error: 'You do not have permission to resolve this alert' });
        }

        const updated = await prisma.alert.update({
            where: { id: alertId },
            data: { resolved: true }
        });

        res.json({ message: 'Alert resolved successfully', alert: updated });
    } catch (error) {
        console.error('Resolve alert error:', error);
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
};

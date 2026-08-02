import prisma from './prisma.js';

/**
 * Finds a tank that the given user has permission to access.
 * SUPER_ADMIN: can access any tank.
 * ADMIN: must own the tank.
 * USER:  must be in the tank's workerIds.
 */
export const findAccessibleTank = async (tankId, user) => {
  if (!tankId) return null;
  const tankIdCondition = { equals: tankId, mode: 'insensitive' };

  if (user.role === 'SUPER_ADMIN') {
    return prisma.tank.findFirst({
      where: { tankId: tankIdCondition },
    });
  }

  if (user.role === 'ADMIN') {
    return prisma.tank.findFirst({
      where: { tankId: tankIdCondition, adminId: user.userId },
    });
  }

  if (user.role === 'USER') {
    return prisma.tank.findFirst({
      where: { tankId: tankIdCondition, workerIds: { has: user.userId } },
    });
  }

  return null;
};

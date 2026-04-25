import prisma from './prisma.js';

/**
 * Finds a tank that the given user has permission to access.
 * ADMIN: must own the tank.
 * USER:  must be in the tank's workerIds.
 */
export const findAccessibleTank = async (tankId, user) => {
  if (user.role === 'ADMIN') {
    return prisma.tank.findFirst({
      where: { tankId, adminId: user.userId },
    });
  }

  if (user.role === 'USER') {
    return prisma.tank.findFirst({
      where: { tankId, workerIds: { has: user.userId } },
    });
  }

  return null;
};

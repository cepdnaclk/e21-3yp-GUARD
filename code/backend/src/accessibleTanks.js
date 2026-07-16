export function accessibleTanks(user, allTanks) {
  if (user === null || typeof user !== 'object' || Array.isArray(user)) {
    throw new TypeError('user must be an object');
  }

  if (!Array.isArray(allTanks)) {
    throw new TypeError('allTanks must be an array');
  }

  const role = user.role;

  if (role === 'SUPER_ADMIN') {
    return [...allTanks];
  }

  if (role === 'ADMIN') {
    if (!user.organizationId) {
      throw new TypeError('ADMIN user must include organizationId');
    }

    return allTanks.filter((tank) => tank.organizationId === user.organizationId);
  }

  if (role === 'WORKER') {
    if (!Array.isArray(user.assignedTankIds)) {
      return [];
    }

    const assignedTankIds = new Set(user.assignedTankIds);
    return allTanks.filter((tank) => assignedTankIds.has(tank.id));
  }

  throw new RangeError('Unknown role');
}

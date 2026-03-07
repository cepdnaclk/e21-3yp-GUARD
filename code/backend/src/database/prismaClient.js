'use strict';

const { PrismaClient } = require('@prisma/client');

// Prevent multiple Prisma Client instances in development hot-reload scenarios.
// In production there is no module caching issue, so a fresh instance is always created.
const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;

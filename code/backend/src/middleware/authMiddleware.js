'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const prisma = require('../database/prismaClient');
const logger = require('../utils/logger');

/**
 * Express middleware that validates a Bearer JWT token on every protected route.
 * On success, attaches the full user record to req.user and calls next().
 * On failure, returns a 401 JSON response.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.slice(7); // Strip "Bearer " prefix

  try {
    const payload = jwt.verify(token, config.jwt.secret);

    // Re-query the user to confirm the account still exists in the database.
    // This prevents zombied tokens from working after account deletion.
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User no longer exists.' });
    }

    req.user = user;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token has expired.' });
    }
    logger.warn(`[Auth] Invalid token attempt: ${err.message}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token.' });
  }
}

module.exports = authMiddleware;

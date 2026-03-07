'use strict';

const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const prisma = require('../../database/prismaClient');
const logger = require('../../utils/logger');

const oauthClient = new OAuth2Client(config.google.clientId);

/**
 * Verifies a Google ID token against the configured Client ID.
 * Returns the decoded payload on success; throws on invalid token.
 *
 * @param {string} idToken - The Google ID token from the frontend (credential from Google Sign-In)
 * @returns {Promise<import('google-auth-library').TokenPayload>}
 */
async function verifyGoogleToken(idToken) {
  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: config.google.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Invalid Google token: empty payload');
  }

  return payload; // { sub, email, name, picture, email_verified, ... }
}

/**
 * Upserts a user record based on the Google OAuth payload.
 * Creates the user on first login; updates name/email on subsequent logins.
 *
 * @param {{ sub: string, email: string, name: string }} payload
 * @returns {Promise<import('@prisma/client').User>}
 */
async function findOrCreateUser(payload) {
  const user = await prisma.user.upsert({
    where: { googleId: payload.sub },
    update: {
      name: payload.name,
      email: payload.email,
    },
    create: {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
    },
  });

  logger.debug(`[Auth] User ${user.id} (${user.email}) authenticated via Google.`);
  return user;
}

/**
 * Signs and returns a JWT for the given user.
 * The token is valid for the duration configured in JWT_EXPIRY (default: 1d).
 *
 * @param {{ id: string, email: string, name: string }} user
 * @returns {string}
 */
function generateJWT(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiry }
  );
}

module.exports = { verifyGoogleToken, findOrCreateUser, generateJWT };

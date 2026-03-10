'use strict';

const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const prisma = require('../../database/prismaClient');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = 10;

const oauthClient = config.google.clientId
  ? new OAuth2Client(config.google.clientId)
  : null;

// ─── Username/Password ───────────────────────────────────────────────────────

async function registerUser({ username, password, fullName, email, phoneNumber, address }) {
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      fullName,
      email:       email       || null,
      phoneNumber: phoneNumber || null,
      address:     address     || null,
    },
  });

  logger.info(`[Auth] User ${user.id} (${user.username}) registered.`);
  return user;
}

async function loginUser(login, password) {
  // Accept username OR email — determine which field was supplied
  const isEmail = login.includes('@');
  const user = isEmail
    ? await prisma.user.findFirst({ where: { email: login } })
    : await prisma.user.findUnique({ where: { username: login } });

  if (!user || !user.password) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return user;
}

// ─── Google OAuth ────────────────────────────────────────────────────────────

async function verifyGoogleToken(idToken) {
  if (!oauthClient) {
    throw new Error('Google OAuth is not configured (GOOGLE_CLIENT_ID missing).');
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: config.google.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Invalid Google token: empty payload');
  }

  return payload;
}

async function findOrCreateGoogleUser(payload) {
  // Check if a user with this googleId already exists
  const existing = await prisma.user.findUnique({ where: { googleId: payload.sub } });

  if (existing) {
    // Update name/email on each login
    const user = await prisma.user.update({
      where: { googleId: payload.sub },
      data: {
        fullName: payload.name || existing.fullName,
        email:    payload.email || existing.email,
      },
    });
    logger.debug(`[Auth] Google user ${user.id} (${user.username}) logged in.`);
    return user;
  }

  // Create new user — use email prefix as username, ensure uniqueness
  let username = payload.email.split('@')[0];
  const taken = await prisma.user.findUnique({ where: { username } });
  if (taken) {
    username = `${username}_${Date.now()}`;
  }

  const user = await prisma.user.create({
    data: {
      username,
      googleId: payload.sub,
      fullName: payload.name || payload.email,
      email:    payload.email,
    },
  });

  logger.info(`[Auth] Google user ${user.id} (${user.username}) created.`);
  return user;
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

function generateJWT(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiry }
  );
}

module.exports = { registerUser, loginUser, verifyGoogleToken, findOrCreateGoogleUser, generateJWT };

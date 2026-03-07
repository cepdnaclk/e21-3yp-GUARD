'use strict';

const { body, validationResult } = require('express-validator');
const { verifyGoogleToken, findOrCreateUser, generateJWT } = require('./auth.service');
const logger = require('../../utils/logger');

// ─── Validation rules ────────────────────────────────────────────────────────
const googleLoginValidation = [
  body('idToken').notEmpty().withMessage('idToken is required'),
];

// ─── POST /auth/google ───────────────────────────────────────────────────────
/**
 * Accepts a Google ID token from the frontend, verifies it with Google,
 * creates or updates the user record, then returns a signed JWT.
 *
 * Request body: { idToken: string }
 * Response:     { token: string, user: { id, email, name } }
 */
async function googleLogin(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const { idToken } = req.body;

    const googlePayload = await verifyGoogleToken(idToken);
    const user = await findOrCreateUser(googlePayload);
    const token = generateJWT(user);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    logger.error(`[Auth] Google login error: ${err.message}`);
    // Surface auth errors as 401, not 500
    if (
      err.message.includes('Invalid') ||
      err.message.includes('Token') ||
      err.message.includes('expired')
    ) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired Google token.' });
    }
    return next(err);
  }
}

// ─── GET /auth/me ────────────────────────────────────────────────────────────
/**
 * Returns the currently authenticated user's profile.
 * Requires a valid JWT (populated by authMiddleware as req.user).
 */
async function getMe(req, res) {
  return res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    createdAt: req.user.createdAt,
  });
}

module.exports = { googleLogin, googleLoginValidation, getMe };

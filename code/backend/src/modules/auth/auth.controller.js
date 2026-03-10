'use strict';

const { body, validationResult } = require('express-validator');
const { registerUser, loginUser, verifyGoogleToken, findOrCreateGoogleUser, generateJWT } = require('./auth.service');
const logger = require('../../utils/logger');

// ─── Validation rules ────────────────────────────────────────────────────────
const registerValidation = [
  body('username').isLength({ min: 3 }).withMessage('username must be at least 3 characters'),
  body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  body('fullName').notEmpty().withMessage('fullName is required'),
  body('email').optional().isEmail().withMessage('email must be a valid email'),
  body('phoneNumber').optional().isString(),
  body('address').optional().isString(),
];

const loginValidation = [
  body('login').notEmpty().withMessage('username or email is required'),
  body('password').notEmpty().withMessage('password is required'),
];

const googleLoginValidation = [
  body('idToken').notEmpty().withMessage('idToken is required'),
];

// ─── POST /auth/register ─────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const user = await registerUser(req.body);
    const token = generateJWT(user);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict', message: 'Username already exists.' });
    }
    logger.error(`[Auth] Registration error: ${err.message}`);
    return next(err);
  }
}

// ─── POST /auth/login ────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const { login, password } = req.body;
    const user = await loginUser(login, password);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials.' });
    }

    const token = generateJWT(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err) {
    logger.error(`[Auth] Login error: ${err.message}`);
    return next(err);
  }
}

// ─── POST /auth/google ────────────────────────────────────────────────────────
async function googleLogin(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const { idToken } = req.body;

    const googlePayload = await verifyGoogleToken(idToken);
    const user = await findOrCreateGoogleUser(googlePayload);
    const token = generateJWT(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err) {
    logger.error(`[Auth] Google login error: ${err.message}`);
    if (
      err.message.includes('Invalid') ||
      err.message.includes('Token') ||
      err.message.includes('expired') ||
      err.message.includes('not configured')
    ) {
      return res.status(401).json({ error: 'Unauthorized', message: err.message });
    }
    return next(err);
  }
}

// ─── GET /auth/me ────────────────────────────────────────────────────────────
async function getMe(req, res) {
  return res.json({
    id: req.user.id,
    username: req.user.username,
    fullName: req.user.fullName,
    email: req.user.email,
    phoneNumber: req.user.phoneNumber,
    address: req.user.address,
    createdAt: req.user.createdAt,
  });
}

module.exports = {
  register, registerValidation,
  login, loginValidation,
  googleLogin, googleLoginValidation,
  getMe,
};

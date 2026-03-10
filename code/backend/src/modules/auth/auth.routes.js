'use strict';

const { Router } = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const {
  register, registerValidation,
  login, loginValidation,
  googleLogin, googleLoginValidation,
  getMe,
} = require('./auth.controller');

const router = Router();

// POST /auth/register — public (username/password)
router.post('/register', registerValidation, register);

// POST /auth/login — public (username/password)
router.post('/login', loginValidation, login);

// POST /auth/google — public (Google OAuth)
router.post('/google', googleLoginValidation, googleLogin);

// GET /auth/me — protected
router.get('/me', authMiddleware, getMe);

module.exports = router;

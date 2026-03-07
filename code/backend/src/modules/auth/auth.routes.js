'use strict';

const { Router } = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const { googleLogin, googleLoginValidation, getMe } = require('./auth.controller');

const router = Router();

// POST /auth/google — public, no JWT required
router.post('/google', googleLoginValidation, googleLogin);

// GET /auth/me — protected
router.get('/me', authMiddleware, getMe);

module.exports = router;

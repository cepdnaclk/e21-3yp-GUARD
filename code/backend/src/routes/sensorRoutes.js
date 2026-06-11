import express from 'express';
import { logData, getTankHistory } from '../controllers/sensorController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { verifyDeviceKey } from '../middleware/deviceAuth.js';

const router = express.Router();

// Route 1: The ESP32 Hardware Route — protected by shared device API key (X-Device-Key header)
router.post('/log', verifyDeviceKey, logData);

// Route 2: The Frontend Analytics Route (Token REQUIRED)
router.get('/history/:tankId', verifyToken, getTankHistory);

export default router;
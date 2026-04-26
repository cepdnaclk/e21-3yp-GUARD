import express from 'express';
import { logData, getTankHistory } from '../controllers/sensorController.js';
import { verifyToken } from '../middleware/authMiddleware.js'; // Import the bouncer!

const router = express.Router();

// Route 1: The ESP32 Hardware Route (No Token Required)
router.post('/log', logData);

// Route 2: The Frontend Analytics Route (Token REQUIRED)
router.get('/history/:tankId', verifyToken, getTankHistory);

export default router;
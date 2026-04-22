// Tank routes
import express from 'express';
import { registerTank, getTankStatus, getAllTanks } from '../controllers/tankController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All tank routes should be protected by your JWT token
router.post('/register', verifyToken, registerTank);
router.get('/', verifyToken, getAllTanks);             // Gets all tanks for the dashboard
router.get('/:tankId/status', verifyToken, getTankStatus); // Gets specific tank status

export default router;
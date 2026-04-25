import express from 'express';
import { getAlerts, resolveAlert } from '../controllers/alertController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { processAlert } from '../services/mqttService.js';

const router = express.Router();

router.get('/', verifyToken, getAlerts);
router.post('/resolve', verifyToken, resolveAlert);

// 🧪 TEST ENDPOINT: Simulate an MQTT alert trigger
router.post('/test-mqtt-alert', async (req, res) => {
    const { tankId, parameter, alertType, value } = req.body;
    
    if (!tankId) return res.status(400).json({ error: 'tankId is required' });

    try {
        await processAlert(
            tankId, 
            parameter || 'Temperature', 
            alertType || 'CRITICAL HIGH', 
            value || 42.5
        );
        res.json({ message: 'Simulated MQTT alert processed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

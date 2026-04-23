import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/authRoutes.js';
import tankRoutes from './routes/tankRoutes.js';     // ADDED THIS IMPORT
import sensorRoutes from './routes/sensorRoutes.js'; // ADDED THIS IMPORT
import prisma from './lib/prisma.js'; 
import { initMqtt } from './services/mqttService.js';

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tanks', tankRoutes);     // ADDED THIS ROUTE
app.use('/api/sensors', sensorRoutes); // ADDED THIS ROUTE

app.get('/', (req, res) => res.send('Water IoT Backend is running!'));

const PORT = process.env.PORT || 5000; // Added fallback port just in case

// UPDATE THE LISTEN BLOCK
app.listen(PORT, async () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
    
    // Check Database Connection
    try {
        await prisma.$connect();
        initMqtt(); // 2. START THE MQTT LISTENER
        console.log('✅ MongoDB securely connected via Prisma!');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1); // Stop the server if the database is dead
    }
});
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
import authRoutes from './routes/authRoutes.js';
import tankRoutes from './routes/tankRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import fishRoutes from './routes/fishRoutes.js';
import prisma from './lib/prisma.js'; 
import { writeApi } from './lib/influx.js';
import { initMqtt, shutdownMqtt } from './services/mqttService.js';
import { pollTelegramUpdates } from './services/telegramService.js';
import { errorHandler } from './middleware/errorHandler.js';
import { Server } from 'socket.io';

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
}));
app.use(express.json());
// Serve locally uploaded fish images
app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tanks', tankRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/fish', fishRoutes);

app.get('/', (req, res) => res.send('Water IoT Backend is running!'));

// Catch-all for undefined routes
app.use((req, res) => {
    console.log(`🔍 404 - ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Central error handler — must be registered AFTER all routes
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
    
    // Initialize Socket.io
    const io = new Server(server, {
        cors: {
            origin: corsOrigins,
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 New client connected: ${socket.id}`);
        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    try {
        await prisma.$connect();
        initMqtt(io);
        console.log('✅ MongoDB securely connected via Prisma!');
        
        // Start Telegram Bot polling loop
        globalThis.telegramInterval = setInterval(pollTelegramUpdates, 3000);
        console.log('🤖 Telegram Bot updates polling initiated.');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
});

// Graceful shutdown — close connections cleanly on SIGTERM/SIGINT
const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    
    shutdownMqtt();
    if (globalThis.telegramInterval) {
        clearInterval(globalThis.telegramInterval);
    }
    
    try {
        await writeApi.close();
        console.log('✅ InfluxDB write buffer flushed.');
    } catch { /* ignore */ }
    
    await prisma.$disconnect();
    console.log('✅ Prisma disconnected.');
    
    server.close(() => {
        console.log('✅ HTTP server closed.');
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// nodemon sends SIGUSR2 to restart — clean up MQTT so old clients don't linger
process.once('SIGUSR2', async () => {
    console.log('\n🔄 nodemon restart — cleaning up MQTT...');
    shutdownMqtt();
    if (globalThis.telegramInterval) {
        clearInterval(globalThis.telegramInterval);
    }
    try { await writeApi.close(); } catch { /* ignore */ }
    await prisma.$disconnect();
    process.kill(process.pid, 'SIGUSR2');
});
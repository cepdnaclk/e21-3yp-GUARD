import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/authRoutes.js';
import tankRoutes from './routes/tankRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import prisma from './lib/prisma.js'; 
import { writeApi } from './lib/influx.js';
import { initMqtt, shutdownMqtt } from './services/mqttService.js';
import { Server } from 'socket.io';

const app = express();
let io;

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

// Request logger
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tanks', tankRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);

app.get('/', (req, res) => res.send('Water IoT Backend is running!'));

// Catch-all for undefined routes
app.use((req, res) => {
    console.log(`🔍 404 - ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
    
    // Initialize Socket.io
    io = new Server(server, {
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
        initMqtt();
        console.log('✅ MongoDB securely connected via Prisma!');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
});

// Graceful shutdown
const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    shutdownMqtt();
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
    try { await writeApi.close(); } catch { /* ignore */ }
    await prisma.$disconnect();
    process.kill(process.pid, 'SIGUSR2');
});

export { io };
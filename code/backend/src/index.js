import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
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

// ── Allowed CORS origins (comma-separated in env) ────────────────────────────
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

// ── Security headers (helmet) ─────────────────────────────────────────────────
// Disable contentSecurityPolicy here so it doesn't interfere with the frontend
// dev server; tighten in production via CSP env var or reverse-proxy config.
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS — allow cookies to be sent cross-origin ─────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (origin is undefined) and whitelisted origins
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} is not allowed`));
  },
  credentials: true,          // Required for HttpOnly cookie transport
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Key'],
}));

// ── Cookie parser (for HttpOnly JWT cookie) ───────────────────────────────────
app.use(cookieParser());

// ── Body parser with size limit (prevents payload-based DoS) ─────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Global rate limiter ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ── Strict auth rate limiter (login, register, forgot-password, OTP) ─────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests. Please wait 15 minutes before trying again.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-email', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);
app.use('/api/auth/profile/verify-email', authLimiter);
app.use('/api/auth/profile/verify-phone', authLimiter);

// ── Static file serving ───────────────────────────────────────────────────────
// Serve locally uploaded fish / profile images
app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
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
            methods: ["GET", "POST"],
            credentials: true,
        }
    });

    // ── Socket.IO JWT authentication middleware ───────────────────────────────
    // Only clients that supply a valid JWT (in handshake auth or cookie) may connect.
    io.use((socket, next) => {
        // Prefer token from handshake auth, fall back to cookie
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.cookie
                ?.split(';')
                .find(c => c.trim().startsWith('token='))
                ?.split('=')[1];

        if (!token) return next(new Error('Authentication required'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch {
            next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Authenticated client connected: ${socket.id} (userId=${socket.user?.userId})`);
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
// Tank controller logic
import prisma from '../lib/prisma.js';

// 1. Register a new ESP32 hardware device (Admin Only)
export const registerTank = async (req, res) => {
    const { name, tankId } = req.body;
    const userId = req.user.userId; // Securely grabbed from your JWT Token

    try {
        const tank = await prisma.tank.create({
            data: {
                name,
                tankId,
                userId
            }
        });
        res.status(201).json({ message: "G.U.A.R.D. Tank registered successfully!", tank });
    } catch (error) {
        console.error("Tank Registration Error:", error);
        res.status(400).json({ error: "Registration failed. Tank ID might already exist." });
    }
};

// 2. Get the real-time status of a specific tank
export const getTankStatus = async (req, res) => {
    const { tankId } = req.params;

    try {
        const tank = await prisma.tank.findUnique({
            where: { tankId },
            include: {
                readings: {
                    orderBy: { timestamp: 'desc' },
                    take: 1 // Only fetch the single newest reading for speed
                }
            }
        });

        if (!tank) return res.status(404).json({ error: "Tank not found" });

        res.json({
            name: tank.name,
            status: tank.status,
            currentStats: {
                temp: tank.lastTemp,
                pH: tank.lastPh,
                tds: tank.lastTds,
                turbidity: tank.lastTurb
            },
            history: tank.readings[0] || null
        });
    } catch (error) {
        res.status(500).json({ error: "Error fetching status" });
    }
};

// 3. Admin Dashboard Overview (Gets all tanks and checks health)
export const getAllTanks = async (req, res) => {
    try {
        const tanks = await prisma.tank.findMany();
        
        // Dynamically calculate if each tank is "Healthy" based on Admin ranges
        const processedTanks = tanks.map(tank => {
            const isHealthy = (
                tank.lastTemp >= tank.tempMin && tank.lastTemp <= tank.tempMax &&
                tank.lastPh >= tank.phMin && tank.lastPh <= tank.phMax
            );

            return {
                ...tank,
                isHealthy
            };
        });

        res.json(processedTanks);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
};
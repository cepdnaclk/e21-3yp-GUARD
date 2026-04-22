// Auth controller logic
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export const register = async (req, res) => {
    const { username, email, password, role, fullName, address, phoneNumber } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: role || 'USER',
                fullName,
                address,
                phoneNumber
            }
        });
        res.status(201).json({ message: "User created successfully", userId: user.id });
    } catch (error) {
        console.error("🚨 REAL PRISMA ERROR:", error);
        //res.status(400).json({ error: "Registration failed. Username/Email may exist." });
    }
};

export const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );
        res.json({ token, role: user.role, fullName: user.fullName });
    } catch (error) {
        console.error("🚨 REAL PRISMA ERROR:", error);
        res.status(500).json({ error: "Login error" });
    }
};
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

const ensureUniqueUser = async (username, email) => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });
  return !existing;
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
      { expiresIn: "2h" }
    );

    return res.json({
      token,
      role: user.role,
      fullName: user.fullName,
      adminId: user.adminId || null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login error" });
  }
};

export const createAdminBySuperAdmin = async (req, res) => {
  const { username, email, password, fullName, address, phoneNumber } = req.body;

  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ error: "username, email, password, fullName are required." });
  }

  try {
    const isUnique = await ensureUniqueUser(username, email);
    if (!isUnique) {
      return res.status(409).json({ error: "Username or email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: "ADMIN",
        fullName,
        address,
        phoneNumber,
      },
    });

    return res.status(201).json({
      message: "Admin account created.",
      userId: user.id,
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return res.status(500).json({ error: "Failed to create admin account." });
  }
};

export const createUserByAdmin = async (req, res) => {
  const { username, email, password, fullName, address, phoneNumber } = req.body;
  const adminId = req.user.userId;

  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ error: "username, email, password, fullName are required." });
  }

  try {
    const isUnique = await ensureUniqueUser(username, email);
    if (!isUnique) {
      return res.status(409).json({ error: "Username or email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: "USER",
        fullName,
        address,
        phoneNumber,
        adminId,
      },
    });

    return res.status(201).json({
      message: "User account created under admin.",
      userId: user.id,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ error: "Failed to create user account." });
  }
};
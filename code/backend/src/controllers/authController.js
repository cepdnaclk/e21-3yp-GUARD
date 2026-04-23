import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import prisma from "../lib/prisma.js";

const DEFAULT_GOOGLE_CLIENT_ID = "108391237039-0jg9nf8pjn48vi5bqi8bbth2kfe03vtm.apps.googleusercontent.com";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID);

const ensureUniqueUser = async (username, email) => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });
  return !existing;
};

const buildFallbackEmail = (username) => `${username}@local.guard`;

const buildUniqueUsername = async (email, fallbackName = "google_user") => {
  const seed = (email?.split("@")[0] || fallbackName)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 24) || "google_user";

  let candidate = seed;
  let counter = 1;

  while (true) {
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
    counter += 1;
    candidate = `${seed}_${counter}`.slice(0, 30);
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

export const register = async (req, res) => {
  const { username, password, fullName, email, phoneNumber, address } = req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: "username, password, and fullName are required." });
  }

  const resolvedEmail = email || buildFallbackEmail(username);

  try {
    const isUnique = await ensureUniqueUser(username, resolvedEmail);
    if (!isUnique) {
      return res.status(409).json({ error: "Username or email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email: resolvedEmail,
        password: hashedPassword,
        role: "USER",
        fullName,
        address,
        phoneNumber,
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(201).json({
      token,
      role: user.role,
      fullName: user.fullName,
      username: user.username,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || null,
        address: user.address || null,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Registration error" });
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

export const googleLogin = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "idToken is required." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const fullName = payload?.name || "Google User";

    if (!email) {
      return res.status(400).json({ error: "Google account email is required." });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const username = await buildUniqueUsername(email, fullName);
      const generatedPassword = crypto.randomBytes(24).toString("hex");
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          role: "USER",
          fullName,
        },
      });
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
      username: user.username,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || null,
        address: user.address || null,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error.message);
    return res.status(401).json({ error: "Invalid Google token." });
  }
};
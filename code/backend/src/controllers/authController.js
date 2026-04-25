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

//get all users created by an admin (for admin dashboard)
export const getUsersByAdmin = async (req, res) => {
  try {
    // only ADMIN should use this
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied- only for Admins" });
    }

    const workers = await prisma.user.findMany({
      where: {
        adminId: req.user.userId, //key part
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        assignedTankIds: true,
      }, orderBy: {
        id: "desc",
      },
    });

    res.status(200).json(workers);
  } catch (error) {
    console.error("Fetch workers error:", error);
    res.status(500).json({ error: "Failed to fetch workers" });
  }
};

// Get all admins (for SUPER_ADMIN dashboard)
export const getAdminsBySuperAdmin = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Access denied - only for Super Admins" });
    }

    // Admins are not linked to SUPER_ADMIN via adminId in the schema.
    // Simply fetch all users with role ADMIN.
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        phoneNumber: true,
        address: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(admins);
  } catch (error) {
    console.error("Fetch admins error:", error);
    return res.status(500).json({ error: "Failed to fetch admins" });
  }
};

// Delete an admin (for SUPER_ADMIN only)
export const deleteAdminBySuperAdmin = async (req, res) => {
  const { adminId } = req.params;
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Access denied - only for Super Admins" });
    }

    const target = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!target) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Safety: only allow deleting ADMIN accounts, not other SUPER_ADMINs or USERs
    if (target.role !== "ADMIN") {
      return res.status(400).json({ error: "Target user is not an ADMIN" });
    }

    await prisma.user.delete({
      where: { id: adminId },
    });

    return res.status(200).json({
      message: "Admin deleted successfully",
      adminId,
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    return res.status(500).json({ error: "Failed to delete admin" });
  }
};

//delete user by admin (for admin dashboard)
export const deleteUserByAdmin = async (req, res) => {
  const { userId } = req.params;
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied- only for Admins" });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return res.status(200).json({
      message: "User deleted successfully",
      userId,
    });
  }
  catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ error: "Failed to delete user" });
  };
}

// Update own profile (any authenticated user)
export const updateProfile = async (req, res) => {
    const { userId } = req.user;
    const { fullName, email, phoneNumber, address, username } = req.body;

    try {
        const current = await prisma.user.findUnique({ where: { id: userId } });
        if (!current) {
            return res.status(404).json({ error: "User not found." });
        }

        // If username is changing, ensure it is still unique
        if (username && username !== current.username) {
            const taken = await prisma.user.findUnique({ where: { username } });
            if (taken) return res.status(409).json({ error: "Username already taken." });
        }

        // If email is changing, ensure it is still unique
        if (email && email !== current.email) {
            const taken = await prisma.user.findUnique({ where: { email } });
            if (taken) return res.status(409).json({ error: "Email already in use." });
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(username ? { username } : {}),
                ...(fullName ? { fullName } : {}),
                ...(email ? { email } : {}),
                ...(phoneNumber !== undefined ? { phoneNumber } : {}),
                ...(address !== undefined ? { address } : {}),
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                phoneNumber: true,
                address: true,
                role: true,
                createdAt: true,
            },
        });

        return res.status(200).json({ message: "Profile updated successfully.", user: updated });
    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({ error: "Failed to update profile." });
    }
};
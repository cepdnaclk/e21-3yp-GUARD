import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { AppError } from "../../lib/AppError.js";
import { createUser } from "./createUserHelper.js";

// ─── Register (Public USER signup) ───────────────────────────────────────────
export const register = asyncHandler(async (req, res) => {
  const { username, password, fullName, email, phoneNumber, address } = req.body;

  if (!username || !password || !fullName) {
    throw new AppError("username, password, and fullName are required.", 400);
  }

  const { user, isRealEmail } = await createUser({
    username,
    email,
    password,
    fullName,
    role: "USER",
    address,
    phoneNumber,
  });

  if (isRealEmail) {
    return res.status(201).json({
      message: "Registration successful! Please check your email to verify your account before logging in.",
      emailVerified: false,
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
  }

  // Fallback (@local.guard): return JWT immediately (no real email to verify)
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
});

// ─── Create Admin (SUPER_ADMIN only) ─────────────────────────────────────────
export const createAdminBySuperAdmin = asyncHandler(async (req, res) => {
  const { username, email, password, fullName, address, phoneNumber } = req.body;

  if (!username || !email || !password || !fullName) {
    throw new AppError("username, email, password, fullName are required.", 400);
  }

  const { user, isRealEmail } = await createUser({
    username,
    email,
    password,
    fullName,
    role: "ADMIN",
    address,
    phoneNumber,
  });

  return res.status(201).json({
    message: isRealEmail
      ? "Admin account created. A verification email has been sent."
      : "Admin account created successfully.",
    userId: user.id,
    emailVerified: user.emailVerified,
  });
});

// ─── Create User (ADMIN only) ─────────────────────────────────────────────────
export const createUserByAdmin = asyncHandler(async (req, res) => {
  const { username, email, password, fullName, address, phoneNumber } = req.body;
  const adminId = req.user.userId;

  if (!username || !email || !password || !fullName) {
    throw new AppError("username, email, password, fullName are required.", 400);
  }

  const { user, isRealEmail } = await createUser({
    username,
    email,
    password,
    fullName,
    role: "USER",
    adminId,
    address,
    phoneNumber,
  });

  return res.status(201).json({
    message: isRealEmail
      ? "User account created. A verification email has been sent to the user."
      : "User account created under admin.",
    userId: user.id,
    emailVerified: user.emailVerified,
  });
});

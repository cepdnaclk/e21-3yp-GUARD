import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import prisma from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { AppError } from "../../lib/AppError.js";

const DEFAULT_GOOGLE_CLIENT_ID = "108391237039-0jg9nf8pjn48vi5bqi8bbth2kfe03vtm.apps.googleusercontent.com";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID);

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

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError("Invalid credentials", 401);
  }

  // Block unverified users (only for real email addresses, not @local.guard fallbacks)
  if (!user.emailVerified && !user.email.endsWith("@local.guard")) {
    return res.status(403).json({
      error: "Email not verified. Please check your inbox and verify your email before logging in.",
      emailVerified: false,
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
    adminId: user.adminId || null,
  });
});

// ─── Google Login / Signup ────────────────────────────────────────────────────
export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new AppError("idToken is required.", 400);
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
    });
  } catch {
    throw new AppError("Invalid Google token.", 401);
  }

  const payload = ticket.getPayload();
  const email = payload?.email;
  const fullName = payload?.name || "Google User";

  if (!email) {
    throw new AppError("Google account email is required.", 400);
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
        // Google-verified email is inherently trusted
        emailVerified: true,
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
});

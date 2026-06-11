import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import prisma from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { AppError } from "../../lib/AppError.js";

// Fail fast if the Google Client ID is not configured
const googleClientId = process.env.GOOGLE_CLIENT_ID;
if (!googleClientId) {
  throw new Error('GOOGLE_CLIENT_ID environment variable is required but not set.');
}
const googleClient = new OAuth2Client(googleClientId);

/**
 * Attaches the JWT as an HttpOnly, Secure, SameSite=Strict cookie.
 * Falls back to a 2-hour expiry matching the token lifetime.
 */
const attachAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,                                         // Not accessible from JavaScript
    secure: process.env.NODE_ENV === 'production',          // HTTPS only in production
    sameSite: 'strict',                                     // Prevent CSRF
    maxAge: 2 * 60 * 60 * 1000,                            // 2 hours (matches JWT expiry)
  });
};

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

  attachAuthCookie(res, token);

  return res.json({
    token,      // Also returned in body for API clients / ESP32 devices
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
      audience: googleClientId,
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

  attachAuthCookie(res, token);

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

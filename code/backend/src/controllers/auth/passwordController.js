import bcrypt from "bcryptjs";
import prisma from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { AppError } from "../../lib/AppError.js";
import { sendPasswordResetEmail } from "../../services/emailService.js";

function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}${localPart[1]}***@${domain}`;
}

// ─── Step 1: Init ─────────────────────────────────────────────────────────────
export const forgotPasswordInit = asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username) throw new AppError("Username is required.", 400);

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  // Check if it's a real email
  if (user.email.endsWith("@local.guard")) {
    throw new AppError("Account does not have a valid email for recovery. Please contact support.", 400);
  }

  const maskedEmail = maskEmail(user.email);
  return res.status(200).json({ maskedEmail });
});

// ─── Step 2: Verify Email ─────────────────────────────────────────────────────
export const forgotPasswordVerifyEmail = asyncHandler(async (req, res) => {
  const { username, email } = req.body;
  if (!email) throw new AppError("Email is required.", 400);

  let user;
  if (username) {
    // Path A: User remembered username, confirming email
    user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new AppError("User not found.", 404);
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      throw new AppError("Email address does not match our records.", 400);
    }
  } else {
    // Path B: User forgot username, providing email directly
    user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("No account found with this email address.", 404);
    }
  }

  // Generate 6-digit code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: resetCode,
      resetPasswordExpiry: expiry,
    },
  });

  await sendPasswordResetEmail(user.email, user.fullName, resetCode);

  return res.status(200).json({
    message: "Verification code sent to your email.",
    username: user.username // Return username so frontend can track it
  });
});

// ─── Step 3: Verify Code ──────────────────────────────────────────────────────
export const forgotPasswordVerifyCode = asyncHandler(async (req, res) => {
  const { username, code } = req.body;
  if (!username || !code) throw new AppError("Username and code are required.", 400);

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new AppError("User not found.", 404);

  if (!user.resetPasswordToken || user.resetPasswordToken !== code) {
    throw new AppError("Invalid verification code.", 400);
  }

  if (user.resetPasswordExpiry && user.resetPasswordExpiry < new Date()) {
    throw new AppError("Verification code has expired. Please request a new one.", 400);
  }

  return res.status(200).json({ message: "Code verified successfully." });
});

// ─── Step 4: Reset Password ──────────────────────────────────────────────────
export const forgotPasswordReset = asyncHandler(async (req, res) => {
  const { username, code, newPassword } = req.body;
  if (!username || !code || !newPassword) {
    throw new AppError("Missing required fields.", 400);
  }

  // Password validation: min 8 chars, at least 1 number
  if (newPassword.length < 8 || !/\d/.test(newPassword)) {
    throw new AppError("Password must be at least 8 characters long and contain at least one number.", 400);
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new AppError("User not found.", 404);

  if (!user.resetPasswordToken || user.resetPasswordToken !== code) {
    throw new AppError("Invalid verification code.", 400);
  }

  if (user.resetPasswordExpiry && user.resetPasswordExpiry < new Date()) {
    throw new AppError("Verification code has expired. Please request a new one.", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    },
  });

  return res.status(200).json({ message: "Password reset successfully. You can now log in." });
});

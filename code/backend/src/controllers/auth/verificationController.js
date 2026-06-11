import crypto from "crypto";
import prisma from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { AppError } from "../../lib/AppError.js";
import { sendVerificationEmail } from "../../services/emailService.js";

// ─── Verify Email ─────────────────────────────────────────────────────────────
export const verifyEmail = asyncHandler(async (req, res) => {
  const { username, code } = req.body;

  if (!username || !code) {
    throw new AppError("Username and verification code are required.", 400);
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new AppError("User not found.", 400);
  }

  if (user.emailVerified) {
    return res.status(200).json({ message: "Email is already verified. You can log in." });
  }

  if (!user.verificationToken || user.verificationToken !== code) {
    throw new AppError("Invalid verification code.", 400);
  }

  if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
    return res.status(400).json({
      error: "Verification code has expired. Please request a new one.",
      expired: true,
    });
  }

  // Mark as verified and clear the code
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  });

  return res.status(200).json({
    message: "Email verified successfully! You can now log in to your account.",
    emailVerified: true,
  });
});


// ─── Resend Verification Email ────────────────────────────────────────────────
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { username, email } = req.body;

  if (!email) {
    throw new AppError("Email is required.", 400);
  }

  // Find user by username if provided, otherwise find by email (for backward compatibility)
  let user;
  if (username) {
    user = await prisma.user.findUnique({ where: { username } });

    if (user && user.email !== email) {
      throw new AppError("The provided email does not match the email registered for this account.", 400);
    }
  } else {
    user = await prisma.user.findUnique({ where: { email } });
  }

  if (!user) {
    // Respond generically if user not found
    return res.status(200).json({ message: "If that email exists in our system for this account, a verification link has been sent." });
  }

  if (user.emailVerified) {
    throw new AppError("This account is already verified.", 400);
  }

  const verificationCode = crypto.randomInt(100000, 1000000).toString();
  const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken: verificationCode,
      verificationTokenExpiry: newExpiry,
    },
  });

  await sendVerificationEmail(user.email, user.fullName, verificationCode);

  return res.status(200).json({
    message: "Verification email resent. Please check your inbox.",
  });
});

import bcrypt from "bcryptjs";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../lib/AppError.js";
import { sendVerificationEmail } from "../../services/emailService.js";

/**
 * Check that both username and email are not already taken.
 * Throws AppError(409) if a conflict is found.
 */
export const ensureUniqueUser = async (username, email) => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (!existing) return;

  if (existing.username === username) {
    throw new AppError("This username is already taken.", 409);
  }
  throw new AppError("This email address is already registered.", 409);
};

/**
 * Build a fallback @local.guard email when no real email is provided.
 */
export const buildFallbackEmail = (username) => `${username}@local.guard`;

/**
 * Shared logic for creating any user account (register, create-admin, create-user).
 *
 * Handles: uniqueness check, password hashing, verification code generation,
 * DB insert, and email dispatch.
 *
 * @returns {Object} The created Prisma user record
 */
export async function createUser({
  username,
  email,
  password,
  fullName,
  role,
  adminId = null,
  address,
  phoneNumber,
}) {
  const resolvedEmail = email || buildFallbackEmail(username);
  const isRealEmail = !resolvedEmail.endsWith("@local.guard");

  await ensureUniqueUser(username, resolvedEmail);

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const user = await prisma.user.create({
    data: {
      username,
      email: resolvedEmail,
      password: hashedPassword,
      role,
      fullName,
      address,
      phoneNumber,
      adminId,
      emailVerified: !isRealEmail,
      verificationToken: isRealEmail ? verificationCode : null,
      verificationTokenExpiry: isRealEmail ? verificationTokenExpiry : null,
    },
  });

  // Send verification email only if a real email was provided
  if (isRealEmail) {
    try {
      await sendVerificationEmail(resolvedEmail, fullName, verificationCode);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError.message);
      // Don't block account creation if email sending fails — user can request resend
    }
  }

  return { user, isRealEmail };
}

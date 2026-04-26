import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService.js";

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

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
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
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login error" });
  }
};

// ─── Register (Public USER signup) ───────────────────────────────────────────
export const register = async (req, res) => {
  const { username, password, fullName, email, phoneNumber, address } = req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: "username, password, and fullName are required." });
  }

  const resolvedEmail = email || buildFallbackEmail(username);
  const isRealEmail = !resolvedEmail.endsWith("@local.guard");

  try {
    const isUnique = await ensureUniqueUser(username, resolvedEmail);
    if (!isUnique) {
      return res.status(409).json({ error: "Username or email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a verification token (valid for 24 hours)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now

    const user = await prisma.user.create({
      data: {
        username,
        email: resolvedEmail,
        password: hashedPassword,
        role: "USER",
        fullName,
        address,
        phoneNumber,
        // If no real email was provided, mark as already verified (no email to verify)
        emailVerified: !isRealEmail,
        verificationToken: isRealEmail ? verificationToken : null,
        verificationTokenExpiry: isRealEmail ? verificationTokenExpiry : null,
      },
    });

    // Send verification email only if a real email was provided
    if (isRealEmail) {
      try {
        await sendVerificationEmail(resolvedEmail, fullName, verificationToken);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError.message);
        // Don't block registration if email sending fails — user can request resend
      }

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
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Registration error" });
  }
};

// ─── Verify Email ─────────────────────────────────────────────────────────────
export const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Verification token is required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification token." });
    }

    if (user.emailVerified) {
      return res.status(200).json({ message: "Email is already verified. You can log in." });
    }

    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      return res.status(400).json({
        error: "Verification token has expired. Please request a new verification email.",
        expired: true,
      });
    }

    // Mark as verified and clear the token
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
  } catch (error) {
    console.error("Verify email error:", error);
    return res.status(500).json({ error: "Email verification error." });
  }
};

// ─── Resend Verification Email ────────────────────────────────────────────────
export const resendVerificationEmail = async (req, res) => {
  const { username, email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    // Find user by username if provided, otherwise find by email (for backward compatibility or direct calls)
    let user;
    if (username) {
      user = await prisma.user.findUnique({ where: { username } });
      
      if (user && user.email !== email) {
        return res.status(400).json({ error: "The provided email does not match the email registered for this account." });
      }
    } else {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      // Respond generically if user not found
      return res.status(200).json({ message: "If that email exists in our system for this account, a verification link has been sent." });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: "This account is already verified." });
    }

    const newToken = crypto.randomBytes(32).toString("hex");
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: newToken,
        verificationTokenExpiry: newExpiry,
      },
    });

    await sendVerificationEmail(user.email, user.fullName, newToken);

    return res.status(200).json({
      message: "Verification email resent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({ error: "Failed to resend verification email." });
  }
};

// ─── Create Admin (SUPER_ADMIN only) ─────────────────────────────────────────
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

    const resolvedEmail = email;
    const isRealEmail = !resolvedEmail.endsWith("@local.guard");

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a verification token (valid for 24 hours)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now

    const user = await prisma.user.create({
      data: {
        username,
        email: resolvedEmail,
        password: hashedPassword,
        role: "ADMIN",
        fullName,
        address,
        phoneNumber,
        // If it's a real email, require verification. Otherwise (@local.guard), it's pre-verified.
        emailVerified: !isRealEmail,
        verificationToken: isRealEmail ? verificationToken : null,
        verificationTokenExpiry: isRealEmail ? verificationTokenExpiry : null,
      },
    });

    // Send verification email only if a real email was provided
    if (isRealEmail) {
      try {
        await sendVerificationEmail(resolvedEmail, fullName, verificationToken);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError.message);
      }
    }

    return res.status(201).json({
      message: isRealEmail 
        ? "Admin account created. A verification email has been sent." 
        : "Admin account created successfully.",
      userId: user.id,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return res.status(500).json({ error: "Failed to create admin account." });
  }
};

// ─── Create User (ADMIN only) ─────────────────────────────────────────────────
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

    const resolvedEmail = email;
    const isRealEmail = !resolvedEmail.endsWith("@local.guard");

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a verification token (valid for 24 hours)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now

    const user = await prisma.user.create({
      data: {
        username,
        email: resolvedEmail,
        password: hashedPassword,
        role: "USER",
        fullName,
        address,
        phoneNumber,
        adminId,
        // If it's a real email, require verification. Otherwise (@local.guard), it's pre-verified.
        emailVerified: !isRealEmail,
        verificationToken: isRealEmail ? verificationToken : null,
        verificationTokenExpiry: isRealEmail ? verificationTokenExpiry : null,
      },
    });

    // Send verification email only if a real email was provided
    if (isRealEmail) {
      try {
        await sendVerificationEmail(resolvedEmail, fullName, verificationToken);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError.message);
      }
    }

    return res.status(201).json({
      message: isRealEmail 
        ? "User account created. A verification email has been sent to the user." 
        : "User account created under admin.",
      userId: user.id,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ error: "Failed to create user account." });
  }
};

// ─── Google Login / Signup ────────────────────────────────────────────────────
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
  } catch (error) {
    console.error("Google auth error:", error.message);
    return res.status(401).json({ error: "Invalid Google token." });
  }
};

// ─── Get Workers (ADMIN only) ────────────────────────────────────────────────
export const getWorkersByAdmin = async (req, res) => {
  const adminId = req.user.userId;

  try {
    const workers = await prisma.user.findMany({
      where: { adminId, role: "USER" },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
      },
    });

    return res.json(workers);
  } catch (error) {
    console.error("Get workers error:", error);
    return res.status(500).json({ error: "Failed to fetch workers." });
  }
};

// ─── Get Current User Profile (Token Required) ────────────────────────────────
export const getMe = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        address: true,
        phoneNumber: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json(user);
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({ error: "Failed to fetch profile." });
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
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    return res.status(500).json({ error: "Failed to delete admin" });
  }
};

// Delete a user (for ADMIN only)
export const deleteUserByAdmin = async (req, res) => {
  const { userId } = req.params;
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Admin can only delete users they created
    if (req.user.role === "ADMIN" && targetUser.adminId !== req.user.userId) {
      return res.status(403).json({ error: "You can only delete your own users" });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ error: "Failed to delete user" });
  }
};

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

// ─── Forgot Password Flow ──────────────────────────────────────────────────────

function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}${localPart[1]}***@${domain}`;
}

export const forgotPasswordInit = async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username is required." });

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      // Don't leak whether user exists, just return a generic message or fake mask
      return res.status(404).json({ error: "User not found." });
    }
    
    // Check if it's a real email
    if (user.email.endsWith("@local.guard")) {
      return res.status(400).json({ error: "Account does not have a valid email for recovery. Please contact support." });
    }

    const maskedEmail = maskEmail(user.email);
    return res.status(200).json({ maskedEmail });
  } catch (err) {
    console.error("Forgot password init error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const forgotPasswordVerifyEmail = async (req, res) => {
  const { username, email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    let user;
    if (username) {
      // Path A: User remembered username, confirming email
      user = await prisma.user.findUnique({ where: { username } });
      if (!user) return res.status(404).json({ error: "User not found." });
      if (user.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ error: "Email address does not match our records." });
      }
    } else {
      // Path B: User forgot username, providing email directly
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: "No account found with this email address." });
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
  } catch (err) {
    console.error("Forgot password verify email error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const forgotPasswordVerifyCode = async (req, res) => {
  const { username, code } = req.body;
  if (!username || !code) return res.status(400).json({ error: "Username and code are required." });

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: "User not found." });

    if (!user.resetPasswordToken || user.resetPasswordToken !== code) {
      return res.status(400).json({ error: "Invalid verification code." });
    }

    if (user.resetPasswordExpiry && user.resetPasswordExpiry < new Date()) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
    }

    return res.status(200).json({ message: "Code verified successfully." });
  } catch (err) {
    console.error("Forgot password verify code error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const forgotPasswordReset = async (req, res) => {
  const { username, code, newPassword } = req.body;
  if (!username || !code || !newPassword) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // Password validation: min 8 chars, at least 1 number
  if (newPassword.length < 8 || !/\d/.test(newPassword)) {
    return res.status(400).json({ error: "Password must be at least 8 characters long and contain at least one number." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: "User not found." });

    if (!user.resetPasswordToken || user.resetPasswordToken !== code) {
      return res.status(400).json({ error: "Invalid verification code." });
    }

    if (user.resetPasswordExpiry && user.resetPasswordExpiry < new Date()) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
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
  } catch (err) {
    console.error("Forgot password reset error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};
import prisma from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { AppError } from "../../lib/AppError.js";
import { sendVerificationEmail } from "../../services/emailService.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ── Multer: save uploaded profile pictures to public/uploads/profile/ ── */
const uploadDir = path.join(__dirname, "../../../../public/uploads/profile");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${Date.now()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB cap
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new AppError("Only image files are allowed.", 400));
  },
});

/* Helper to delete old files */
function deleteImageFile(imageUrl) {
  if (!imageUrl) return;
  const relativePath = imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl;
  const filePath = path.join(__dirname, "../../../../public", relativePath);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.warn(`⚠️ Could not delete old profile image: ${filePath}`);
    }
  });
}

const USER_SELECT_FIELDS = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  role: true,
  address: true,
  phoneNumber: true,
  profilePicture: true,
  phoneVerified: true,
  telegramChatId: true,
  createdAt: true,
};

export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: USER_SELECT_FIELDS,
  });
  if (!user) throw new AppError("User not found.", 404);
  return res.json(user);
});

export const updateMe = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { fullName, email, phoneNumber, address, username } = req.body;

  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) throw new AppError("User not found.", 404);

  // 1. Can't change username
  if (username && username !== current.username) {
    throw new AppError("Username cannot be changed.", 400);
  }

  // 2. Email and Phone Number must be verified via OTP BEFORE save
  if (email && email !== current.email) {
    throw new AppError("Email must be verified before it can be updated.", 400);
  }

  if (phoneNumber && phoneNumber !== current.phoneNumber) {
    throw new AppError("Phone number must be verified via Telegram Bot before it can be updated.", 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName ? { fullName } : {}),
      ...(address !== undefined ? { address } : {}),
    },
    select: USER_SELECT_FIELDS,
  });

  return res.status(200).json({ message: "Profile updated successfully.", user: updated });
});

export const getWorkersByAdmin = asyncHandler(async (req, res) => {
  const workers = await prisma.user.findMany({
    where: { adminId: req.user.userId, role: "USER" },
    select: { id: true, username: true, email: true, fullName: true, profilePicture: true },
  });
  return res.json(workers);
});

export const getUsersByAdmin = asyncHandler(async (req, res) => {
  const workers = await prisma.user.findMany({
    where: { adminId: req.user.userId },
    select: { id: true, username: true, email: true, fullName: true, role: true, createdAt: true, assignedTankIds: true, profilePicture: true },
    orderBy: { id: "desc" },
  });
  return res.status(200).json(workers);
});

export const getAdminsBySuperAdmin = asyncHandler(async (req, res) => {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, username: true, email: true, fullName: true, role: true, createdAt: true, phoneNumber: true, address: true, profilePicture: true, telegramChatId: true },
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json(admins);
});

export const deleteAdminBySuperAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const target = await prisma.user.findUnique({ where: { id: adminId } });
  if (!target) throw new AppError("Admin not found", 404);
  if (target.role !== "ADMIN") throw new AppError("Target user is not an ADMIN", 400);
  if (target.profilePicture) deleteImageFile(target.profilePicture);
  await prisma.user.delete({ where: { id: adminId } });
  return res.status(200).json({ message: "Admin deleted successfully" });
});

export const deleteUserByAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new AppError("User not found", 404);
  if (req.user.role === "ADMIN" && targetUser.adminId !== req.user.userId) {
    throw new AppError("You can only delete your own users", 403);
  }
  if (targetUser.profilePicture) deleteImageFile(targetUser.profilePicture);
  await prisma.user.delete({ where: { id: userId } });
  return res.status(200).json({ message: "User deleted successfully" });
});

export const updateProfile = asyncHandler(async (req, res) => {
  return updateMe(req, res);
});

/* ── Profile Picture Controllers ── */
export const uploadProfilePicture = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  if (!req.file) throw new AppError("No file uploaded.", 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    deleteImageFile(`/uploads/profile/${req.file.filename}`);
    throw new AppError("User not found.", 404);
  }

  // Delete old picture if exists
  if (user.profilePicture) {
    deleteImageFile(user.profilePicture);
  }

  const profilePicturePath = `/uploads/profile/${req.file.filename}`;
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { profilePicture: profilePicturePath },
    select: USER_SELECT_FIELDS,
  });

  return res.status(200).json({
    message: "Profile picture uploaded successfully.",
    user: updatedUser,
  });
});

export const deleteProfilePicture = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found.", 404);

  if (user.profilePicture) {
    deleteImageFile(user.profilePicture);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { profilePicture: null },
    select: USER_SELECT_FIELDS,
  });

  return res.status(200).json({
    message: "Profile picture removed.",
    user: updatedUser,
  });
});

/* ── OTP Verification Flow Controllers ── */

// 1. Email OTP Send
export const sendEmailOtp = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { email } = req.body;

  if (!email || !email.trim()) {
    throw new AppError("Email is required.", 400);
  }

  const cleanEmail = email.trim().toLowerCase();

  // Validate email is not already taken by another user
  const taken = await prisma.user.findFirst({
    where: {
      email: cleanEmail,
      id: { not: userId }
    }
  });
  if (taken) throw new AppError("Email address is already in use by another user.", 409);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found.", 404);

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingEmail: cleanEmail,
      emailOtpCode: otpCode,
      emailOtpExpiry: otpExpiry,
    }
  });

  await sendVerificationEmail(cleanEmail, user.fullName, otpCode);

  return res.status(200).json({
    message: "Verification code sent to your new email.",
    debugOtp: otpCode,
  });
});

// 2. Email OTP Confirm
export const confirmEmailOtp = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { code } = req.body;

  if (!code) throw new AppError("Verification code is required.", 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found.", 404);

  if (!user.emailOtpCode || user.emailOtpCode !== code) {
    throw new AppError("Invalid verification code.", 400);
  }

  if (user.emailOtpExpiry && user.emailOtpExpiry < new Date()) {
    throw new AppError("Verification code has expired.", 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      email: user.pendingEmail,
      emailVerified: true,
      pendingEmail: null,
      emailOtpCode: null,
      emailOtpExpiry: null,
    },
    select: USER_SELECT_FIELDS,
  });

  return res.status(200).json({
    message: "Email verified and updated successfully.",
    user: updatedUser,
  });
});

// 3. Phone OTP Send (Telegram Bot verification initiator)
export const sendPhoneOtp = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { phoneNumber } = req.body;

  if (!phoneNumber || !phoneNumber.trim()) {
    throw new AppError("Phone number is required.", 400);
  }

  const cleanPhone = phoneNumber.trim();

  // Validate phone is not taken by another user
  const taken = await prisma.user.findFirst({
    where: {
      phoneNumber: cleanPhone,
      id: { not: userId }
    }
  });
  if (taken) throw new AppError("Phone number is already in use by another user.", 409);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found.", 404);

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingPhone: cleanPhone,
      phoneOtpCode: otpCode,
      phoneOtpExpiry: otpExpiry,
      phoneVerified: false, // Reset verified state for the new number
    }
  });

  console.log(`💬 Generated Telegram OTP code ${otpCode} for ${cleanPhone}`);

  return res.status(200).json({
    message: "Verification code generated. Please send this code to our Telegram bot to verify.",
    debugOtp: otpCode,
  });
});

// 4. Phone OTP Confirm (Checks if bot updated the status to verified)
export const confirmPhoneOtp = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found.", 404);

  if (!user.phoneVerified) {
    throw new AppError("Phone number verification is still pending. Please send the code to our Telegram bot and click 'Share Contact' first.", 400);
  }

  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT_FIELDS,
  });

  return res.status(200).json({
    message: "Phone number verified and updated successfully.",
    user: updatedUser,
  });
});

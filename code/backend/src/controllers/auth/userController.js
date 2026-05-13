import prisma from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { AppError } from "../../lib/AppError.js";

export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, username: true, email: true, fullName: true, role: true, address: true, phoneNumber: true },
  });
  if (!user) throw new AppError("User not found.", 404);
  return res.json(user);
});

export const getWorkersByAdmin = asyncHandler(async (req, res) => {
  const workers = await prisma.user.findMany({
    where: { adminId: req.user.userId, role: "USER" },
    select: { id: true, username: true, email: true, fullName: true },
  });
  return res.json(workers);
});

export const getUsersByAdmin = asyncHandler(async (req, res) => {
  const workers = await prisma.user.findMany({
    where: { adminId: req.user.userId },
    select: { id: true, username: true, email: true, fullName: true, role: true, createdAt: true, assignedTankIds: true },
    orderBy: { id: "desc" },
  });
  return res.status(200).json(workers);
});

export const getAdminsBySuperAdmin = asyncHandler(async (req, res) => {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, username: true, email: true, fullName: true, role: true, createdAt: true, phoneNumber: true, address: true },
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json(admins);
});

export const deleteAdminBySuperAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const target = await prisma.user.findUnique({ where: { id: adminId } });
  if (!target) throw new AppError("Admin not found", 404);
  if (target.role !== "ADMIN") throw new AppError("Target user is not an ADMIN", 400);
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
  await prisma.user.delete({ where: { id: userId } });
  return res.status(200).json({ message: "User deleted successfully" });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { fullName, email, phoneNumber, address, username } = req.body;

  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) throw new AppError("User not found.", 404);

  if (username && username !== current.username) {
    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken) throw new AppError("Username already taken.", 409);
  }
  if (email && email !== current.email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) throw new AppError("Email already in use.", 409);
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
    select: { id: true, username: true, email: true, fullName: true, phoneNumber: true, address: true, role: true, createdAt: true },
  });

  return res.status(200).json({ message: "Profile updated successfully.", user: updated });
});

import prisma from "../lib/prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";

export const createDeviceRequest = asyncHandler(async (req, res) => {
  const { name, email, contactNo, numberOfDevices, notes } = req.body;

  if (!name || !email || !contactNo || !numberOfDevices) {
    throw new AppError("Name, email, contact number, and number of devices are required.", 400);
  }

  const numDevices = parseInt(numberOfDevices, 10);
  if (isNaN(numDevices) || numDevices <= 0) {
    throw new AppError("Number of devices must be a positive integer.", 400);
  }
  if (numDevices > 20) {
    throw new AppError("Maximum number of devices per request is 20.", 400);
  }

  const newRequest = await prisma.deviceRequest.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      contactNo: contactNo.trim(),
      numberOfDevices: numDevices,
      notes: notes ? notes.trim() : null,
    },
  });

  return res.status(201).json({
    message: "Your order request has been submitted successfully.",
    deviceRequest: newRequest,
  });
});

export const getAllDeviceRequests = asyncHandler(async (req, res) => {
  if (req.user.role !== "SUPER_ADMIN") {
    throw new AppError("Access denied. Only Super Admin can view device requests.", 403);
  }

  const requests = await prisma.deviceRequest.findMany({
    orderBy: { createdAt: "asc" },
  });

  return res.status(200).json(requests);
});

export const deleteDeviceRequest = asyncHandler(async (req, res) => {
  if (req.user.role !== "SUPER_ADMIN") {
    throw new AppError("Access denied. Only Super Admin can manage device requests.", 403);
  }

  const { id } = req.params;

  const target = await prisma.deviceRequest.findUnique({
    where: { id },
  });

  if (!target) {
    throw new AppError("Request not found.", 404);
  }

  await prisma.deviceRequest.delete({
    where: { id },
  });

  return res.status(200).json({
    message: "Request resolved/deleted successfully.",
  });
});

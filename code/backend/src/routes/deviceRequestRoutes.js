import express from "express";
import {
  createDeviceRequest,
  getAllDeviceRequests,
  deleteDeviceRequest,
} from "../controllers/deviceRequestController.js";
import {
  verifyToken,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public submission endpoint
router.post("/", createDeviceRequest);

// Super admin manage endpoints
router.get("/", verifyToken, requireRole("SUPER_ADMIN"), getAllDeviceRequests);
router.delete("/:id", verifyToken, requireRole("SUPER_ADMIN"), deleteDeviceRequest);

export default router;

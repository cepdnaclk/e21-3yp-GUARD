import express from "express";
import {
  registerTank,
  getTankStatus,
  getAllTanks,
  assignUserToTank,
} from "../controllers/tankController.js";
import {
  verifyToken,
  requireRole,
  requireAnyRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", verifyToken, requireRole("ADMIN"), registerTank);
router.post("/:tankId/assign-user", verifyToken, requireRole("ADMIN"), assignUserToTank);

router.get("/", verifyToken, requireAnyRole(["ADMIN", "USER"]), getAllTanks);
router.get("/:tankId/status", verifyToken, requireAnyRole(["ADMIN", "USER"]), getTankStatus);

export default router;
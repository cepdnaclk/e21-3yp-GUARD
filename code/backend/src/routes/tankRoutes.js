import express from "express";
import { body, param, validationResult } from "express-validator";
import {
  registerTank,
  getTankStatus,
  getAllTanks,
  assignUserToTank,
} from "../controllers/tankController.js";
import { sendActuatorCommand } from "../controllers/actuatorController.js";
import {
  verifyToken,
  requireRole,
  requireAnyRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  return next();
};

router.post("/register", verifyToken, requireRole("ADMIN"), registerTank);
router.post("/:tankId/assign-user", verifyToken, requireRole("ADMIN"), assignUserToTank);

router.post(
  "/:tankId/actuators",
  verifyToken,
  requireAnyRole(["ADMIN", "USER"]),
  [
    param("tankId").trim().notEmpty().withMessage("tankId is required."),
    body("command")
      .isString()
      .trim()
      .toLowerCase()
      .isIn(["feed", "pump_on", "pump_off"])
      .withMessage("command must be one of feed, pump_on, pump_off."),
  ],
  validateRequest,
  sendActuatorCommand
);

router.get("/", verifyToken, requireAnyRole(["ADMIN", "USER"]), getAllTanks);
router.get("/:tankId/status", verifyToken, requireAnyRole(["ADMIN", "USER"]), getTankStatus);

export default router;
import express from "express";
import { body, param, validationResult } from "express-validator";
import {
  registerTank,
  addProduct,
  getTankStatus,
  getAllTanks,
  assignUserToTank,
  unassignUserFromTank,
  deleteTankByAdmin,
} from "../controllers/tankController.js";
import { sendActuatorCommand } from "../controllers/actuatorController.js";
import { updateThresholds, getThresholds } from "../controllers/thresholdController.js";
import {
  verifyToken,
  requireRole,
  requireAnyRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use((req, res, next) => {
    console.log(`📦 TankRouter: ${req.method} ${req.url}`);
    next();
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  return next();
};

router.post("/register", verifyToken, requireRole("ADMIN"), registerTank);
router.post("/add-product", verifyToken, requireRole("SUPER_ADMIN"), addProduct);
router.post("/:tankId/assign-user", verifyToken, requireRole("ADMIN"), assignUserToTank);
router.post("/:tankId/unassign-user", verifyToken, requireRole("ADMIN"), unassignUserFromTank);
router.delete(
  "/:tankId",
  verifyToken,
  requireAnyRole(["ADMIN", "SUPER_ADMIN"]),
  [param("tankId").trim().notEmpty().withMessage("tankId is required.")],
  validateRequest,
  deleteTankByAdmin
);

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

// Threshold routes
router.get("/:tankId/thresholds", verifyToken, requireAnyRole(["ADMIN", "USER", "SUPER_ADMIN"]), getThresholds);
router.patch("/:tankId/thresholds", verifyToken, requireAnyRole(["ADMIN", "SUPER_ADMIN"]), updateThresholds);

router.get("/", verifyToken, requireAnyRole(["ADMIN", "USER", "SUPER_ADMIN"]), getAllTanks);
router.get("/:tankId/status", verifyToken, requireAnyRole(["ADMIN", "USER", "SUPER_ADMIN"]), getTankStatus);

export default router;
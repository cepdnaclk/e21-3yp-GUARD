import express from "express";
import {
  login,
  register,
  googleLogin,
  createAdminBySuperAdmin,
  createUserByAdmin,
} from "../controllers/authController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/google", googleLogin);

router.post(
  "/create-admin",
  verifyToken,
  requireRole("SUPER_ADMIN"),
  createAdminBySuperAdmin
);

router.post(
  "/create-user",
  verifyToken,
  requireRole("ADMIN"),
  createUserByAdmin
);

export default router;
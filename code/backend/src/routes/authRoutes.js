import express from "express";
import {
  login,
  register,
  googleLogin,
  createAdminBySuperAdmin,
  createUserByAdmin,
  verifyEmail,
  resendVerificationEmail,
  getWorkersByAdmin,
  getMe,
} from "../controllers/authController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Public routes ────────────────────────────────────────────────────────────
router.post("/login", login);
router.post("/register", register);
router.post("/google", googleLogin);

// Email verification (token arrives as a query-string param)
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

// ── Protected routes ─────────────────────────────────────────────────────────
router.get("/me", verifyToken, getMe);
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

router.get(
  "/workers",
  verifyToken,
  requireRole("ADMIN"),
  getWorkersByAdmin
);

export default router;
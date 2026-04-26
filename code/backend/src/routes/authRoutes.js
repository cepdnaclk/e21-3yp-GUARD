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
  getUsersByAdmin,
  deleteUserByAdmin,
  getAdminsBySuperAdmin,
  deleteAdminBySuperAdmin,
  updateProfile,
  forgotPasswordInit,
  forgotPasswordVerifyEmail,
  forgotPasswordVerifyCode,
  forgotPasswordReset,
} from "../controllers/authController.js";
import { verifyToken, requireRole, requireAnyRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Public routes ────────────────────────────────────────────────────────────
router.post("/login", login);
router.post("/register", register);
router.post("/google", googleLogin);

// Email verification (token arrives as a query-string param)
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

// Forgot Password Flow
router.post("/forgot-password/init", forgotPasswordInit);
router.post("/forgot-password/verify-email", forgotPasswordVerifyEmail);
router.post("/forgot-password/verify-code", forgotPasswordVerifyCode);
router.post("/forgot-password/reset", forgotPasswordReset);

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

router.get(
  "/users",
  verifyToken,
  requireAnyRole(["SUPER_ADMIN", "ADMIN"]),
  getUsersByAdmin
);

router.delete(
  "/users/:userId",
  verifyToken,
  requireAnyRole(["SUPER_ADMIN", "ADMIN"]),
  deleteUserByAdmin
);

// SUPER_ADMIN: list all admins
router.get(
  "/admins",
  verifyToken,
  requireRole("SUPER_ADMIN"),
  getAdminsBySuperAdmin
);

// SUPER_ADMIN: delete an admin
router.delete(
  "/admins/:adminId",
  verifyToken,
  requireRole("SUPER_ADMIN"),
  deleteAdminBySuperAdmin
);

router.put(
  "/profile",
  verifyToken,
  requireAnyRole(["SUPER_ADMIN", "ADMIN", "USER"]),
  updateProfile
);

export default router;
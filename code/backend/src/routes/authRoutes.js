import express from "express";
import { body, validationResult } from "express-validator";
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
} from "../controllers/auth/index.js";
import { verifyToken, requireRole, requireAnyRole } from "../middleware/authMiddleware.js";

const router = express.Router();

const validateLogin = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isString()
    .withMessage("Username must be a string")
    .escape(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isString()
    .withMessage("Password must be a string"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// ── Public routes ────────────────────────────────────────────────────────────
router.post("/login", validateLogin, login);
router.post("/register", register);
router.post("/google", googleLogin);

// Email verification via POST (expects username and code in body)
router.post("/verify-email", verifyEmail);
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
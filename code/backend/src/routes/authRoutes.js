import express from "express";
import {
  login,
  register,
  googleLogin,
  createAdminBySuperAdmin,
  createUserByAdmin,
  getUsersByAdmin,
  deleteUserByAdmin,
  getAdminsBySuperAdmin,
  deleteAdminBySuperAdmin,
  updateProfile,
} from "../controllers/authController.js";
import { verifyToken, requireRole, requireAnyRole } from "../middleware/authMiddleware.js";

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
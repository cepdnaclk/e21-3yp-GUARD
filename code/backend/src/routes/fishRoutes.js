import express from "express";
import {
  getAllFish,
  getFishById,
  createFish,
  updateFish,
  deleteFish,
  upload,
} from "../controllers/fishController.js";
import {
  verifyToken,
  requireRole,
  requireAnyRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All logged-in users can browse the fish catalogue
router.get("/",    verifyToken, requireAnyRole(["ADMIN", "USER", "SUPER_ADMIN"]), getAllFish);
router.get("/:id", verifyToken, requireAnyRole(["ADMIN", "USER", "SUPER_ADMIN"]), getFishById);

// Only SUPER_ADMIN can manage the catalogue (add, edit, delete, upload images)
router.post(  "/",    verifyToken, requireRole("SUPER_ADMIN"), upload.single("image"), createFish);
router.put(   "/:id", verifyToken, requireRole("SUPER_ADMIN"), upload.single("image"), updateFish);
router.delete("/:id", verifyToken, requireRole("SUPER_ADMIN"), deleteFish);

export default router;

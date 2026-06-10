import express from "express";
import {
  getAllFish,
  getFishById,
  createFish,
  updateFish,
  deleteFish,
} from "../controllers/fishController.js";
import {
  verifyToken,
  requireAnyRole,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All logged-in users can browse the fish catalogue
router.get("/",    verifyToken, requireAnyRole(["ADMIN", "USER", "SUPER_ADMIN"]), getAllFish);
router.get("/:id", verifyToken, requireAnyRole(["ADMIN", "USER", "SUPER_ADMIN"]), getFishById);

// Only admins can manage the catalogue
router.post("/",    verifyToken, requireAnyRole(["ADMIN", "SUPER_ADMIN"]), createFish);
router.put("/:id",  verifyToken, requireAnyRole(["ADMIN", "SUPER_ADMIN"]), updateFish);
router.delete("/:id", verifyToken, requireAnyRole(["ADMIN", "SUPER_ADMIN"]), deleteFish);

export default router;

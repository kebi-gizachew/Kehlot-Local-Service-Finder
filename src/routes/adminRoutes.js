import express from "express";
import {
  registerProvider,
  dashboardStats,
  getUserGrowth,
  listProviders,
  getProvider,
  updateProvider,
  deleteProvider,
  listUsers,
} from "../controllers/adminController.js";
import { authenticate, protect } from "../middlewares/authMiddleware.js";
import { requireAdmin, restrictTo } from "../middlewares/roleMiddleware.js";



const router = express.Router();
router.use(protect, requireAdmin);


// Admin creates provider account
router.post("/provider",authenticate, requireAdmin, registerProvider);
router.get("/dashboard", protect, restrictTo("ADMIN"), dashboardStats);
router.get("/dashboard/user-growth", protect, requireAdmin, getUserGrowth);
router.get("/providers",  protect, restrictTo("ADMIN"), listProviders);
router.get("/providers/:id", protect, restrictTo("ADMIN"), getProvider);
router.put("/providers/:id",  protect, restrictTo("ADMIN"), updateProvider);
router.delete("/providers/:id",  protect, restrictTo("ADMIN"), deleteProvider);
// Backwards-compatible singular alias for delete
router.delete("/provider/:id",  protect, restrictTo("ADMIN"), deleteProvider);
router.get("/users", protect, restrictTo("ADMIN"),  listUsers);

export default router;

import express from "express";
import {
  getProfile,
  changePassword
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Provider views profile
router.get("/profile", authenticate, getProfile);

// Provider changes password after first login
router.put("/change-password", authenticate, changePassword);

export default router;

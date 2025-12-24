import express from "express";
import { registerProvider } from "../controllers/adminController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Admin creates provider account
router.post(
  "/provider",
  authenticate,
  requireAdmin,
  registerProvider
);

export default router;

import express from "express";
import {
  registerUser,
  login,
  changePassword,
  logout
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Admin login
router.post("/admin/login", login);

// User register
router.post("/user/register", registerUser);

// User login
router.post("/user/login", login);

// Provider login
router.post("/provider/login", login);

// Change password (alias for provider change-password)
router.post("/change-password", authenticate, changePassword);

// Logout (all roles)
router.post("/logout", logout);

export default router;

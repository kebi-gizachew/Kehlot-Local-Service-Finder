import express from "express";
import {
  registerUser,
  login,
  changePassword,
  logout
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/admin/login", login);
router.post("/user/register", registerUser);
router.post("/user/login", login);
router.post("/provider/login", login);
router.post("/change-password", authenticate, changePassword);
router.post("/logout", logout);

export default router;

import express from "express";
import {
  getProvidersByCategory,
  searchProviders,
  getProviderProfile,
} from "../controllers/userController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/category/:serviceType", protect, getProvidersByCategory);
router.get("/search", protect, searchProviders);
router.get("/provider/:id", protect, getProviderProfile);

export default router;

import express from "express";
import {changePassword,getProvidersByCategory,getProviderProfile, filterProvidersByCategories } from "../controllers/authController.js";
import { authenticate, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Provider views profile
router.get("/category/:serviceType", getProvidersByCategory);
// Filter providers by category array (request body: { categories: [...] })
router.post("/filter", filterProvidersByCategories);
router.get("/:id", getProviderProfile);

// Provider changes password after first login
router.put("/change-password", authenticate, changePassword);

export default router;

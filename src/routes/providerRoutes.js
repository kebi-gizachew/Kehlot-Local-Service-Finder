import express from "express";
import {changePassword,getProvidersByCategory,getProviderProfile, filterProvidersByCategories } from "../controllers/authController.js";
import { listProviders } from "../controllers/adminController.js";
import { authenticate, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.get("/", listProviders);
router.get("/category/:serviceType", getProvidersByCategory);
router.post("/filter", filterProvidersByCategories);
router.get("/:id", getProviderProfile);
router.put("/change-password", authenticate, changePassword);

export default router;

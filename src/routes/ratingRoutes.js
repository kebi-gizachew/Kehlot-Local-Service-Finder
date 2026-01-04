import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { rateProvider } from "../controllers/ratingController.js";

const router = express.Router();

router.post("/", protect, rateProvider);

export default router;

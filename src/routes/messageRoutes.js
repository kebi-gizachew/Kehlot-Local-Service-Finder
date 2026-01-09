import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { sendMessage, getMessages, getConversations, deleteMessage, getMessageById, copyMessage } from "../controllers/messageController.js";

const router = express.Router();

router.post("/", protect, sendMessage);
router.get("/conversations", protect, getConversations);
router.get("/:id/content", protect, getMessageById);
router.post("/:id/copy", protect, copyMessage);
router.get("/thread/:otherId", protect, getMessages);
router.get("/:providerId", protect, getMessages);
router.delete("/:id", protect, deleteMessage);

export default router;

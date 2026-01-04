import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { sendMessage, getMessages, getConversations, deleteMessage } from "../controllers/messageController.js";

const router = express.Router();

// Send message
router.post("/", protect, sendMessage);

// Get list of conversations (unique counterpart entries with last message)
router.get("/conversations", protect, getConversations);

// Get conversation messages between current user and another user/provider
// Use simple param names here (some router/path-to-regexp versions do not support
// inline regex groups). Validate numeric IDs inside the controller if needed.
router.get("/thread/:otherId", protect, getMessages);
router.get("/:providerId", protect, getMessages);

// Delete a message by id (validate numeric id inside controller)
router.delete("/:id", protect, deleteMessage);

export default router;

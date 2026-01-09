import express from "express";
import { authUserOrProvider , requireUser, requireProvider} from "../middleware/userOrProvider.js";
import { getOrCreateConversation,getUserConversations, getConversationById, getMessages, sendMessage, getProviderConversations, deleteMessageById} from "../controllers/messageController.js";
import {authenticationUser} from '../middleware/isLogged.js'
import { authProvider } from "../middleware/isProvider.js";

const router = express.Router();

router.get("/provider/conversations", authProvider, getProviderConversations);
router.get(
  "/conversation/:providerId",
   authenticationUser,
  getOrCreateConversation
);

router.get(
  "/conversation/conv/:conversationId",
  getConversationById
);
router.get(
  "/conversation/user",
  authenticationUser,
  getUserConversations
);
router.delete("/messages/:messageId", deleteMessageById);
router.get(
  "/messages/:conversationId",
  getMessages
);

router.post(
  "/messages/sending/:conversationId",
  sendMessage
);

router.get(
  "/conversation/test",

  (req, res) => res.json({ authenticated: true, user: req.user })
);

export default router;
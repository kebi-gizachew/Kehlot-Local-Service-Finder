import { prisma } from "../config/db.js";
import { getIO } from "../utils/socket.js";

export const sendMessage = async (req, res) => {
  try {
    const sender = req.user; // set by protect middleware
    const { receiverId, content, imageUrl } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: "receiverId is required" });
    }

    if (!content && !imageUrl) {
      return res.status(400).json({ success: false, message: "Either content or imageUrl is required" });
    }

    // Ensure sender has a valid role
    if (!sender || !sender.role) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // Fetch receiver user and verify role
    const receiver = await prisma.user.findUnique({ where: { id: Number(receiverId) }, select: { id: true, role: true } });
    if (!receiver) return res.status(404).json({ success: false, message: "Receiver not found" });

    // Enforce: USER -> PROVIDER, PROVIDER -> USER
    if (sender.role === "USER" && receiver.role !== "PROVIDER") {
      return res.status(400).json({ success: false, message: "Users can only send messages to providers" });
    }
    if (sender.role === "PROVIDER" && receiver.role !== "USER") {
      return res.status(400).json({ success: false, message: "Providers can only send messages to users" });
    }

    // Optionally prevent other roles from messaging
    if (sender.role !== "USER" && sender.role !== "PROVIDER") {
      return res.status(403).json({ success: false, message: "Only users and providers may send messages" });
    }

    const message = await prisma.message.create({
      data: {
        senderId: sender.id,
        receiverId: Number(receiverId),
        content,
        imageUrl,
      },
    });

    // Emit real-time events to both sender and receiver
    try {
      const io = getIO();
      io.to(`user:${receiver.id}`).emit("message:new", message);
      io.to(`user:${sender.id}`).emit("message:new", message);

      // Notify to update conversations / lists
      io.to(`user:${receiver.id}`).emit("conversations:update", { userId: sender.id, lastMessage: message });
      io.to(`user:${sender.id}`).emit("conversations:update", { userId: receiver.id, lastMessage: message });
    } catch (err) {
      // Non-fatal: if sockets are not initialized, still succeed the request
      console.warn("Socket emit skipped (not initialized)", err.message);
    }

    return res.status(201).json({ success: true, data: message });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ success: false, message: "Server error while sending message" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const otherId = Number(req.params.providerId || req.params.otherId);
    if (!otherId) return res.status(400).json({ success: false, message: "otherId is required" });

    // Ensure other user exists
    const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true, role: true } });
    if (!other) return res.status(404).json({ success: false, message: "User not found" });

    // Optional: enforce that communication is between USER and PROVIDER
    if (req.user.role === "USER" && other.role !== "PROVIDER") {
      return res.status(400).json({ success: false, message: "Users may only view messages with providers" });
    }
    if (req.user.role === "PROVIDER" && other.role !== "USER") {
      return res.status(400).json({ success: false, message: "Providers may only view messages with users" });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: otherId },
          { senderId: otherId, receiverId: req.user.id }
        ]
      },
      orderBy: { createdAt: "asc" }
    });

    res.json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching messages" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const uid = req.user.id;

    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: uid }, { receiverId: uid }] },
      orderBy: { createdAt: "desc" },
      select: { id: true, content: true, imageUrl: true, createdAt: true, senderId: true, receiverId: true }
    });

    // reduce to unique counterpart -> latest message
    const map = new Map();
    for (const m of messages) {
      const counterpart = m.senderId === uid ? m.receiverId : m.senderId;
      if (!map.has(counterpart)) map.set(counterpart, m);
    }

    const counterpartIds = Array.from(map.keys());

    const users = await prisma.user.findMany({ where: { id: { in: counterpartIds } }, select: { id: true, fullName: true, role: true } });
    const userById = new Map(users.map(u => [u.id, u]));

    const conversations = counterpartIds.map(id => ({
      userId: id,
      name: userById.get(id)?.fullName || null,
      role: userById.get(id)?.role || null,
      lastMessage: map.get(id),
    }));

    // sort by last message time desc
    conversations.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

    res.json({ success: true, count: conversations.length, data: conversations });
  } catch (err) {
    console.error("getConversations error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching conversations" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const messageId = Number(req.params.id);
    if (!messageId) return res.status(400).json({ success: false, message: "message id is required" });

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    // allow either sender or receiver to delete (UI shows delete to both)
    if (message.senderId !== req.user.id && message.receiverId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this message" });
    }

    await prisma.message.delete({ where: { id: messageId } });

    // emit deletion event
    try {
      const io = getIO();
      io.to(`user:${message.senderId}`).emit("message:deleted", { id: messageId });
      io.to(`user:${message.receiverId}`).emit("message:deleted", { id: messageId });

      // ask clients to refresh conversations for both users
      io.to(`user:${message.senderId}`).emit("conversations:update", { userId: message.receiverId });
      io.to(`user:${message.receiverId}`).emit("conversations:update", { userId: message.senderId });
    } catch (err) {
      console.warn("Socket emit skipped (not initialized)", err.message);
    }

    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    console.error("deleteMessage error:", err);
    res.status(500).json({ success: false, message: "Server error while deleting message" });
  }
};


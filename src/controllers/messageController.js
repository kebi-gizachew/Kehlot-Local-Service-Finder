import { prisma } from "../config/db.js";
import { getIO } from "../utils/socket.js";

export const sendMessage = async (req, res) => {
  try {
    const sender = req.user; 
    const { receiverId, content, imageUrl } = req.body || {};

    console.debug('sendMessage: content-type=', req.headers['content-type']);
    console.debug('sendMessage: senderId=', sender?.id, 'receiverId=', receiverId, 'contentLength=', content ? content.length : 0, 'hasImageUrl=', !!imageUrl);

    if (typeof receiverId === 'undefined' || receiverId === null) {
      return res.status(400).json({ success: false, message: "receiverId is required" });
    }

    if (!content && !imageUrl) {
      return res.status(400).json({ success: false, message: "Either content or imageUrl is required" });
    }

    // Ensure sender has a valid role
    if (!sender || !sender.role) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // Resolve receiverId: frontend may send either a User.id or a ServiceProvider.id
    let recIdNum = Number(receiverId);
    if (!Number.isInteger(recIdNum) || recIdNum <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid receiverId' });
    }

    // Try as user id first
    let receiver = await prisma.user.findUnique({ where: { id: recIdNum }, select: { id: true, role: true } });
    if (!receiver) {
      const sp = await prisma.serviceProvider.findUnique({ where: { id: recIdNum }, select: { userId: true } });
      if (sp && sp.userId) {
        recIdNum = sp.userId;
        receiver = await prisma.user.findUnique({ where: { id: recIdNum }, select: { id: true, role: true } });
      }
    }

    if (!receiver) return res.status(404).json({ success: false, message: "Receiver not found" });

    // Enforce: USER -> PROVIDER, PROVIDER -> USER
    if (sender.role === "USER" && receiver.role !== "PROVIDER") {
      return res.status(400).json({ success: false, message: "Users can only send messages to providers" });
    }
    if (sender.role === "PROVIDER" && receiver.role !== "USER") {
      return res.status(400).json({ success: false, message: "Providers can only send messages to users" });
    }
    if (sender.role !== "USER" && sender.role !== "PROVIDER") {
      return res.status(403).json({ success: false, message: "Only users and providers may send messages" });
    }
    const message = await prisma.message.create({
      data: {
        senderId: Number(sender.id),
        receiverId: recIdNum,
        content,
        imageUrl,
      },
    });

    // Emit real-time events to both sender and receiver
    try {
      const io = getIO();
      io.to(`user:${receiver.id}`).emit("message:new", message);
      io.to(`user:${sender.id}`).emit("message:new", message);
      io.to(`user:${receiver.id}`).emit("conversations:update", { userId: sender.id, lastMessage: message });
      io.to(`user:${sender.id}`).emit("conversations:update", { userId: receiver.id, lastMessage: message });
    } catch (err) {
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
    // otherId may be a user id or a serviceProvider id from frontend query params
    let otherId = Number(req.params.providerId || req.params.otherId);
    if (!otherId) return res.status(400).json({ success: false, message: "otherId is required" });

    let other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true, role: true } });
    if (!other) {
      const sp = await prisma.serviceProvider.findUnique({ where: { id: otherId }, select: { userId: true } });
      if (sp && sp.userId) {
        otherId = sp.userId;
        other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true, role: true } });
      }
    }

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

export const getMessageById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "message id is required" });

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });
    if (message.senderId !== req.user.id && message.receiverId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to view this message" });
    }

    return res.json({ success: true, data: { id: message.id, content: message.content, imageUrl: message.imageUrl, createdAt: message.createdAt, senderId: message.senderId, receiverId: message.receiverId } });
  } catch (err) {
    console.error("getMessageById error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching message" });
  }
};

export const copyMessage = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "message id is required" });

    const original = await prisma.message.findUnique({ where: { id } });
    if (!original) return res.status(404).json({ success: false, message: "Message not found" });
    if (original.senderId !== req.user.id && original.receiverId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to copy this message" });
    }

    const counterpart = original.senderId === req.user.id ? original.receiverId : original.senderId;

    const copied = await prisma.message.create({
      data: {
        senderId: req.user.id,
        receiverId: counterpart,
        content: original.content,
        imageUrl: original.imageUrl,
      },
    });

    // Emit events similar to sendMessage
    try {
      const io = getIO();
      io.to(`user:${counterpart}`).emit("message:new", copied);
      io.to(`user:${req.user.id}`).emit("message:new", copied);

      io.to(`user:${counterpart}`).emit("conversations:update", { userId: req.user.id, lastMessage: copied });
      io.to(`user:${req.user.id}`).emit("conversations:update", { userId: counterpart, lastMessage: copied });
    } catch (err) {
      console.warn("Socket emit skipped (not initialized)", err.message);
    }

    return res.status(201).json({ success: true, data: copied });
  } catch (err) {
    console.error("copyMessage error:", err);
    res.status(500).json({ success: false, message: "Server error while copying message" });
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
    try {
      const io = getIO();
      io.to(`user:${message.senderId}`).emit("message:deleted", { id: messageId });
      io.to(`user:${message.receiverId}`).emit("message:deleted", { id: messageId });
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


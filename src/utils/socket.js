import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

let io = null;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  // Socket-level authentication middleware: verify JWT from handshake.auth.token or Authorization header
  io.use((socket, next) => {
    try {
      const token = socket.handshake?.auth?.token || (socket.handshake?.headers?.authorization ? String(socket.handshake.headers.authorization).split(' ')[1] : null);
      if (!token) {
        console.warn('socket.io: no auth token provided for socket', socket.id);
        // Allow unauthenticated sockets by default. To require auth, replace `next()` with `next(new Error('Authentication error'))`.
        socket.user = null;
        return next();
      }

      if (!process.env.JWT_SECRET) {
        console.warn('JWT_SECRET is not set. Socket auth will attempt verification but will likely fail. Set JWT_SECRET in env for production.');
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "");
        // Attach decoded token payload to socket for use in handlers
        socket.user = decoded;
        return next();
      } catch (err) {
        console.warn('socket.io: token verification failed for socket', socket.id, err.message || err);
        socket.user = null;
        // Allow unauthenticated sockets; to enforce, call: return next(new Error('Authentication error'));
        return next();
      }
    } catch (err) {
      console.error('socket auth middleware error:', err);
      socket.user = null;
      return next();
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id, "user:", socket.user?.id || null);

    // Helper: resolve an incoming id which may be a User.id or a ServiceProvider.id
    const resolveToUserId = async (id) => {
      try {
        // Defensive parsing: ignore obviously-wrong values (timestamps, socket ids)
        const n = Number(id);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;

        // Prevent passing huge numbers to Prisma/DB (Postgres integer limits).
        // Use signed 32-bit limit as a safe upper bound for existing integer PKs.
        const MAX_DB_INT = 2147483647;
        if (n > MAX_DB_INT) return null;

        const user = await prisma.user.findUnique({ where: { id: n }, select: { id: true } });
        if (user) return user.id;
        const sp = await prisma.serviceProvider.findUnique({ where: { id: n }, select: { userId: true } });
        if (sp && sp.userId) return sp.userId;
        return null;
      } catch (err) {
        console.error("resolveToUserId error (ignored):", err?.message || err);
        return null;
      }
    };

    // Clients should join a room for their user id after connecting
    socket.on("join", async (userId) => {
      // Prefer server-authenticated user id when available
      const uid = socket.user?.id || await resolveToUserId(userId);
      if (!uid) return;
      const room = `user:${uid}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    // Core messaging over websocket: send message (persists to DB)
    // Payload: { senderId, receiverId, content?, imageUrl? }
    socket.on("message:send", async (payload, callback) => {
      try {
        const { senderId: payloadSenderId, receiverId, content, imageUrl } = payload || {};

        // Use authenticated socket user as sender when available (recommended).
        // Fall back to payload senderId for backwards compatibility.
        let sId = socket.user?.id || null;
        if (!sId && payloadSenderId) sId = await resolveToUserId(payloadSenderId);

        if (!sId || !receiverId) {
          const err = { success: false, message: "senderId (or authenticated socket) and receiverId are required" };
          if (typeof callback === "function") return callback(err);
          return;
        }

        const rId = await resolveToUserId(receiverId);
        if (!rId) {
          const err = { success: false, message: "receiverId must resolve to a valid user" };
          if (typeof callback === "function") return callback(err);
          return;
        }

        if (!content && !imageUrl) {
          const err = { success: false, message: "Either content or imageUrl is required" };
          if (typeof callback === "function") return callback(err);
          return;
        }

        const message = await prisma.message.create({
          data: {
            senderId: sId,
            receiverId: rId,
            content,
            imageUrl,
          },
        });

        // Emit real-time events to both sender and receiver
        io.to(`user:${rId}`).emit("message:new", message);
        io.to(`user:${sId}`).emit("message:new", message);

        // Notify to update conversations / lists
        io.to(`user:${rId}`).emit("conversations:update", { userId: sId, lastMessage: message });
        io.to(`user:${sId}`).emit("conversations:update", { userId: rId, lastMessage: message });

        if (typeof callback === "function") return callback({ success: true, data: message });
      } catch (err) {
        console.error("socket message:send error:", err);
        if (typeof callback === "function") return callback({ success: false, message: "Server error while sending message" });
      }
    });

    // Copy an existing message into the same conversation
    // Payload: { messageId, senderId }
    socket.on("message:copy", async (payload, callback) => {
      try {
        const { messageId, senderId: payloadSenderId } = payload || {};
        if (!messageId) {
          const err = { success: false, message: "messageId is required" };
          if (typeof callback === "function") return callback(err);
          return;
        }

        const original = await prisma.message.findUnique({ where: { id: Number(messageId) } });
        if (!original) {
          const err = { success: false, message: "Message not found" };
          if (typeof callback === "function") return callback(err);
          return;
        }
        // Use authenticated socket user as sender when available
        let sId = socket.user?.id || null;
        if (!sId && payloadSenderId) sId = await resolveToUserId(payloadSenderId);
        if (!sId) {
          const err = { success: false, message: "Invalid senderId" };
          if (typeof callback === "function") return callback(err);
          return;
        }
        if (!sId) {
          const err = { success: false, message: "Invalid senderId" };
          if (typeof callback === "function") return callback(err);
          return;
        }

        if (original.senderId !== sId && original.receiverId !== sId) {
          const err = { success: false, message: "Not authorized to copy this message" };
          if (typeof callback === "function") return callback(err);
          return;
        }

        const counterpart = original.senderId === sId ? original.receiverId : original.senderId;

        const copied = await prisma.message.create({
          data: {
            senderId: sId,
            receiverId: counterpart,
            content: original.content,
            imageUrl: original.imageUrl,
          },
        });

        io.to(`user:${counterpart}`).emit("message:new", copied);
        io.to(`user:${sId}`).emit("message:new", copied);

        io.to(`user:${counterpart}`).emit("conversations:update", { userId: sId, lastMessage: copied });
        io.to(`user:${sId}`).emit("conversations:update", { userId: counterpart, lastMessage: copied });

        if (typeof callback === "function") return callback({ success: true, data: copied });
      } catch (err) {
        console.error("socket message:copy error:", err);
        if (typeof callback === "function") return callback({ success: false, message: "Server error while copying message" });
      }
    });

    // Delete message via websocket
    // Payload: { messageId, requesterId }
    socket.on("message:delete", async (payload, callback) => {
      try {
        const { messageId, requesterId: payloadRequesterId } = payload || {};
        if (!messageId) {
          const err = { success: false, message: "messageId is required" };
          if (typeof callback === "function") return callback(err);
          return;
        }

        const msg = await prisma.message.findUnique({ where: { id: Number(messageId) } });
        if (!msg) {
          const err = { success: false, message: "Message not found" };
          if (typeof callback === "function") return callback(err);
          return;
        }
        // Use authenticated socket user as requester when available
        let rId = socket.user?.id || null;
        if (!rId && payloadRequesterId) rId = await resolveToUserId(payloadRequesterId);
        if (!rId) {
          const err = { success: false, message: "Invalid requesterId" };
          if (typeof callback === "function") return callback(err);
          return;
        }

        if (msg.senderId !== rId && msg.receiverId !== rId) {
          const err = { success: false, message: "Not authorized to delete this message" };
          if (typeof callback === "function") return callback(err);
          return;
        }

        await prisma.message.delete({ where: { id: Number(messageId) } });

        io.to(`user:${msg.senderId}`).emit("message:deleted", { id: msg.id });
        io.to(`user:${msg.receiverId}`).emit("message:deleted", { id: msg.id });

        io.to(`user:${msg.senderId}`).emit("conversations:update", { userId: msg.receiverId });
        io.to(`user:${msg.receiverId}`).emit("conversations:update", { userId: msg.senderId });

        if (typeof callback === "function") return callback({ success: true });
      } catch (err) {
        console.error("socket message:delete error:", err);
        if (typeof callback === "function") return callback({ success: false, message: "Server error while deleting message" });
      }
    });

    // Conversations list via websocket
    // Payload: { userId }
    socket.on("conversations:get", async (payload, callback) => {
      try {
        const { userId } = payload || {};
        if (!userId) {
          if (typeof callback === "function") return callback({ success: false, message: "userId is required" });
          return;
        }

        // Resolve possible ServiceProvider id to canonical user id
        const uid = await resolveToUserId(userId);
        if (!uid) {
          if (typeof callback === "function") return callback({ success: false, message: "userId could not be resolved" });
          return;
        }

        const messages = await prisma.message.findMany({
          where: { OR: [{ senderId: uid }, { receiverId: uid }] },
          orderBy: { createdAt: "desc" },
          select: { id: true, content: true, imageUrl: true, createdAt: true, senderId: true, receiverId: true },
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

        // sort by last message time desc
        conversations.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

        if (typeof callback === "function") return callback({ success: true, count: conversations.length, data: conversations });
      } catch (err) {
        console.error("socket conversations:get error:", err);
        if (typeof callback === "function") return callback({ success: false, message: "Server error while fetching conversations" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

// Example socket initialization with JWT auth and verbose logging
// Save as backend_socket_init.js (or integrate into your backend project)

import { Server } from "socket.io";
import jwt from 'jsonwebtoken';
// import your prisma client - adjust the path to your project
import { prisma } from "./config/db.js"; // <- update path if necessary

let io = null;

export const initSocket = (server, opts = {}) => {
  const cors = opts.cors || { origin: true, credentials: true };
  io = new Server(server, { cors });

  // Middleware: validate JWT on handshake and populate socket.data.user
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || (socket.handshake.headers && socket.handshake.headers.authorization && socket.handshake.headers.authorization.split(' ')[1]) || null;
      if (!token) {
        // allow anonymous connections but do not set user
        return next();
      }

      const secret = process.env.JWT_SECRET || 'change_this_secret';
      const payload = jwt.verify(token, secret);

      // Normalize user info on socket
      socket.data.user = {
        id: payload.id || payload.userId || payload.sub,
        fullName: payload.fullName || payload.name || null,
        role: payload.role || null,
      };

      return next();
    } catch (err) {
      console.warn('socket auth failed:', err && err.message ? err.message : err);
      // You may choose to reject the connection instead:
      // return next(new Error('Authentication error'));
      // For more tolerant setups, continue without user data
      return next();
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id, 'userId=', socket.data.user?.id || 'anonymous');

    socket.on('join', (userId) => {
      const uid = userId || socket.data.user?.id;
      if (!uid) {
        console.warn(`socket ${socket.id} attempted to join without userId`);
        return;
      }
      const room = `user:${uid}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on('message:send', async (payload, callback) => {
      try {
        // Derive senderId from authenticated socket (prevent spoofing)
        const senderId = socket.data.user?.id;
        if (!senderId) {
          const err = { success: false, message: 'Not authenticated. senderId must be derived from token.' };
          console.warn('message:send refused - unauthenticated socket', { socketId: socket.id, payload });
          if (typeof callback === 'function') return callback(err);
          return;
        }

        const { receiverId, content, imageUrl } = payload || {};
        if (!receiverId) {
          const err = { success: false, message: 'receiverId is required' };
          console.warn('message:send missing receiverId', { socketId: socket.id, senderId, payload });
          if (typeof callback === 'function') return callback(err);
          return;
        }
        if (!content && !imageUrl) {
          const err = { success: false, message: 'Either content or imageUrl is required' };
          console.warn('message:send missing content/image', { socketId: socket.id, senderId, payload });
          if (typeof callback === 'function') return callback(err);
          return;
        }

        const sId = Number(senderId);
        const rId = Number(receiverId);

        console.log('Persisting message', { from: sId, to: rId, contentLength: content ? content.length : 0, hasImage: !!imageUrl });

        const message = await prisma.message.create({
          data: {
            senderId: sId,
            receiverId: rId,
            content: content || null,
            imageUrl: imageUrl || null,
          },
        });

        // Emit to both parties
        io.to(`user:${rId}`).emit('message:new', message);
        io.to(`user:${sId}`).emit('message:new', message);

        // Update conversation lists
        io.to(`user:${rId}`).emit('conversations:update', { userId: sId, lastMessage: message });
        io.to(`user:${sId}`).emit('conversations:update', { userId: rId, lastMessage: message });

        if (typeof callback === 'function') return callback({ success: true, data: message });
      } catch (err) {
        console.error('socket message:send error:', err);
        if (typeof callback === 'function') return callback({ success: false, message: 'Server error while sending message', error: err.message });
      }
    });

    // Keep other existing handlers but prefer server-side user checks
    socket.on('message:copy', async (payload, callback) => {
      try {
        const senderId = socket.data.user?.id;
        if (!senderId) return callback && callback({ success: false, message: 'Not authenticated' });
        const { messageId } = payload || {};
        if (!messageId) return callback && callback({ success: false, message: 'messageId required' });

        const original = await prisma.message.findUnique({ where: { id: Number(messageId) } });
        if (!original) return callback && callback({ success: false, message: 'Message not found' });

        const sId = Number(senderId);
        if (original.senderId !== sId && original.receiverId !== sId) return callback && callback({ success: false, message: 'Not authorized to copy' });

        const counterpart = original.senderId === sId ? original.receiverId : original.senderId;
        const copied = await prisma.message.create({ data: { senderId: sId, receiverId: counterpart, content: original.content, imageUrl: original.imageUrl } });

        io.to(`user:${counterpart}`).emit('message:new', copied);
        io.to(`user:${sId}`).emit('message:new', copied);
        io.to(`user:${counterpart}`).emit('conversations:update', { userId: sId, lastMessage: copied });
        io.to(`user:${sId}`).emit('conversations:update', { userId: counterpart, lastMessage: copied });

        return callback && callback({ success: true, data: copied });
      } catch (err) {
        console.error('socket message:copy error:', err);
        return callback && callback({ success: false, message: 'Server error' });
      }
    });

    socket.on('message:delete', async (payload, callback) => {
      try {
        const requesterId = socket.data.user?.id;
        if (!requesterId) return callback && callback({ success: false, message: 'Not authenticated' });
        const { messageId } = payload || {};
        if (!messageId) return callback && callback({ success: false, message: 'messageId required' });

        const msg = await prisma.message.findUnique({ where: { id: Number(messageId) } });
        if (!msg) return callback && callback({ success: false, message: 'Message not found' });

        const rId = Number(requesterId);
        if (msg.senderId !== rId && msg.receiverId !== rId) return callback && callback({ success: false, message: 'Not authorized to delete' });

        await prisma.message.delete({ where: { id: Number(messageId) } });

        io.to(`user:${msg.senderId}`).emit('message:deleted', { id: msg.id });
        io.to(`user:${msg.receiverId}`).emit('message:deleted', { id: msg.id });

        io.to(`user:${msg.senderId}`).emit('conversations:update', { userId: msg.receiverId });
        io.to(`user:${msg.receiverId}`).emit('conversations:update', { userId: msg.senderId });

        return callback && callback({ success: true });
      } catch (err) {
        console.error('socket message:delete error:', err);
        return callback && callback({ success: false, message: 'Server error' });
      }
    });

    socket.on('conversations:get', async (payload, callback) => {
      try {
        const { userId } = payload || {};
        const uid = Number(userId || socket.data.user?.id);
        if (!uid) return callback && callback({ success: false, message: 'userId required' });

        const messages = await prisma.message.findMany({
          where: { OR: [{ senderId: uid }, { receiverId: uid }] },
          orderBy: { createdAt: 'desc' },
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

        const conversations = counterpartIds.map(id => ({ userId: id, name: userById.get(id)?.fullName || null, role: userById.get(id)?.role || null, lastMessage: map.get(id) }));
        conversations.sort((a,b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

        return callback && callback({ success: true, count: conversations.length, data: conversations });
      } catch (err) {
        console.error('socket conversations:get error:', err);
        return callback && callback({ success: false, message: 'Server error while fetching conversations' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

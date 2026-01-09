import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true
    }
  });

  io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const token = cookies.token;
    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // { id, role }
    next();
  });

  io.on("connection", (socket) => {
    console.log("Connected:", socket.user.id);

    socket.on("join_conversation", ({ conversationId }) => {
      socket.join(conversationId);
    });

    socket.on("send_message", async ({ conversationId, content }) => {
      const senderType =
        socket.user.role === "PROVIDER" ? "PROVIDER" : "USER";

      const message = await prisma.message.create({
        data: {
          content,
          sender: senderType,
          senderId: socket.user.id,
          conversationId
        }
      });

      io.to(conversationId).emit("receive_message", message);
    });
  });
};

import 'dotenv/config';
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB, disconnectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { initSocket } from "./utils/socket.js";


const app = express();
connectDB();

import path from 'path';

const REQUEST_LIMIT = process.env.REQUEST_LIMIT || '20mb'; // increased to support large base64 images

app.use(cors({
  origin: true,       
  credentials: true,  
}));

app.use(express.json({ limit: REQUEST_LIMIT }));
app.use(express.urlencoded({ limit: REQUEST_LIMIT, extended: true, parameterLimit: 10000 }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.type === 'entity.too.large' || err.status === 413) {
    console.warn('Payload too large:', err.message);
    return res.status(413).json({ success: false, message: `Payload too large. Maximum allowed size is ${REQUEST_LIMIT}` });
  }
  next(err);
});


app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/provider", providerRoutes);
app.use("/users", userRoutes);
app.use("/messages", messageRoutes);
app.use("/api/messages", messageRoutes);
app.use("/ratings", ratingRoutes);

app.get("/", (req, res) => {  
  res.json({ message: "Kihlot API is running" });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

if (!process.env.JWT_SECRET) {
  console.warn('Environment variable JWT_SECRET is not set. Socket authentication and JWT signing will be insecure or fail. Set JWT_SECRET in your environment for production.');
}

server.listen(PORT, () => {
  console.log(` Server running on PORT ${PORT}`);
});

// Initialize Socket.IO with the HTTP server instance
try {
  initSocket(server);
  console.log("Socket.IO initialized");
} catch (err) {
  console.error("Failed to initialize Socket.IO:", err);
}


process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(async () => {
    await disconnectDB();
    process.exit(1);
  });
});

process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);
  await disconnectDB();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});

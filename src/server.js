import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB, disconnectDB } from "./config/db.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { initSocket } from "./utils/socket.js";




// Initialize app
const app = express();

// Connect to database
connectDB();

// --------------------
// Middlewares
// --------------------
app.use(cors({
  origin: true,       // allow frontend origin
  credentials: true,  // allow cookies
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --------------------
// Routes
// --------------------
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/provider", providerRoutes);
app.use("/users", userRoutes);
// Messages: keep existing mount and add an /api/messages alias for compatibility
app.use("/messages", messageRoutes);
app.use("/api/messages", messageRoutes);
app.use("/ratings", ratingRoutes);

// Health check
app.get("/", (req, res) => {  
  res.json({ message: "Kihlot API is running" });
});

// --------------------
// Server
// --------------------
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(` Server running on PORT ${PORT}`);
});

// Initialize Socket.IO
try {
  initSocket(server);
  console.log("Socket.IO initialized");
} catch (err) {
  console.error("Failed to initialize Socket.IO:", err);
}

// --------------------
// Error & Shutdown Handling
// --------------------

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(async () => {
    await disconnectDB();
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);
  await disconnectDB();
  process.exit(1);
});

// Graceful shutdown (e.g. production stop)
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});

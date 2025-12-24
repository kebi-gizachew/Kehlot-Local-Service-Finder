import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB, disconnectDB } from "./config/db.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";


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

// Health check
app.get("/", (req, res) => {
  res.json({ message: "SkillAddis API is running" });
});

// --------------------
// Server
// --------------------
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(` Server running on PORT ${PORT}`);
});

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

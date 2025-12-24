import express from "express";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);

export default app;

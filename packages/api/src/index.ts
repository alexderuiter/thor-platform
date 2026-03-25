import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authenticate } from "./middleware/auth.js";
import zakenRouter from "./routes/zaken.js";
import workflowRouter from "./routes/workflow.js";
import werkopdrachtenRouter from "./routes/werkopdrachten.js";
import { prisma } from "./db/client.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers (BEV requirements)
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "thor-api", version: "0.1.0" });
});

// Auth middleware for all /api routes
app.use("/api", authenticate);

// Routes
app.use("/api/zaken", zakenRouter);
app.use("/api/workflow", workflowRouter);
app.use("/api/werkopdrachten", werkopdrachtenRouter);

// Current user info
app.get("/api/me", (req, res) => {
  res.json(req.user);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🏛️  THOR API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;

import "dotenv/config";
import express from "express";
import cors from "cors";
import { shutdown } from "./db.js";
import marketsRouter from "./routes/markets.js";
import positionsRouter from "./routes/positions.js";
import statsRouter from "./routes/stats.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/markets", marketsRouter);
app.use("/api/users", positionsRouter);
app.use("/api/stats", statsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// Start server
const server = app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("\nShutting down...");
  server.close(async () => {
    await shutdown();
    console.log("Server shut down gracefully");
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error("Could not close connections in time, forcing shutdown");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

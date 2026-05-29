import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { leadsRouter } from "./routes/leads.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { ordersRouter } from "./routes/orders.js";
import { coreRouter } from "./routes/core.js";
import { appStateRouter } from "./routes/appState.js";

const app = express();
const port = process.env.PORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "..", "dist");

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") || true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "smartcovering-erp-api" }));
app.use("/api/auth", authRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/app-state", appStateRouter);
app.use("/api/leads", requireAuth, leadsRouter);
app.use("/api/orders", requireAuth, ordersRouter);
app.use("/api", requireAuth, coreRouter);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(port, () => {
  console.log(`SmartCovering ERP API running on http://localhost:${port}`);
});

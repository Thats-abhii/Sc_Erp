import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const appStateRouter = Router();

const allowedKeys = new Set([
  "leads",
  "orders",
  "followups",
  "payments",
  "salesmen",
  "channelPartners",
  "bills",
  "purchases",
  "smartInventory",
  "inventory",
  "workOrders",
  "expenses",
  "reassignmentLogs",
  "auditLogs"
]);

appStateRouter.use(requireAuth);

appStateRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await query("select key, value, updated_at from app_state order by key");
    res.json({ state: Object.fromEntries(rows.map((row) => [row.key, row.value])), updatedAt: Object.fromEntries(rows.map((row) => [row.key, row.updated_at])) });
  } catch (error) {
    next(error);
  }
});

appStateRouter.put("/", async (req, res, next) => {
  try {
    const entries = Object.entries(req.body?.state || {}).filter(([key]) => allowedKeys.has(key));
    if (!entries.length) return res.status(400).json({ error: "No valid app state keys supplied" });

    const saved = [];
    for (const [key, value] of entries) {
      const rows = await query(
        `insert into app_state (key, value, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (key) do update set value = excluded.value, updated_at = now()
         returning key, updated_at`,
        [key, JSON.stringify(value ?? null)]
      );
      saved.push(rows[0]);
    }
    res.json({ ok: true, saved });
  } catch (error) {
    next(error);
  }
});

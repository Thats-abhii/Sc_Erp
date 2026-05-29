import { Router } from "express";
import { query } from "../db/pool.js";
import { requireOperator } from "../middleware/auth.js";
import { audit, duplicateError, normalizeMobile, validateEmail, validateMobile, validationError } from "../services/validation.js";

export const coreRouter = Router();

const tables = {
  inventory: "inventory_items",
  stock: "stock_movements",
  finished: "finished_goods",
  followups: "followups",
  salesmen: "salesmen",
  workorders: "work_orders",
  payments: "payments",
  expenses: "expenses"
};

const writableColumns = {
  inventory: ["item_name", "category", "unit", "current_stock", "minimum_stock", "supplier_name", "last_purchase_price", "last_purchase_date"],
  finished: ["product_name", "variant", "unit", "quantity_in_stock", "production_date", "reserved_for_orders"],
  followups: ["lead_id", "salesman_id", "due_at", "type", "outcome", "next_action", "next_followup_at", "status", "notes"],
  salesmen: ["name", "mobile", "email", "joining_date", "territory", "active"],
  workorders: ["order_id", "product_name", "quantity", "raw_materials", "assigned_staff", "start_date", "expected_completion_date", "status", "completed_at"],
  payments: ["order_id", "paid_on", "amount", "mode", "notes"],
  expenses: ["spent_on", "category", "description", "amount"]
};

function pickWritable(route, body) {
  const allowed = writableColumns[route] || [];
  return Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
}

for (const [route, table] of Object.entries(tables)) {
  coreRouter.get(`/${route}`, async (_req, res, next) => {
    try {
      res.json(await query(`select * from ${table} order by created_at desc nulls last`));
    } catch (error) {
      next(error);
    }
  });
}

coreRouter.post("/stock", requireOperator, async (req, res, next) => {
  try {
    const b = req.body;
    const delta = b.direction === "OUT" ? -Math.abs(Number(b.quantity)) : Math.abs(Number(b.quantity));
    await query("update inventory_items set current_stock = current_stock + $1 where id = $2", [delta, b.inventory_item_id]);
    const rows = await query(
      `insert into stock_movements (inventory_item_id, direction, quantity, reason, reference_id)
       values ($1,$2,$3,$4,$5) returning *`,
      [b.inventory_item_id, b.direction, Math.abs(Number(b.quantity)), b.reason, b.reference_id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

coreRouter.post("/:route", requireOperator, async (req, res, next) => {
  try {
    const table = tables[req.params.route];
    if (!table || req.params.route === "stock") return res.status(404).json({ error: "Unknown resource" });
    if (["salesmen"].includes(req.params.route)) {
      const mobile = normalizeMobile(req.body.mobile);
      const mobileError = validateMobile(mobile);
      if (mobileError) return validationError(res, mobileError);
      const emailError = validateEmail(req.body.email);
      if (emailError) return validationError(res, emailError);
      req.body.mobile = mobile;
    }
    const data = pickWritable(req.params.route, req.body);
    const keys = Object.keys(data);
    if (!keys.length) return res.status(400).json({ error: "No writable fields supplied" });

    const columns = keys.map((key) => `"${key}"`).join(", ");
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
    const values = keys.map((key) => typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key]);
    const rows = await query(`insert into ${table} (${columns}) values (${placeholders}) returning *`, values);
    await audit(query, req, "Created", { source: req.params.route, recordType: req.params.route, recordId: rows[0].id });
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") return duplicateError(res, "Duplicate record blocked");
    next(error);
  }
});

coreRouter.patch("/:route/:id", requireOperator, async (req, res, next) => {
  try {
    const table = tables[req.params.route];
    if (!table || req.params.route === "stock") return res.status(404).json({ error: "Unknown resource" });
    const data = pickWritable(req.params.route, req.body);
    const keys = Object.keys(data);
    if (!keys.length) return res.status(400).json({ error: "No writable fields supplied" });

    const assignments = keys.map((key, index) => `"${key}" = $${index + 2}`).join(", ");
    const values = keys.map((key) => typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key]);
    const rows = await query(`update ${table} set ${assignments} where id = $1 returning *`, [req.params.id, ...values]);
    if (!rows[0]) return res.status(404).json({ error: "Record not found" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

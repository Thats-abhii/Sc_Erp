import { Router } from "express";
import { query } from "../db/pool.js";
import { requireOperator } from "../middleware/auth.js";
import { streamCommercialPdf } from "../services/pdf.js";
import { audit, checkIdempotency, duplicateError, normalizeMobile, storeIdempotentResponse, validateMobile, validationError } from "../services/validation.js";

export const ordersRouter = Router();

ordersRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await query("select * from orders order by created_at desc"));
  } catch (error) {
    next(error);
  }
});

ordersRouter.post("/", requireOperator, async (req, res, next) => {
  try {
    const b = req.body;
    const mobile = normalizeMobile(b.mobile);
    const mobileError = validateMobile(mobile);
    if (mobileError) return validationError(res, mobileError);
    const idem = await checkIdempotency(query, req, "orders:create", JSON.stringify({ lead_id: b.lead_id || "", mobile, items: b.items || [] }));
    if (idem && !idem.inserted && idem.response_body) return res.status(idem.response_status || 200).json(idem.response_body);
    const duplicate = await query(
      `select 'Order' as type, id as ref, customer_name as name from orders where mobile = $1 or (lead_id is not null and lead_id = $2)
       limit 1`,
      [mobile, b.lead_id || null]
    );
    if (duplicate[0]) {
      await audit(query, req, "Duplicate Attempt", { source: "Order Management", duplicate: duplicate[0], mobile, lead_id: b.lead_id || null }, true);
      return duplicateError(res, `Customer/order already exists in ${duplicate[0].type} ${duplicate[0].ref}`);
    }
    const rows = await query(
      `insert into orders
       (lead_id, customer_name, mobile, items, discount, final_amount, advance_paid, balance_due, delivery_date, installation_required, installer, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
      [b.lead_id, b.customer_name, mobile, JSON.stringify(b.items || []), b.discount || 0, b.final_amount, b.advance_paid || 0, b.balance_due || 0, b.delivery_date, !!b.installation_required, b.installer, b.status || "Pending"]
    );
    await audit(query, req, "Created", { source: "Order Management", recordType: "Order", recordId: rows[0].id, mobile });
    await storeIdempotentResponse(query, req, "orders:create", 201, rows[0]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") return duplicateError(res, "Customer/order already exists");
    next(error);
  }
});

ordersRouter.get("/:id/:file", async (req, res, next) => {
  try {
    const match = /^(invoice|quotation)\.pdf$/.exec(req.params.file);
    if (!match) return res.status(404).json({ error: "PDF not found" });
    const rows = await query("select * from orders where id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Order not found" });
    streamCommercialPdf(res, { type: match[1], order: rows[0] });
  } catch (error) {
    next(error);
  }
});

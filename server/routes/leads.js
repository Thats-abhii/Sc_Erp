import { Router } from "express";
import { query } from "../db/pool.js";
import { requireOperator } from "../middleware/auth.js";
import { audit, checkIdempotency, duplicateError, normalizeMobile, storeIdempotentResponse, validateEmail, validateMobile, validationError } from "../services/validation.js";

export const leadsRouter = Router();

leadsRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await query("select * from leads order by created_at desc"));
  } catch (error) {
    next(error);
  }
});

leadsRouter.post("/", requireOperator, async (req, res, next) => {
  try {
    const b = req.body;
    const mobile = normalizeMobile(b.mobile);
    const mobileError = validateMobile(mobile);
    if (mobileError) return validationError(res, mobileError);
    const emailError = validateEmail(b.email);
    if (emailError) return validationError(res, emailError);
    const idem = await checkIdempotency(query, req, "leads:create", JSON.stringify({ mobile, email: b.email || "" }));
    if (idem && !idem.inserted && idem.response_body) return res.status(idem.response_status || 200).json(idem.response_body);
    const duplicate = await query(
      `select 'Lead' as type, id::text as ref, name from leads where mobile = $1 or (nullif($2,'') is not null and lower(email) = lower($2))
       union all
       select 'Order' as type, id as ref, customer_name as name from orders where mobile = $1
       limit 1`,
      [mobile, b.email || ""]
    );
    if (duplicate[0]) {
      await audit(query, req, "Duplicate Attempt", { source: "Lead Management", duplicate: duplicate[0], mobile, email: b.email || "" }, true);
      return duplicateError(res, `Customer already exists in ${duplicate[0].type} ${duplicate[0].ref}`);
    }
    const rows = await query(
      `insert into leads
       (name, mobile, alternate_mobile, email, source, product_interest, location, budget, salesman_id, status, priority, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
      [b.name, mobile, normalizeMobile(b.alternate_mobile), b.email || null, b.source, b.product_interest, b.location, b.budget, b.salesman_id, b.status || "New", b.priority || "Warm", b.notes]
    );
    await audit(query, req, "Created", { source: "Lead Management", recordType: "Lead", recordId: rows[0].id, mobile });
    await storeIdempotentResponse(query, req, "leads:create", 201, rows[0]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Customer already exists" });
    next(error);
  }
});

leadsRouter.patch("/:id", requireOperator, async (req, res, next) => {
  try {
    const rows = await query(
      `update leads set
       name = coalesce($2,name), status = coalesce($3,status), priority = coalesce($4,priority),
       salesman_id = coalesce($5,salesman_id), notes = coalesce($6,notes), updated_at = now()
       where id = $1 returning *`,
      [req.params.id, req.body.name, req.body.status, req.body.priority, req.body.salesman_id, req.body.notes]
    );
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

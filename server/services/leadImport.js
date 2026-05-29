import { query } from "../db/pool.js";
import { normalizeMobile, validateEmail, validateMobile } from "./validation.js";

function digits(value = "") {
  return normalizeMobile(value);
}

export async function upsertImportedLead(payload, source) {
  const mobile = digits(payload.mobile || payload.phone || payload.customer_mobile);
  const mobileError = validateMobile(mobile);
  if (mobileError) throw new Error(mobileError);
  const email = payload.email || "";
  const emailError = validateEmail(email);
  if (emailError) throw new Error(emailError);

  const existing = await query("select * from leads where mobile = $1 or (nullif($2,'') is not null and lower(email) = lower($2)) limit 1", [mobile, email]);
  if (existing[0]) {
    const merged = await query(
      `update leads
       set name = coalesce(nullif($2,''), name),
           email = coalesce(nullif($3,''), email),
           location = coalesce(nullif($4,''), location),
           source = $5,
           updated_at = now()
       where id = $1
       returning *`,
      [
        existing[0].id,
        payload.name || payload.customer_name || "",
        email,
        payload.location || payload.city || "",
        source
      ]
    );
    return { lead: merged[0], duplicate: true };
  }

  const lead = await query(
    `insert into leads
      (name, mobile, alternate_mobile, email, source, product_interest, location, budget, salesman_id, status, priority, notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'New','Warm',$10)
     returning *`,
    [
      payload.name || payload.customer_name || "New Lead",
      mobile,
      digits(payload.alternate_mobile || payload.alt_phone || ""),
      email || null,
      source,
      payload.product || payload.product_interest || "Roller Blind",
      payload.location || payload.city || "",
      payload.budget ? Number(payload.budget) : null,
      payload.salesman_id || null,
      payload.notes || `Imported from ${source}`
    ]
  );
  return { lead: lead[0], duplicate: false };
}

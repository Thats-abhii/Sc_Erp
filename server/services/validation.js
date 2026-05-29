export function normalizeMobile(value = "") {
  return String(value).replace(/\D/g, "");
}

export function validateMobile(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Mobile number is mandatory";
  if (!/^\d+$/.test(raw)) return "Mobile number must contain only numbers";
  if (raw.length !== 10) return "Mobile number must be exactly 10 digits";
  return "";
}

export function validateEmail(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? "" : "Enter a valid email address";
}

export function validationError(res, message) {
  return res.status(400).json({ error: message });
}

export function duplicateError(res, message = "Customer already exists") {
  return res.status(409).json({ error: message });
}

export async function audit(query, req, event, detail = {}, duplicate = false) {
  try {
    await query(
      `insert into audit_logs (event, source, actor_id, duplicate_attempt, detail)
       values ($1,$2,$3,$4,$5)`,
      [event, detail.source || "API", req.user?.id || null, duplicate, JSON.stringify(detail)]
    );
  } catch {
    // Audit failure should not block the business action.
  }
}

export async function checkIdempotency(query, req, scope, requestHash) {
  const key = req.headers["idempotency-key"];
  if (!key) return null;
  const rows = await query(
    `insert into idempotency_keys (key, scope, request_hash)
     values ($1,$2,$3)
     on conflict (key, scope) do update set key = excluded.key
     returning (xmax = 0) as inserted, response_status, response_body`,
    [String(key), scope, requestHash]
  );
  return rows[0];
}

export async function storeIdempotentResponse(query, req, scope, status, body) {
  const key = req.headers["idempotency-key"];
  if (!key) return;
  await query(
    `update idempotency_keys
     set response_status = $3, response_body = $4, created_at = now()
     where key = $1 and scope = $2`,
    [String(key), scope, status, JSON.stringify(body)]
  );
}

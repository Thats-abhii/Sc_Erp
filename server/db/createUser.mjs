import "dotenv/config";
import bcrypt from "bcryptjs";
import { query } from "./pool.js";

const [, , name, loginIdOrEmail, password, role = "management", linkedEntityId = ""] = process.argv;

if (!name || !loginIdOrEmail || !password) {
  console.error("Usage: npm run db:create-user -- \"Name\" loginIdOrEmail password [management|salesman|production|channel_partner|manager|operator] [linkedEntityId]");
  process.exit(1);
}

if (!["management", "salesman", "production", "channel_partner", "manager", "operator"].includes(role)) {
  console.error("Role must be management, salesman, production, channel_partner, manager, or operator");
  process.exit(1);
}

const loginId = loginIdOrEmail.trim().toLowerCase();
const email = loginId.includes("@") ? loginId : `${loginId}@smartcovering.local`;
const passwordHash = await bcrypt.hash(password, 12);
const [user] = await query(
  `
    insert into users (name, email, login_id, password_hash, role, linked_entity_id)
    values ($1, lower($2), lower($3), $4, $5, $6)
    on conflict (email)
    do update set
      name = excluded.name,
      login_id = excluded.login_id,
      password_hash = excluded.password_hash,
      role = excluded.role,
      linked_entity_id = excluded.linked_entity_id,
      active = true
    returning id, name, email, login_id, role, linked_entity_id
  `,
  [name, email, loginId, passwordHash, role, linkedEntityId || null]
);

console.log(JSON.stringify({ ok: true, user }, null, 2));

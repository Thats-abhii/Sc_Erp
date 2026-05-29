import "dotenv/config";
import bcrypt from "bcryptjs";
import { query } from "./pool.js";

const [, , name, email, password, role = "operator"] = process.argv;

if (!name || !email || !password) {
  console.error("Usage: npm run db:create-user -- \"Name\" email@example.com password [operator|manager]");
  process.exit(1);
}

if (!["operator", "manager"].includes(role)) {
  console.error("Role must be operator or manager");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
const [user] = await query(
  `
    insert into users (name, email, password_hash, role)
    values ($1, lower($2), $3, $4)
    on conflict (email)
    do update set
      name = excluded.name,
      password_hash = excluded.password_hash,
      role = excluded.role,
      active = true
    returning id, name, email, role
  `,
  [name, email, passwordHash, role]
);

console.log(JSON.stringify({ ok: true, user }, null, 2));

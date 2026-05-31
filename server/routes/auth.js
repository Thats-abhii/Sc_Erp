import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db/pool.js";
import { cookieOptions, requireAuth, signUser } from "../middleware/auth.js";

export const authRouter = Router();

const publicUser = user => ({
  id: user.id,
  name: user.name,
  role: user.role,
  email: user.email,
  loginId: user.login_id || user.email,
  linkedEntityId: user.linked_entity_id || null,
  sessionVersion: Number(user.session_version || 0)
});

const requestMeta = req => ({
  ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "",
  userAgent: req.headers["user-agent"] || ""
});

async function logLoginAttempt(req, { loginId, role, success, failureReason, userId = null }) {
  try {
    const meta = requestMeta(req);
    await query(
      `insert into login_attempts (login_id, role, success, failure_reason, user_id, ip_address, user_agent)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [loginId || "", role || null, success, failureReason || null, userId, meta.ip, meta.userAgent]
    );
  } catch (error) {
    console.error("Failed to write login attempt", error);
  }
}

async function migrateLegacyAppUser({ userLogin, password, role }) {
  const key = role === "channel_partner" ? "channelPartners" : role === "salesman" ? "salesmen" : "";
  if (!key) return null;

  const rows = await query("select value from app_state where key = $1 limit 1", [key]);
  const records = Array.isArray(rows[0]?.value) ? rows[0].value : [];
  const legacy = records.find((record) =>
    String(record.loginId || "").trim().toLowerCase() === userLogin &&
    String(record.password || "") === String(password || "")
  );
  if (!legacy) return null;

  const passwordHash = await bcrypt.hash(password, 12);
  const email = `${userLogin}@smartcovering.local`;
  const name = legacy.name || legacy.owner || userLogin;
  const linkedEntityId = String(legacy.id || "");
  const users = await query(
    `insert into users (name, email, login_id, password_hash, role, linked_entity_id, active)
     values ($1, $2, $3, $4, $5, $6, true)
     on conflict (email)
     do update set
       name = excluded.name,
       login_id = excluded.login_id,
       password_hash = excluded.password_hash,
       role = excluded.role,
       linked_entity_id = excluded.linked_entity_id,
       session_version = users.session_version + 1,
       active = true
     returning *`,
    [name, email, userLogin, passwordHash, role, linkedEntityId || null]
  );
  return users[0] || null;
}

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, loginId, password, role } = req.body;
    const userLogin = String(loginId || email || "").trim().toLowerCase();
    if (!userLogin || !password) return res.status(400).json({ error: "Login ID and password are required" });

    const users = await query(
      `select * from users
       where active = true
         and (lower(email) = $1 or lower(login_id) = $1)
         and ($2::text is null or role::text = $2)
       limit 1`,
      [userLogin, role || null]
    );
    let user = users[0];
    if (!user && ["channel_partner", "salesman"].includes(role)) {
      user = await migrateLegacyAppUser({ userLogin, password, role });
    }
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await logLoginAttempt(req, { loginId: userLogin, role, success: false, failureReason: "Invalid credentials", userId: user?.id || null });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signUser(user);
    await logLoginAttempt(req, { loginId: userLogin, role: user.role, success: true, userId: user.id });
    res.cookie("smartcovering_session", token, cookieOptions());
    res.json({ ok: true, token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: { id: req.user.sub, name: req.user.name, role: req.user.role, loginId: req.user.loginId, linkedEntityId: req.user.linkedEntityId || null } });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("smartcovering_session", { path: "/" });
  res.json({ ok: true });
});

authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current password and new password are required" });
    if (String(newPassword).length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
    const rows = await query("select * from users where id = $1 and active = true limit 1", [req.user.sub]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query("update users set password_hash = $1, session_version = session_version + 1 where id = $2", [passwordHash, user.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/users", requireAuth, async (req, res, next) => {
  try {
    if (!["management", "manager", "operator"].includes(req.user?.role)) {
      return res.status(403).json({ error: "Management access required" });
    }
    const { name, loginId, password, role, linkedEntityId } = req.body || {};
    const userLogin = String(loginId || "").trim().toLowerCase();
    if (!name || !userLogin || !password || !role) {
      return res.status(400).json({ error: "Name, login ID, password and role are required" });
    }
    if (!["management", "salesman", "production", "channel_partner", "manager", "operator"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const email = `${userLogin}@smartcovering.local`;
    const users = await query(
      `insert into users (name, email, login_id, password_hash, role, linked_entity_id, active)
       values ($1, $2, $3, $4, $5, $6, true)
       on conflict (email)
       do update set
         name = excluded.name,
         login_id = excluded.login_id,
         password_hash = excluded.password_hash,
         role = excluded.role,
         linked_entity_id = excluded.linked_entity_id,
         session_version = users.session_version + 1,
         active = true
       returning id, name, email, login_id, role, linked_entity_id, session_version`,
      [String(name).trim(), email, userLogin, passwordHash, role, linkedEntityId ? String(linkedEntityId) : null]
    );
    res.json({ ok: true, user: publicUser(users[0]) });
  } catch (error) {
    next(error);
  }
});

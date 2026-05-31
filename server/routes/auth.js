import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db/pool.js";
import { cookieOptions, signUser } from "../middleware/auth.js";

export const authRouter = Router();

const publicUser = user => ({
  id: user.id,
  name: user.name,
  role: user.role,
  email: user.email,
  loginId: user.login_id || user.email,
  linkedEntityId: user.linked_entity_id || null
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
    res.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "") || Object.fromEntries(String(req.headers.cookie || "").split(";").map(part => {
      const index = part.indexOf("=");
      return index === -1 ? ["", ""] : [decodeURIComponent(part.slice(0, index).trim()), decodeURIComponent(part.slice(index + 1).trim())];
    })).smartcovering_session;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const jwt = await import("jsonwebtoken");
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
    res.json({ user: { id: decoded.sub, name: decoded.name, role: decoded.role, loginId: decoded.loginId, linkedEntityId: decoded.linkedEntityId || null } });
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("smartcovering_session", { path: "/" });
  res.json({ ok: true });
});

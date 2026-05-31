import jwt from "jsonwebtoken";
import { query } from "../db/pool.js";

export function signUser(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name,
      loginId: user.login_id || user.email,
      linkedEntityId: user.linked_entity_id || null,
      sessionVersion: Number(user.session_version || 0)
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000,
    path: "/"
  };
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map(part => {
    const index = part.indexOf("=");
    if (index === -1) return ["", ""];
    return [decodeURIComponent(part.slice(0, index).trim()), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

export function tokenFromRequest(req) {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (bearer) return bearer;
  return parseCookies(req).smartcovering_session || "";
}

export async function requireAuth(req, res, next) {
  const token = tokenFromRequest(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const rows = await query(
      "select id, active, session_version from users where id = $1 limit 1",
      [decoded.sub]
    );
    const user = rows[0];
    if (!user?.active || Number(user.session_version || 0) !== Number(decoded.sessionVersion)) {
      return res.status(401).json({ error: "Session expired. Please login again." });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Authentication failed", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireOperator(req, res, next) {
  if (req.user?.role !== "operator") {
    return res.status(403).json({ error: "Operator access required" });
  }
  next();
}

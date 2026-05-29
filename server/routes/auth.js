import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db/pool.js";
import { signUser } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const users = await query("select * from users where email = $1 and active = true limit 1", [email]);
    const user = users[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ token: signUser(user), user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  } catch (error) {
    next(error);
  }
});

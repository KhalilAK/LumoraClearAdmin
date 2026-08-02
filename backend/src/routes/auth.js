import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { supabase } from "../db.js";

export const authRouter = Router();

// Roles allowed into the admin site. Anyone else with valid credentials
// still gets denied — this is an access gate, not just a login check.
const ALLOWED_ROLES = ["Admin", "Developer"];

// Must match the main LumoraClear backend's hashForSearching() exactly —
// email_hash is the only way to look up a user, since email itself is
// stored encrypted.
function hashForSearching(text) {
  if (!text || typeof text !== "string" || text.trim() === "") return null;
  return crypto.createHash("sha256").update(text.toLowerCase().trim()).digest("hex");
}

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const emailHash = hashForSearching(email);

  const { data: user, error } = await supabase
    .from("users")
    .select("id, passwordHash, role")
    .eq("email_hash", emailHash)
    .maybeSingle();

  if (error) {
    console.error("[auth] login lookup failed:", error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  // passwordHash is null for social-login-only accounts — no password to check.
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return res.status(403).json({ error: "Your account does not have permission to access this site" });
  }

  req.session.authenticated = true;
  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ ok: true, role: user.role });
});

authRouter.post("/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.json({ authenticated: true, role: req.session.role });
  }
  res.json({ authenticated: false });
});

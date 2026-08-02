import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";

import { authRouter } from "./routes/auth.js";
import { tablesRouter } from "./routes/tables.js";
import { themeRouter } from "./routes/theme.js";
import { requireAuth } from "./middleware/requireAuth.js";

const isProduction = process.env.NODE_ENV === "production";

const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy — needed for secure cookies to work

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(
  cookieSession({
    name: "lumora_admin_session",
    secret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
    maxAge: 12 * 60 * 60 * 1000,
    // Frontend (Vercel) and backend (Render) are different sites in
    // production, so the session cookie needs sameSite:"none" (which in turn
    // requires secure:true — browsers reject none+insecure) to be sent on
    // cross-origin fetches. Locally both run on http://localhost, so "lax"
    // + non-secure is what actually works there.
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  })
);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/tables", requireAuth, tablesRouter);
app.use("/api/theme", requireAuth, themeRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`LumoraClear admin backend listening on http://localhost:${port}`);
});

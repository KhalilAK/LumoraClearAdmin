import { Router } from "express";
import { supabase } from "../db.js";

export const logsRouter = Router();

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

// Read-only paginated audit_logs, newest first. Separate from the generic
// /api/tables/:key/rows browser (which orders by primary key ascending) —
// a log feed wants reverse-chronological order instead.
logsRouter.get("/", async (req, res) => {
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

  const { data, error, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("timestamp", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[logs] failed to read audit_logs:", error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  res.json({ rows: data, total: count, limit, offset });
});

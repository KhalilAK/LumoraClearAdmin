import { Router } from "express";
import { supabase } from "../db.js";
import { TABLES, getTableByKey } from "../schema/tables.js";

export const tablesRouter = Router();

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

// List of all browsable tables + their column metadata. No row data here.
tablesRouter.get("/", (req, res) => {
  res.json(
    TABLES.map(({ key, tableName, displayName, primaryKey, description, columns }) => ({
      key,
      tableName,
      displayName,
      primaryKey,
      description: description || null,
      columns,
    }))
  );
});

// Read-only paginated rows for one table. `key` is resolved against the
// static TABLES whitelist below — never pass req.params.key straight to
// supabase.from(), even though the client parameterizes it safely either way.
tablesRouter.get("/:key/rows", async (req, res) => {
  const table = getTableByKey(req.params.key);
  if (!table) {
    return res.status(404).json({ error: `Unknown table "${req.params.key}"` });
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

  const { data, error, count } = await supabase
    .from(table.tableName)
    .select("*", { count: "exact" })
    .order(table.primaryKey, { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error(`[tables] failed to read "${table.tableName}":`, error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  res.json({ rows: data, total: count, limit, offset });
});

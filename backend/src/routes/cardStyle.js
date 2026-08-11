import { Router } from "express";
import { supabase } from "../db.js";

export const cardStyleRouter = Router();

// Mirrors theme_colors' shape exactly (one row per mode, camelCase columns,
// plain upsert-with-onConflict — no manual read+merge needed since these are
// separate flat columns, not a jsonb blob like page_content).
const NUMBER_FIELDS = ["borderRadius", "borderWidth", "shadowOpacity", "shadowRadius", "shadowOffsetX", "shadowOffsetY", "elevation"];
const COLOR_FIELDS = ["borderColor", "shadowColor"];
const ALL_FIELDS = [...NUMBER_FIELDS, ...COLOR_FIELDS];

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

cardStyleRouter.get("/", async (req, res) => {
  const { data, error } = await supabase.from("card_style").select("*");

  if (error) {
    console.error("[cardStyle] failed to load card_style:", error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  const byMode = { light: null, dark: null };
  for (const row of data) {
    if (row.mode === "light" || row.mode === "dark") byMode[row.mode] = row;
  }
  res.json(byMode);
});

cardStyleRouter.put("/", async (req, res) => {
  const { mode, style } = req.body || {};

  if (mode !== "light" && mode !== "dark") {
    return res.status(400).json({ error: 'mode must be "light" or "dark"' });
  }
  if (!style || typeof style !== "object" || Array.isArray(style)) {
    return res.status(400).json({ error: "style object is required" });
  }

  const entries = Object.entries(style).filter(([key]) => ALL_FIELDS.includes(key));
  if (entries.length === 0) {
    return res.status(400).json({ error: `No recognized style fields in request body (expected some of: ${ALL_FIELDS.join(", ")})` });
  }
  for (const [key, value] of entries) {
    if (COLOR_FIELDS.includes(key)) {
      if (typeof value !== "string" || !HEX_COLOR_RE.test(value)) {
        return res.status(400).json({ error: `Field "${key}" must be a hex color string, got ${JSON.stringify(value)}` });
      }
    } else if (typeof value !== "number" || !Number.isFinite(value)) {
      return res.status(400).json({ error: `Field "${key}" must be a number, got ${JSON.stringify(value)}` });
    }
  }

  const { data, error } = await supabase
    .from("card_style")
    .upsert({ mode, ...Object.fromEntries(entries), updated_at: new Date().toISOString() }, { onConflict: "mode" })
    .select()
    .single();

  if (error) {
    console.error("[cardStyle] failed to update card_style:", error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  res.json(data);
});

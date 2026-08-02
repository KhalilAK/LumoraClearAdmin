import { Router } from "express";
import { supabase } from "../db.js";

export const themeRouter = Router();

// Editable color fields on theme_colors, matching ThemeColorsRow. Column
// names are camelCase in the DB (same table app/Context/ThemeContext.tsx reads).
const COLOR_FIELDS = [
  "background",
  "secondaryBackground",
  "boxBackground",
  "text",
  "secondaryText",
  "invertText",
  "tint",
  "buttonColor",
  "baseColor",
  "error",
  "errorLightLight",
  "pending",
  "paid",
  "shadow",
];

// Most fields are hex (incl. shorthand and 8-digit w/ alpha), but `shadow`'s
// real value is an rgba() string (e.g. "rgba(0,0,0,0.1)") — accept both.
const COLOR_VALUE_RE =
  /^(#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/;

themeRouter.get("/colors", async (req, res) => {
  const { data, error } = await supabase.from("theme_colors").select("*");

  if (error) {
    console.error("[theme] failed to load theme_colors:", error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  const byMode = { light: null, dark: null };
  for (const row of data) {
    if (row.mode === "light" || row.mode === "dark") {
      byMode[row.mode] = row;
    }
  }
  res.json(byMode);
});

themeRouter.put("/colors", async (req, res) => {
  const { mode, colors } = req.body || {};

  if (mode !== "light" && mode !== "dark") {
    return res.status(400).json({ error: 'mode must be "light" or "dark"' });
  }
  if (!colors || typeof colors !== "object") {
    return res.status(400).json({ error: "colors object is required" });
  }

  const entries = Object.entries(colors).filter(([key]) => COLOR_FIELDS.includes(key));
  if (entries.length === 0) {
    return res.status(400).json({ error: "No recognized color fields in request body" });
  }
  for (const [key, value] of entries) {
    if (typeof value !== "string" || !COLOR_VALUE_RE.test(value)) {
      return res.status(400).json({ error: `Field "${key}" must be a hex color string, got ${JSON.stringify(value)}` });
    }
  }

  const { data, error } = await supabase
    .from("theme_colors")
    .upsert(
      { mode, ...Object.fromEntries(entries), updated_at: new Date().toISOString() },
      { onConflict: "mode" }
    )
    .select()
    .single();

  if (error) {
    console.error("[theme] failed to update theme_colors:", error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  res.json(data);
});

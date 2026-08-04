import { Router } from "express";
import { supabase } from "../db.js";

export const dashboardLayoutRouter = Router();

// Must match backend/routes/dashboardLayout.js's VALID_KEYS and
// app/(tabs)/index.tsx's SECTION_RENDERERS in the main LumoraClear repo
// exactly — an unrecognized key renders nothing there, a missing one means
// that card silently vanishes from the app.
const VALID_KEYS = ["upcomingBills", "potentialErrors", "benefitsBud", "spendingChart", "recentBills"];

function isValidOrder(order) {
  if (!Array.isArray(order) || order.length !== VALID_KEYS.length) return false;
  const seen = new Set();
  for (const key of order) {
    if (typeof key !== "string" || !VALID_KEYS.includes(key) || seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

dashboardLayoutRouter.get("/", async (req, res) => {
  const { data, error } = await supabase.from("dashboard_layout").select("*").eq("id", 1).maybeSingle();

  if (error) {
    console.error("[dashboardLayout] failed to load dashboard_layout:", error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  res.json({ order: data?.order ?? VALID_KEYS, updatedAt: data?.updated_at ?? null });
});

dashboardLayoutRouter.put("/", async (req, res) => {
  const { order } = req.body || {};

  if (!isValidOrder(order)) {
    return res.status(400).json({
      error: `order must contain each of ${VALID_KEYS.join(", ")} exactly once, with no unknown keys`,
    });
  }

  const { data, error } = await supabase
    .from("dashboard_layout")
    .upsert({ id: 1, order, updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("[dashboardLayout] failed to update dashboard_layout:", error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  res.json({ order: data.order, updatedAt: data.updated_at });
});

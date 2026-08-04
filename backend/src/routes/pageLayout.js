import { Router } from "express";
import { supabase } from "../db.js";

export const pageLayoutRouter = Router();

// Mirrors the main LumoraClear backend's PAGE_REGISTRY (backend/routes/pageLayout.js)
// — add an entry here whenever a new reorderable page is registered there.
// Unlike dashboard_layout (a dedicated one-off table), this is the generic
// page_layouts table keyed by pageKey, so no new table/route is needed here
// either when a new page gets added on that side.
const PAGE_REGISTRY = {
  profileTabs: ["Profile", "Insurance", "Bills", "Notifications", "Theme", "Admin", "Rate & Review"],
};

function isValidOrder(pageKey, order) {
  const validKeys = PAGE_REGISTRY[pageKey];
  if (!validKeys || !Array.isArray(order) || order.length !== validKeys.length) return false;
  const seen = new Set();
  for (const key of order) {
    if (typeof key !== "string" || !validKeys.includes(key) || seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

pageLayoutRouter.get("/:pageKey", async (req, res) => {
  const { pageKey } = req.params;
  const validKeys = PAGE_REGISTRY[pageKey];
  if (!validKeys) {
    return res.status(404).json({ error: `Unknown pageKey "${pageKey}"` });
  }

  // NOTE: assuming the page_layouts columns are page_key (text PK), order
  // (text[]), updated_at — matching this project's general snake_case
  // convention. Unverified: the table doesn't exist in this DB yet as of
  // this writing. Adjust here once it's live if the real columns differ.
  const { data, error } = await supabase.from("page_layouts").select("*").eq("page_key", pageKey).maybeSingle();

  if (error) {
    console.error(`[pageLayout] failed to load page_layouts for "${pageKey}":`, error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  res.json({ pageKey, order: data?.order ?? validKeys, updatedAt: data?.updated_at ?? null });
});

pageLayoutRouter.put("/:pageKey", async (req, res) => {
  const { pageKey } = req.params;
  const { order } = req.body || {};
  const validKeys = PAGE_REGISTRY[pageKey];

  if (!validKeys) {
    return res.status(404).json({ error: `Unknown pageKey "${pageKey}"` });
  }
  if (!isValidOrder(pageKey, order)) {
    return res.status(400).json({
      error: `order must contain each of ${validKeys.join(", ")} exactly once, with no unknown keys`,
    });
  }

  const { data, error } = await supabase
    .from("page_layouts")
    .upsert({ page_key: pageKey, order, updated_at: new Date().toISOString() }, { onConflict: "page_key" })
    .select()
    .single();

  if (error) {
    console.error(`[pageLayout] failed to update page_layouts for "${pageKey}":`, error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  res.json({ pageKey, order: data.order, updatedAt: data.updated_at });
});

import { Router } from "express";
import { supabase } from "../db.js";

export const pageContentRouter = Router();

// Editable text keys per page — mirrors the main LumoraClear backend's
// page-content registry. Unlike page_layouts (a fixed-length permutation),
// content is a partial key->text map: PUT payloads only need to include the
// keys that changed, and unknown keys for a given pageKey are rejected.
const PAGE_CONTENT_REGISTRY = {
  dashboard: [
    "title",
    "upcomingTitle",
    "potentialErrorsTitle",
    "potentialErrorsAllClear",
    "potentialErrorsMessage",
    "potentialErrorsButton",
    "benefitsBudTitle",
    "spendingTitle",
    "recentBillsTitle",
    "recentBillsAddButton",
    "recentBillsViewAllButton",
    "recentBillsEmptyMessage",
    "totalDueTitle",
    "totalDueSubtitle",
    "viewBreakdownButton",
    "connectPayerButton",
    "connectPayerMaybeLater",
  ],
  profile: ["title", "subtitle", "personalInfoSectionTitle", "contactInfoSectionTitle", "logoutButton", "deleteAccountButton"],
  profileTabs: [
    "title",
    "subtitle",
    "settingsSectionTitle",
    "moreSectionTitle",
    "tabProfile",
    "tabInsurance",
    "tabBills",
    "tabNotifications",
    "tabTheme",
    "tabRateReview",
  ],
  profileBills: ["title", "subtitle", "sectionTitle", "autoBillsLabel", "autoBillsDescription", "autoBillsEnabledMessage"],
  profileNotifications: ["title", "subtitle", "sectionTitle", "emailTitle", "emailSubtitle", "pushTitle", "pushSubtitle"],
  profileTheme: ["title", "subtitle", "sectionTitle", "modeLabel", "modeDescription", "lightLabel", "darkLabel"],
  profileReview: [
    "title",
    "subtitle",
    "ratingSectionTitle",
    "ratingSectionSubtitle",
    "descriptionPlaceholder",
    "submitButton",
    "storeSectionTitle",
    "storeSectionDescription",
    "appStoreButton",
  ],
  // These 7 use only the explicitly-named keys given for them — "etc." /
  // "field labels per step" / "sync-error copy" on login, signup, and plans
  // respectively were left unenumerated, so those fields aren't editable
  // here yet. Add them once the full key names are confirmed.
  login: ["emailLabel", "passwordLabel", "loginButton", "signUpButton", "forgotPasswordLink", "socialDividerText"],
  signup: [
    "step1Label",
    "step2Label",
    "step3Label",
    "continueButton",
    "signUpButton",
    "backButton",
    "alreadyHaveAccountLink",
    "passwordReq1",
    "passwordReq2",
    "passwordReq3",
    "passwordReq4",
    "passwordReq5",
  ],
  forgotPassword: ["phoneLabel", "sendCodeButton", "cancelButton", "noPhoneLink"],
  verifyCode: ["codeLabel", "approveButton", "cancelButton"],
  updatePassword: ["newPasswordLabel", "confirmPasswordLabel", "updateButton", "cancelButton", "passwordReq1", "passwordReq2", "passwordReq3", "passwordReq4", "passwordReq5"],
  bills: [
    "title",
    "emptyMessage",
    "filterEmptyMessage",
    "potentialIssueTitle",
    "potentialIssueMessage",
    "reviewBillButton",
    "syncErrorTitle",
    "syncErrorFallbackMessage",
    "serviceDateLabel",
  ],
  plans: [
    "title",
    "emptyMessage",
    "memberIdLabel",
    "planTypeLabel",
    "deductibleProgressLabel",
    "primaryCopayLabel",
    "specialistCopayLabel",
    "coinsuranceLabel",
    "outOfPocketLabel",
    "viewDetailsButton",
    "deletePlanModalTitle",
    "deletePlanModalConfirmLabel",
  ],
};

function isValidContentPatch(pageKey, content) {
  const validKeys = PAGE_CONTENT_REGISTRY[pageKey];
  if (!validKeys || typeof content !== "object" || content === null || Array.isArray(content)) return false;
  const keys = Object.keys(content);
  if (keys.length === 0) return false;
  return keys.every((key) => validKeys.includes(key) && typeof content[key] === "string");
}

pageContentRouter.get("/:pageKey", async (req, res) => {
  const { pageKey } = req.params;
  if (!PAGE_CONTENT_REGISTRY[pageKey]) {
    return res.status(404).json({ error: `Unknown pageKey "${pageKey}"` });
  }

  const { data, error } = await supabase.from("page_content").select("*").eq("page_key", pageKey).maybeSingle();

  if (error) {
    console.error(`[pageContent] failed to load page_content for "${pageKey}":`, error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  // Unlike the real app-facing endpoint, this doesn't backfill shipped
  // defaults (we don't know that copy on this side) — missing keys just
  // come back absent, and the editor shows an empty field for them.
  res.json({ pageKey, content: data?.content ?? {}, updatedAt: data?.updated_at ?? null });
});

pageContentRouter.put("/:pageKey", async (req, res) => {
  const { pageKey } = req.params;
  const { content } = req.body || {};
  const validKeys = PAGE_CONTENT_REGISTRY[pageKey];

  if (!validKeys) {
    return res.status(404).json({ error: `Unknown pageKey "${pageKey}"` });
  }
  if (!isValidContentPatch(pageKey, content)) {
    return res.status(400).json({ error: `content must be a non-empty object using only these keys: ${validKeys.join(", ")}` });
  }

  // Merge into whatever's already saved so a partial PUT can't wipe other keys.
  const { data: existing, error: readError } = await supabase.from("page_content").select("content").eq("page_key", pageKey).maybeSingle();
  if (readError) {
    console.error(`[pageContent] failed to read existing page_content for "${pageKey}":`, readError.message);
    return res.status(502).json({ error: "Database query failed", detail: readError.message });
  }

  const merged = { ...(existing?.content ?? {}), ...content };

  const { data, error } = await supabase
    .from("page_content")
    .upsert({ page_key: pageKey, content: merged, updated_at: new Date().toISOString() }, { onConflict: "page_key" })
    .select()
    .single();

  if (error) {
    console.error(`[pageContent] failed to update page_content for "${pageKey}":`, error.message);
    return res.status(502).json({ error: "Database query failed", detail: error.message });
  }

  res.json({ pageKey, content: data.content, updatedAt: data.updated_at });
});

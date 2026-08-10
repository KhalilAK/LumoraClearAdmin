import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import { Skeleton } from "../components/Skeleton";
import { PhoneFrame, type PhoneFrameHandle } from "../components/PhoneFrame";
import { APP_PREVIEW_URL, APP_PREVIEW_ORIGIN } from "../config/preview";

interface FieldConfig {
  key: string;
  label: string;
}

interface ContentPageConfig {
  title: string;
  fields: FieldConfig[];
}

// Which screen in the live simulator is currently showing, reported by the
// Expo app via postMessage({ type: "LUMORACLEAR_CURRENT_CONTENT_PAGE", pageKey })
// on load and on every navigation — finer-grained than LayoutEditor's
// LUMORACLEAR_CURRENT_PAGE listener (that one can't tell profile's 5
// sub-screens apart; this one can).
const CONTENT_REGISTRY: Record<string, ContentPageConfig> = {
  dashboard: {
    title: "Dashboard",
    fields: [
      { key: "title", label: "Page title" },
      { key: "upcomingTitle", label: "Upcoming Bills — section title" },
      { key: "potentialErrorsTitle", label: "Potential Errors — section title" },
      { key: "potentialErrorsAllClear", label: "Potential Errors — all-clear message" },
      { key: "potentialErrorsMessage", label: "Potential Errors — warning message" },
      { key: "potentialErrorsButton", label: "Potential Errors — button label" },
      { key: "benefitsBudTitle", label: "Ask Benefits Bud — section title" },
      { key: "spendingTitle", label: "Spending Chart — section title" },
      { key: "recentBillsTitle", label: "Recent Bills — section title" },
      { key: "recentBillsAddButton", label: "Recent Bills — add button" },
      { key: "recentBillsViewAllButton", label: "Recent Bills — view all button" },
      { key: "recentBillsEmptyMessage", label: "Recent Bills — empty state message" },
      { key: "totalDueTitle", label: "Total Due — title" },
      { key: "totalDueSubtitle", label: "Total Due — subtitle" },
      { key: "viewBreakdownButton", label: "View Breakdown button" },
      { key: "connectPayerButton", label: "Connect Payer button" },
      { key: "connectPayerMaybeLater", label: "Connect Payer — \"Maybe later\" link" },
    ],
  },
  profile: {
    title: "Profile (Personal / Contact Info)",
    fields: [
      { key: "title", label: "Page title" },
      { key: "subtitle", label: "Page subtitle" },
      { key: "personalInfoSectionTitle", label: "Personal Info — section title" },
      { key: "contactInfoSectionTitle", label: "Contact Info — section title" },
      { key: "logoutButton", label: "Logout button" },
      { key: "deleteAccountButton", label: "Delete Account button" },
    ],
  },
  profileTabs: {
    title: "Profile Tabs (Account Settings menu)",
    fields: [
      { key: "title", label: "Page title" },
      { key: "subtitle", label: "Page subtitle" },
      { key: "settingsSectionTitle", label: "\"Settings\" box title" },
      { key: "moreSectionTitle", label: "\"More\" box title" },
      { key: "tabProfile", label: "Profile row label" },
      { key: "tabInsurance", label: "Insurance row label" },
      { key: "tabBills", label: "Bills row label" },
      { key: "tabNotifications", label: "Notifications row label" },
      { key: "tabTheme", label: "Theme row label" },
      { key: "tabRateReview", label: "Rate & Review row label" },
    ],
  },
  profileBills: {
    title: "Profile → Bill Settings",
    fields: [
      { key: "title", label: "Page title" },
      { key: "subtitle", label: "Page subtitle" },
      { key: "sectionTitle", label: "Section title" },
      { key: "autoBillsLabel", label: "Auto-Bills toggle label" },
      { key: "autoBillsDescription", label: "Auto-Bills description" },
      { key: "autoBillsEnabledMessage", label: "Auto-Bills enabled message" },
    ],
  },
  profileNotifications: {
    title: "Profile → Notifications",
    fields: [
      { key: "title", label: "Page title" },
      { key: "subtitle", label: "Page subtitle" },
      { key: "sectionTitle", label: "Section title" },
      { key: "emailTitle", label: "Email notifications — title" },
      { key: "emailSubtitle", label: "Email notifications — subtitle" },
      { key: "pushTitle", label: "Push notifications — title" },
      { key: "pushSubtitle", label: "Push notifications — subtitle" },
    ],
  },
  profileTheme: {
    title: "Profile → Theme",
    fields: [
      { key: "title", label: "Page title" },
      { key: "subtitle", label: "Page subtitle" },
      { key: "sectionTitle", label: "Section title" },
      { key: "modeLabel", label: "Mode toggle label" },
      { key: "modeDescription", label: "Mode toggle description" },
      { key: "lightLabel", label: "Light option label" },
      { key: "darkLabel", label: "Dark option label" },
    ],
  },
  profileReview: {
    title: "Profile → Rate & Review",
    fields: [
      { key: "title", label: "Page title" },
      { key: "subtitle", label: "Page subtitle" },
      { key: "ratingSectionTitle", label: "Rating section title" },
      { key: "ratingSectionSubtitle", label: "Rating section subtitle" },
      { key: "descriptionPlaceholder", label: "Review textbox placeholder" },
      { key: "submitButton", label: "Submit button" },
      { key: "storeSectionTitle", label: "App store section title" },
      { key: "storeSectionDescription", label: "App store section description" },
      { key: "appStoreButton", label: "\"Rate on App Store\" button" },
    ],
  },
};

const DEFAULT_PAGE_KEY = "dashboard";

// Longer body copy gets a multi-line textarea instead of a single-line input.
function isLongField(key: string): boolean {
  return /message|description|subtitle/i.test(key);
}

export function ContentEditor() {
  const [currentPageKey, setCurrentPageKey] = useState(DEFAULT_PAGE_KEY);
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [liveReloadKey, setLiveReloadKey] = useState(0);
  const liveFrameRef = useRef<PhoneFrameHandle>(null);

  const config = CONTENT_REGISTRY[currentPageKey];

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (APP_PREVIEW_ORIGIN && event.origin !== APP_PREVIEW_ORIGIN) return;
      const data = event.data;
      if (data && data.type === "LUMORACLEAR_CURRENT_CONTENT_PAGE" && typeof data.pageKey === "string") {
        setCurrentPageKey(data.pageKey);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    setSavedAt(null);
    setError(null);
    if (!config) {
      setContent({});
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getPageContent(currentPageKey)
      .then((res) => setContent(res.content))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load content"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageKey]);

  function updateField(key: string, value: string) {
    setContent((prev) => ({ ...prev, [key]: value }));
    setSavedAt(null);
    // Only the changed key needs to go over — the app applies it in memory
    // and pauses its own polling for this page until a full reload.
    liveFrameRef.current?.postMessage({ type: "LUMORACLEAR_PREVIEW_PAGE_CONTENT", pageKey: currentPageKey, content: { [key]: value } }, APP_PREVIEW_ORIGIN);
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.putPageContent(currentPageKey, content);
      setContent(res.content);
      setSavedAt(Date.now());
      // Reload the live simulator so it drops the in-memory preview override
      // and re-fetches (well, re-polls) the real saved value.
      setLiveReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save content");
    } finally {
      setSaving(false);
    }
  }

  const title = config?.title ?? currentPageKey;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p className="meta-text">Follows whatever screen is showing in the preview — navigate the app below to switch.</p>

      {error && <div className="error-banner">{error}</div>}

      <div className="edit-preview-layout">
        <section className="card">
          <div className="toolbar-row" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>
              {title}
            </div>
            {config && (
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>

          {!config && <div className="meta-text">Unrecognized page ("{currentPageKey}").</div>}

          {config && loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {config.fields.map((field) => (
                <Skeleton key={field.key} height={44} />
              ))}
            </div>
          )}

          {config && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {savedAt && <div className="meta-text">Saved.</div>}

              {config.fields.map((field) => (
                <div key={field.key} className="color-field">
                  <label className="field-label" htmlFor={`content-${field.key}`}>
                    {field.label}
                  </label>
                  {isLongField(field.key) ? (
                    <textarea
                      id={`content-${field.key}`}
                      className="text-input"
                      rows={3}
                      value={content[field.key] ?? ""}
                      onChange={(e) => updateField(field.key, e.target.value)}
                    />
                  ) : (
                    <input
                      id={`content-${field.key}`}
                      type="text"
                      className="text-input"
                      value={content[field.key] ?? ""}
                      onChange={(e) => updateField(field.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-title">Preview</div>

          {!APP_PREVIEW_URL ? (
            <div className="meta-text">
              Set <code>VITE_APP_PREVIEW_URL</code> (frontend/.env) to the deployed Expo web app's URL to preview it here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <button className="btn-secondary" onClick={() => setLiveReloadKey((k) => k + 1)} style={{ alignSelf: "flex-end" }}>
                Refresh
              </button>
              <PhoneFrame ref={liveFrameRef} key={liveReloadKey} src={APP_PREVIEW_URL} width={320} height={694} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

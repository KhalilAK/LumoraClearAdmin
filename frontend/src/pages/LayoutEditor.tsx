import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import { Skeleton } from "../components/Skeleton";
import { PhoneFrame, type PhoneFrameHandle } from "../components/PhoneFrame";
import { ReorderList } from "../components/ReorderList";
import { APP_PREVIEW_URL, APP_PREVIEW_ORIGIN } from "../config/preview";

// Which screen in the live simulator is currently showing, reported by the
// Expo app itself via postMessage({ type: "LUMORACLEAR_CURRENT_PAGE", pageKey })
// on load and on every tab/route change — the admin site can't otherwise know
// what's inside a cross-origin iframe. Add an entry here for every pageKey
// the app might report; reorderable ones point at the API call + labels that
// edit them, non-reorderable ones (Bills, Plans) just get a title.
type PageConfig =
  | { title: string; reorderable: false }
  | { title: string; reorderable: true; defaultOrder: string[]; labels?: Record<string, string>; load: () => Promise<{ order: string[] }>; save: (order: string[]) => Promise<{ order: string[] }>; previewMessage: (order: string[]) => Record<string, unknown> };

const PAGE_REGISTRY: Record<string, PageConfig> = {
  dashboard: {
    title: "Dashboard",
    reorderable: true,
    defaultOrder: ["upcomingBills", "potentialErrors", "benefitsBud", "spendingChart", "recentBills"],
    labels: {
      upcomingBills: "Upcoming Bills",
      potentialErrors: "Potential Errors",
      benefitsBud: "Ask Benefits Bud",
      spendingChart: "Spending Chart",
      recentBills: "Recent Bills",
    },
    load: () => api.getDashboardLayout(),
    save: (order) => api.putDashboardLayout(order),
    previewMessage: (order) => ({ type: "LUMORACLEAR_PREVIEW_DASHBOARD_LAYOUT", order }),
  },
  bills: { title: "Bills", reorderable: false },
  plans: { title: "Plans", reorderable: false },
  profile: {
    title: "Profile",
    reorderable: true,
    defaultOrder: ["Profile", "Insurance", "Bills", "Notifications", "Theme", "Admin", "Rate & Review"],
    load: () => api.getPageLayout("profileTabs"),
    save: (order) => api.putPageLayout("profileTabs", order),
    previewMessage: (order) => ({ type: "LUMORACLEAR_PREVIEW_PAGE_LAYOUT", pageKey: "profileTabs", order }),
  },
};

const DEFAULT_PAGE_KEY = "dashboard";

export function LayoutEditor() {
  const [currentPageKey, setCurrentPageKey] = useState(DEFAULT_PAGE_KEY);
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [liveReloadKey, setLiveReloadKey] = useState(0);
  const liveFrameRef = useRef<PhoneFrameHandle>(null);

  const config = PAGE_REGISTRY[currentPageKey];

  // The app reports which screen it's showing whenever that changes — this
  // is the only way we find out, since we can't inspect a cross-origin iframe.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (APP_PREVIEW_ORIGIN && event.origin !== APP_PREVIEW_ORIGIN) return;
      const data = event.data;
      if (data && data.type === "LUMORACLEAR_CURRENT_PAGE" && typeof data.pageKey === "string") {
        setCurrentPageKey(data.pageKey);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    setSavedAt(null);
    setError(null);
    if (!config || !config.reorderable) {
      setOrder([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    config
      .load()
      .then((res) => setOrder(res.order))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load layout"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageKey]);

  function sendLivePreview() {
    if (!config || !config.reorderable) return;
    liveFrameRef.current?.postMessage(config.previewMessage(order), APP_PREVIEW_ORIGIN);
  }

  useEffect(() => {
    if (!loading) sendLivePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  function moveTo(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSavedAt(null);
  }

  function resetToDefault() {
    if (config && config.reorderable) setOrder(config.defaultOrder);
    setSavedAt(null);
  }

  async function save() {
    if (!config || !config.reorderable) return;
    setSaving(true);
    setError(null);
    try {
      const res = await config.save(order);
      setOrder(res.order);
      setSavedAt(Date.now());
      // Reload the live simulator so it drops the in-memory preview override
      // and re-fetches the real saved value — confirms the save actually took.
      setLiveReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save layout");
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
            {config?.reorderable && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-secondary" onClick={resetToDefault}>
                  Reset to default order
                </button>
                <button className="btn-primary" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </div>

          {!config && <div className="meta-text">Unrecognized page ("{currentPageKey}").</div>}

          {config && !config.reorderable && <div className="meta-text">No reordering available for this page.</div>}

          {config && config.reorderable && loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {config.defaultOrder.map((key) => (
                <Skeleton key={key} height={44} />
              ))}
            </div>
          )}

          {config && config.reorderable && !loading && (
            <>
              {savedAt && (
                <div className="meta-text" style={{ marginBottom: 12 }}>
                  Saved.
                </div>
              )}
              <ReorderList items={order.map((key) => ({ key, label: config.labels?.[key] ?? key }))} onMove={moveTo} />
            </>
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
              <PhoneFrame ref={liveFrameRef} key={liveReloadKey} src={APP_PREVIEW_URL} width={320} height={694} onLoad={sendLivePreview} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

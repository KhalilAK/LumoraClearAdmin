import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { Skeleton } from "../components/Skeleton";
import { PhoneFrame, type PhoneFrameHandle } from "../components/PhoneFrame";
import { APP_PREVIEW_URL, APP_PREVIEW_ORIGIN } from "../config/preview";

// Must match the main LumoraClear repo's backend/routes/dashboardLayout.js
// VALID_KEYS and app/(tabs)/index.tsx's SECTION_RENDERERS exactly — an
// unrecognized key renders nothing there, a missing one means that card
// silently vanishes from the app.
const CARD_LABELS: Record<string, string> = {
  upcomingBills: "Upcoming Bills",
  potentialErrors: "Potential Errors",
  benefitsBud: "Ask Benefits Bud",
  spendingChart: "Spending Chart",
  recentBills: "Recent Bills",
};

const DEFAULT_ORDER = ["upcomingBills", "potentialErrors", "benefitsBud", "spendingChart", "recentBills"];

export function DashboardLayout() {
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [liveReloadKey, setLiveReloadKey] = useState(0);
  const liveFrameRef = useRef<PhoneFrameHandle>(null);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    api
      .getDashboardLayout()
      .then((res) => setOrder(res.order))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load dashboard layout"))
      .finally(() => setLoading(false));
  }, []);

  // Pushes the in-progress (unsaved) order into the live app simulator so
  // reordering shows up immediately, instead of only after Save. No-ops if
  // the simulator isn't mounted (ref is unset) — the Expo app applies this
  // in memory only, per its own postMessage listener.
  function sendLivePreview() {
    liveFrameRef.current?.postMessage({ type: "LUMORACLEAR_PREVIEW_DASHBOARD_LAYOUT", order }, APP_PREVIEW_ORIGIN);
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
    setOrder(DEFAULT_ORDER);
    setSavedAt(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.putDashboardLayout(order);
      setOrder(res.order);
      setSavedAt(Date.now());
      // Reload the live simulator so it drops the in-memory preview override
      // and re-fetches the real saved value — confirms the save actually took.
      setLiveReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save dashboard layout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="page-title">Dashboard Layout</h1>
        <p className="meta-text">Card order on the app's dashboard/home screen.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="edit-preview-layout">
          <section className="card">
            <Skeleton width="30%" style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Array.from({ length: DEFAULT_ORDER.length }).map((_, i) => (
                <Skeleton key={i} height={44} />
              ))}
            </div>
          </section>
          <section className="card">
            <Skeleton height={140}>
              <LoadingIndicator size="sm" />
            </Skeleton>
          </section>
        </div>
      )}

      {!loading && (
        <div className="edit-preview-layout">
          <section className="card">
            <div className="toolbar-row" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ margin: 0 }}>
                Cards
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-secondary" onClick={resetToDefault}>
                  Reset to default order
                </button>
                <button className="btn-primary" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {savedAt && (
              <div className="meta-text" style={{ marginBottom: 12 }}>
                Saved.
              </div>
            )}

            <div className="reorder-list">
              {order.map((key, index) => (
                <div
                  key={key}
                  className="reorder-item"
                  draggable
                  onDragStart={() => {
                    dragIndexRef.current = index;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndexRef.current !== null) moveTo(dragIndexRef.current, index);
                    dragIndexRef.current = null;
                  }}
                >
                  <span className="reorder-handle" aria-hidden="true">
                    ⠿
                  </span>
                  <span className="reorder-label">{CARD_LABELS[key] ?? key}</span>
                  <div className="reorder-buttons">
                    <button className="icon-button" disabled={index === 0} onClick={() => moveTo(index, index - 1)} aria-label="Move up">
                      ▲
                    </button>
                    <button
                      className="icon-button"
                      disabled={index === order.length - 1}
                      onClick={() => moveTo(index, index + 1)}
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
      )}
    </div>
  );
}

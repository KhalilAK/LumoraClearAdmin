import { useEffect, useRef, useState } from "react";
import { api, ApiError, type CardStyleFields, type CardStyleResponse, type CardStyleRow } from "../api/client";
import { lightPalette, darkPalette } from "../theme/colors";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { Skeleton } from "../components/Skeleton";
import { PhoneFrame, type PhoneFrameHandle } from "../components/PhoneFrame";
import { ColorField } from "../components/ColorField";
import { APP_PREVIEW_URL, APP_PREVIEW_ORIGIN } from "../config/preview";

type Mode = "light" | "dark";

// Best-guess defaults matching what was described as seeded: radius 20,
// border width 1, border color the brand blue/purple, shadow present but
// invisible (opacity 0) until an admin turns it up. Only used for the Reset
// button and the very first render before real data loads — actual values
// always come from the server once fetched.
function defaultsFor(mode: Mode): CardStyleFields {
  const base = mode === "light" ? lightPalette : darkPalette;
  return {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: base.baseColor,
    shadowColor: mode === "light" ? "#000000" : "#ffffff",
    shadowOpacity: 0,
    shadowRadius: 4,
    shadowOffsetX: 0,
    shadowOffsetY: 2,
    elevation: 2,
  };
}

const SLIDERS: { key: keyof CardStyleFields; label: string; min: number; max: number; step: number }[] = [
  { key: "borderRadius", label: "Border radius", min: 0, max: 50, step: 1 },
  { key: "borderWidth", label: "Border width", min: 0, max: 10, step: 1 },
  { key: "shadowOpacity", label: "Shadow opacity", min: 0, max: 1, step: 0.05 },
  { key: "shadowRadius", label: "Shadow blur radius", min: 0, max: 30, step: 1 },
  { key: "shadowOffsetX", label: "Shadow offset X", min: -20, max: 20, step: 1 },
  { key: "shadowOffsetY", label: "Shadow offset Y", min: -20, max: 20, step: 1 },
  { key: "elevation", label: "Elevation (Android)", min: 0, max: 24, step: 1 },
];

function toEditable(row: CardStyleRow | null, mode: Mode): CardStyleFields {
  const base = defaultsFor(mode);
  if (!row) return base;
  const out = { ...base };
  for (const key of Object.keys(base) as (keyof CardStyleFields)[]) {
    const value = row[key];
    if (typeof value === (typeof base[key])) out[key] = value as never;
  }
  return out;
}

function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.slice(0, 6);
  const value = parseInt(full, 16);
  if (Number.isNaN(value)) return `rgba(0, 0, 0, ${opacity})`;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function CardStyleEditor() {
  const [mode, setMode] = useState<Mode>("light");
  const [previewMode, setPreviewMode] = useState<"static" | "live">("static");
  const [liveReloadKey, setLiveReloadKey] = useState(0);
  const liveFrameRef = useRef<PhoneFrameHandle>(null);
  const [remote, setRemote] = useState<CardStyleResponse | null>(null);
  const [draft, setDraft] = useState<CardStyleFields>(defaultsFor("light"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    api
      .getCardStyle()
      .then((res) => {
        setRemote(res);
        setDraft(toEditable(res[mode], mode));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load card style"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sendLivePreview() {
    liveFrameRef.current?.postMessage({ type: "LUMORACLEAR_PREVIEW_CARD_STYLE", mode, style: draft }, APP_PREVIEW_ORIGIN);
  }

  useEffect(() => {
    if (previewMode === "live") sendLivePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, mode, previewMode]);

  function switchMode(next: Mode) {
    setMode(next);
    setDraft(toEditable(remote?.[next] ?? null, next));
    setSavedAt(null);
  }

  function updateField<K extends keyof CardStyleFields>(key: K, value: CardStyleFields[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSavedAt(null);
  }

  function resetToDefaults() {
    setDraft(defaultsFor(mode));
    setSavedAt(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.putCardStyle(mode, draft);
      setRemote((r) => ({ ...(r ?? { light: null, dark: null }), [mode]: updated }) as CardStyleResponse);
      setSavedAt(Date.now());
      setLiveReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save card style");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="pill-row">
        <button className={`pill${mode === "light" ? " active" : ""}`} onClick={() => switchMode("light")}>
          Light
        </button>
        <button className={`pill${mode === "dark" ? " active" : ""}`} onClick={() => switchMode("dark")}>
          Dark
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="edit-preview-layout">
          <section className="card">
            <Skeleton width="30%" style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {SLIDERS.map((field) => (
                <Skeleton key={field.key} height={44} />
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
                {mode === "light" ? "Light" : "Dark"} card style
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-secondary" onClick={resetToDefaults}>
                  Reset to defaults
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

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ColorField fieldKey="borderColor" label="Border color" value={draft.borderColor} onChange={(v) => updateField("borderColor", v)} />
              <ColorField fieldKey="shadowColor" label="Shadow color" value={draft.shadowColor} onChange={(v) => updateField("shadowColor", v)} />

              {SLIDERS.map((field) => (
                <div key={field.key} className="color-field">
                  <label className="field-label" htmlFor={`card-style-${field.key}`}>
                    {field.label} ({draft[field.key]})
                  </label>
                  <input
                    id={`card-style-${field.key}`}
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={draft[field.key]}
                    onChange={(e) => updateField(field.key, Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="toolbar-row" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ margin: 0 }}>
                Preview
              </div>
              <div className="pill-row">
                <button className={`pill${previewMode === "static" ? " active" : ""}`} onClick={() => setPreviewMode("static")}>
                  Static Preview
                </button>
                <button className={`pill${previewMode === "live" ? " active" : ""}`} onClick={() => setPreviewMode("live")}>
                  Live App Simulator
                </button>
              </div>
            </div>

            {previewMode === "static" && <StaticPreview style={draft} mode={mode} />}

            {previewMode === "live" &&
              (!APP_PREVIEW_URL ? (
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
              ))}
          </section>
        </div>
      )}
    </div>
  );
}

// CSS approximation of the RN shadow props — good enough for a quick look,
// the Live App Simulator is the authoritative preview.
function StaticPreview({ style, mode }: { style: CardStyleFields; mode: Mode }) {
  const palette = mode === "light" ? lightPalette : darkPalette;

  return (
    <div style={{ borderRadius: 10, padding: 20, background: `linear-gradient(180deg, ${palette.background}, ${palette.secondaryBackground})` }}>
      <div
        style={{
          background: palette.boxBackground,
          borderRadius: style.borderRadius,
          borderWidth: style.borderWidth,
          borderStyle: "solid",
          borderColor: style.borderColor,
          boxShadow: `${style.shadowOffsetX}px ${style.shadowOffsetY}px ${style.shadowRadius}px ${hexToRgba(style.shadowColor, style.shadowOpacity)}`,
          padding: 16,
          maxWidth: 360,
        }}
      >
        <div style={{ color: palette.text, fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Sample card</div>
        <div style={{ color: palette.secondaryText, fontSize: 12 }}>This box shows the current border + shadow settings.</div>
      </div>
    </div>
  );
}

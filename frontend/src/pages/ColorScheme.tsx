import { useEffect, useState } from "react";
import { api, ApiError, type ThemeColorRow, type ThemeColorsResponse } from "../api/client";
import { darkPalette, lightPalette } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { Skeleton } from "../components/Skeleton";

type Mode = "light" | "dark";

const FIELD_LABELS: Record<string, string> = {
  background: "Background",
  secondaryBackground: "Secondary background",
  boxBackground: "Box / card background",
  text: "Text",
  secondaryText: "Secondary text",
  invertText: "Invert text (on filled surfaces)",
  tint: "Tint (rare accent)",
  buttonColor: "Button color",
  baseColor: "Base color (brand)",
  error: "Error",
  errorLightLight: "Error surface (light tint)",
  pending: "Bill status: pending",
  paid: "Bill status: paid",
  shadow: "Shadow",
};

const FIELD_ORDER = Object.keys(FIELD_LABELS);

function defaultsFor(mode: Mode) {
  return mode === "light" ? lightPalette : darkPalette;
}

function toEditable(row: ThemeColorRow | null, mode: Mode): Record<string, string> {
  const base = defaultsFor(mode);
  const out: Record<string, string> = {};
  for (const key of FIELD_ORDER) {
    out[key] = (row?.[key as keyof ThemeColorRow] as string) ?? base[key as keyof typeof base];
  }
  return out;
}

export function ColorScheme() {
  const { refetchColors } = useTheme();
  const [mode, setMode] = useState<Mode>("light");
  const [remote, setRemote] = useState<ThemeColorsResponse | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>(toEditable(null, "light"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    api
      .getThemeColors()
      .then((res) => {
        setRemote(res);
        setDraft(toEditable(res[mode], mode));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load theme colors"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setDraft(toEditable(remote?.[next] ?? null, next));
    setSavedAt(null);
  }

  function updateField(key: string, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function resetToDefaults() {
    setDraft(toEditable(null, mode));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.putThemeColors(mode, draft);
      setRemote((r) => ({ ...(r ?? { light: null, dark: null }), [mode]: updated }) as ThemeColorsResponse);
      setSavedAt(Date.now());
      refetchColors(); // so this site's own chrome picks up the change immediately
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save theme colors");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="toolbar-row">
        <h1 className="page-title">Color Scheme</h1>
        <div className="pill-row">
          <button className={`pill${mode === "light" ? " active" : ""}`} onClick={() => switchMode("light")}>
            Light
          </button>
          <button className={`pill${mode === "dark" ? " active" : ""}`} onClick={() => switchMode("dark")}>
            Dark
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <>
          <LoadingIndicator />
          <section className="card">
            <Skeleton height={140} />
          </section>
          <section className="card">
            <Skeleton width="30%" style={{ marginBottom: 16 }} />
            <div className="color-grid">
              {FIELD_ORDER.map((key) => (
                <Skeleton key={key} height={70} />
              ))}
            </div>
          </section>
        </>
      )}

      {!loading && (
        <>
          <section className="card">
            <div className="card-title">Preview</div>
            <Preview colors={draft} />
          </section>

          <section className="card">
            <div className="toolbar-row" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ margin: 0 }}>
                {mode === "light" ? "Light" : "Dark"} palette
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-secondary" onClick={resetToDefaults}>
                  Reset to app defaults
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

            <div className="color-grid">
              {FIELD_ORDER.map((key) => (
                <ColorField key={key} fieldKey={key} label={FIELD_LABELS[key]} value={draft[key]} onChange={(v) => updateField(key, v)} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// Splits a hex color into its 6-digit RGB part + any alpha suffix. The
// native <input type="color"> only ever accepts a plain #rrggbb — feeding it
// an 8-digit value like "#edf2f9ff" (as theme_colors actually stores) makes
// browsers silently fall back to black, which is the bug this works around.
function splitHexAlpha(value: string): { rgbHex: string; alphaSuffix: string } | null {
  const long = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(value);
  if (long) return { rgbHex: `#${long[1]}`, alphaSuffix: long[2] ?? "" };

  const short = /^#([0-9a-fA-F]{3})([0-9a-fA-F])?$/.exec(value);
  if (short) {
    const [r, g, b] = short[1].split("");
    const a = short[2];
    return { rgbHex: `#${r}${r}${g}${g}${b}${b}`, alphaSuffix: a ? a + a : "" };
  }

  return null;
}

function ColorField({ fieldKey, label, value, onChange }: { fieldKey: string; label: string; value: string; onChange: (v: string) => void }) {
  const parsed = splitHexAlpha(value);

  return (
    <div className="color-field">
      <label className="field-label" htmlFor={fieldKey}>
        {label}
      </label>
      <div className="color-field-row">
        {/* Renders via the browser's own CSS color parser, so it's accurate for
            any format (hex incl. alpha, rgba(...), etc.), unlike the native
            picker below which only understands 6-digit hex. */}
        <div className="swatch-preview" style={{ backgroundColor: value }} title={value} />
        <input
          type="color"
          className="swatch-input"
          value={parsed?.rgbHex ?? "#000000"}
          disabled={!parsed}
          onChange={(e) => onChange(parsed ? `${e.target.value}${parsed.alphaSuffix}` : e.target.value)}
          title={parsed ? "Pick a color (alpha, if any, is preserved)" : "Not a plain hex value — edit the text field directly"}
        />
        <input id={fieldKey} type="text" className="text-input" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      </div>
    </div>
  );
}

function Preview({ colors }: { colors: Record<string, string> }) {
  return (
    <div
      style={{
        borderRadius: 10,
        padding: 20,
        background: `linear-gradient(180deg, ${colors.background}, ${colors.secondaryBackground})`,
      }}
    >
      <div
        style={{
          background: colors.boxBackground,
          borderRadius: 10,
          padding: 16,
          boxShadow: `2px 2px 4px ${colors.shadow}`,
          maxWidth: 360,
        }}
      >
        <div style={{ color: colors.text, fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Sample card</div>
        <div style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 16 }}>Secondary / meta text</div>

        <div className="preview-strip">
          <button
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: `linear-gradient(120deg, ${colors.buttonColor}, ${colors.baseColor})`,
              color: colors.invertText,
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Primary button
          </button>

          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 10, background: colors.pending, display: "inline-block" }} />
            <span style={{ color: colors.text }}>Pending</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 10, background: colors.paid, display: "inline-block" }} />
            <span style={{ color: colors.text }}>Paid</span>
          </span>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 8,
            background: colors.errorLightLight,
            color: colors.error,
            fontSize: 13,
          }}
        >
          Error state sample
        </div>
      </div>
    </div>
  );
}

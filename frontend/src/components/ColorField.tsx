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

export function ColorField({ fieldKey, label, value, onChange }: { fieldKey: string; label: string; value: string; onChange: (v: string) => void }) {
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

import { useState } from "react";
import { ColorScheme } from "./ColorScheme";
import { LayoutEditor } from "./LayoutEditor";
import { ContentEditor } from "./ContentEditor";
import { CardStyleEditor } from "./CardStyleEditor";

type EditTarget = "colors" | "layout" | "content" | "cardStyle";

const OPTIONS: { value: EditTarget; label: string }[] = [
  { value: "colors", label: "Color Scheme" },
  { value: "layout", label: "Layout" },
  { value: "content", label: "Content" },
  { value: "cardStyle", label: "Card Style" },
];

// Hosts the editors (each still a full page component with its own
// state/live-preview/save logic) behind one dropdown instead of separate
// routes. Switching the dropdown unmounts the previous editor — same as
// navigating away from a route would have — so its live simulator reloads
// fresh on the next selection.
export function EditPage() {
  const [target, setTarget] = useState<EditTarget>("colors");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="toolbar-row">
        <h1 className="page-title">Edit</h1>
        <select className="text-input" style={{ width: "auto" }} value={target} onChange={(e) => setTarget(e.target.value as EditTarget)}>
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {target === "colors" && <ColorScheme />}
      {target === "layout" && <LayoutEditor />}
      {target === "content" && <ContentEditor />}
      {target === "cardStyle" && <CardStyleEditor />}
    </div>
  );
}

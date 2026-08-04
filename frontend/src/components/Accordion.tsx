import type { ReactNode } from "react";

// A tap-to-expand row per record, showing just its summary until opened.
// Shared by the Database page (Schema/Rows, instead of a wide scrolling
// table) and the Logs page (log entries).
export function AccordionItem({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="accordion-item">
      <button className="accordion-header" onClick={onToggle}>
        <span>{label}</span>
        <span className="accordion-chevron">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && <div className="accordion-body">{children}</div>}
    </div>
  );
}

export function AccordionField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="accordion-field">
      <span className="field-label">{label}</span>
      <span>{value}</span>
    </div>
  );
}

import { useRef } from "react";

export interface ReorderItem {
  key: string;
  label: string;
}

interface ReorderListProps {
  items: ReorderItem[];
  onMove: (from: number, to: number) => void;
}

// Drag-to-reorder list (handle icon, native HTML5 DnD) plus ▲/▼ buttons as a
// touch-friendly fallback — dragging doesn't work well on mobile. Used by any
// page-layout reorder editor (Dashboard, Profile Tabs, future ones).
export function ReorderList({ items, onMove }: ReorderListProps) {
  const dragIndexRef = useRef<number | null>(null);

  return (
    <div className="reorder-list">
      {items.map((item, index) => (
        <div
          key={item.key}
          className="reorder-item"
          draggable
          onDragStart={() => {
            dragIndexRef.current = index;
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndexRef.current !== null) onMove(dragIndexRef.current, index);
            dragIndexRef.current = null;
          }}
        >
          <span className="reorder-handle" aria-hidden="true">
            ⠿
          </span>
          <span className="reorder-label">{item.label}</span>
          <div className="reorder-buttons">
            <button className="icon-button" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="Move up">
              ▲
            </button>
            <button
              className="icon-button"
              disabled={index === items.length - 1}
              onClick={() => onMove(index, index + 1)}
              aria-label="Move down"
            >
              ▼
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

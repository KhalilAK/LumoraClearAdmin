import type { CSSProperties } from "react";

// A pulsing placeholder block shaped like the content that's about to load
// (a row, a card, a grid cell) — pair with LoadingIndicator, not a replacement.
export function Skeleton({ height = 36, width = "100%", style }: { height?: number | string; width?: number | string; style?: CSSProperties }) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}

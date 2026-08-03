import type { CSSProperties, ReactNode } from "react";

// A pulsing placeholder block shaped like the content that's about to load
// (a row, a card, a grid cell). Pass a LoadingIndicator as children to show
// the logo/text centered inside the box, instead of floating above it.
export function Skeleton({
  height = 36,
  width = "100%",
  style,
  children,
}: {
  height?: number | string;
  width?: number | string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div className="skeleton" style={{ height, width, ...style }}>
      {children}
    </div>
  );
}

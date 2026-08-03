import loadingLogo from "../assets/loading-logo.png";

interface LoadingIndicatorProps {
  label?: string;
  // "lg" centers in the full viewport (e.g. the initial auth check, before
  // any layout renders). "sm" fits inline within a section that's loading
  // (a sidebar list, a card's content) without forcing extra height.
  size?: "sm" | "lg";
}

export function LoadingIndicator({ label = "Loading…", size = "lg" }: LoadingIndicatorProps) {
  return (
    <div className={`loading-indicator${size === "lg" ? " loading-indicator-lg" : ""}`}>
      <img src={loadingLogo} alt="" className={`loading-logo${size === "sm" ? " loading-logo-sm" : ""}`} />
      <span className="loading-text">{label}</span>
    </div>
  );
}

// Shared by every page embedding the Live App Simulator (PhoneFrame) —
// Color Scheme, Dashboard Layout, etc.
export const APP_PREVIEW_URL = import.meta.env.VITE_APP_PREVIEW_URL as string | undefined;

// Target the preview app's own origin rather than "*" once we know it —
// APP_PREVIEW_URL gives us that for free.
export const APP_PREVIEW_ORIGIN = (() => {
  if (!APP_PREVIEW_URL) return undefined;
  try {
    return new URL(APP_PREVIEW_URL).origin;
  } catch {
    return undefined;
  }
})();

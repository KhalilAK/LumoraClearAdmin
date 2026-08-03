import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { darkPalette, lightPalette, type Palette } from "../theme/colors";
import { api, type ThemeColorRow } from "../api/client";
import { useAuth } from "./AuthContext";

interface ThemeContextValue {
  mode: "light" | "dark";
  toggleMode: () => void;
  colors: Palette;
  // Re-pulls theme_colors from the backend — call after saving on the Color
  // Scheme page so this site's own chrome picks up the change immediately.
  refetchColors: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "lumora-admin-ui-mode";

function toPalette(row: ThemeColorRow): Palette {
  return {
    background: row.background,
    secondaryBackground: row.secondaryBackground,
    boxBackground: row.boxBackground,
    text: row.text,
    secondaryText: row.secondaryText,
    invertText: row.invertText,
    tint: row.tint,
    buttonColor: row.buttonColor,
    baseColor: row.baseColor,
    error: row.error,
    errorLightLight: row.errorLightLight,
    pending: row.pending,
    paid: row.paid,
    shadow: row.shadow,
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const [mode, setMode] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return "light";
  });
  // Live values from theme_colors — null means "not loaded yet / not
  // authenticated", in which case the static defaults are used instead.
  const [liveLight, setLiveLight] = useState<Palette | null>(null);
  const [liveDark, setLiveDark] = useState<Palette | null>(null);

  const refetchColors = useCallback(() => {
    api
      .getThemeColors()
      .then((res) => {
        setLiveLight(res.light ? toPalette(res.light) : null);
        setLiveDark(res.dark ? toPalette(res.dark) : null);
      })
      .catch(() => {
        // Not authenticated yet, or the DB is unreachable — static defaults cover it.
      });
  }, []);

  useEffect(() => {
    if (authenticated) {
      refetchColors();
    } else {
      setLiveLight(null);
      setLiveDark(null);
    }
  }, [authenticated, refetchColors]);

  const colors = mode === "dark" ? liveDark ?? darkPalette : liveLight ?? lightPalette;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(colors)) {
      root.style.setProperty(`--${key}`, value);
    }
    root.style.colorScheme = mode;
  }, [mode, colors]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggleMode: () => setMode((m) => (m === "light" ? "dark" : "light")), colors, refetchColors }),
    [mode, colors, refetchColors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { darkPalette, lightPalette, type Palette } from "../theme/colors";

interface ThemeContextValue {
  mode: "light" | "dark";
  toggleMode: () => void;
  colors: Palette;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "lumora-admin-ui-mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return "light";
  });

  const colors = mode === "dark" ? darkPalette : lightPalette;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(colors)) {
      root.style.setProperty(`--${key}`, value);
    }
    root.style.colorScheme = mode;
  }, [mode, colors]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggleMode: () => setMode((m) => (m === "light" ? "dark" : "light")), colors }),
    [mode, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

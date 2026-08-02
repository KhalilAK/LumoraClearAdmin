// Mirrors app/theme/colors.ts from the LumoraClear mobile/web app so the
// admin site shares the same design language. These are fallback/static
// defaults — ThemeContext.tsx overrides them with whatever GET /api/theme/colors
// returns (the live theme_colors table), which is also what the Color Scheme
// page edits.

export type Palette = typeof lightPalette;

export const lightPalette = {
  background: "#edf2f9ff",
  secondaryBackground: "#edf2f9ff",
  boxBackground: "#ffffff",
  text: "#1f2937",
  secondaryText: "#6b7280",
  invertText: "#f5f5f5",
  tint: "#007bff",
  buttonColor: "#058affff",
  baseColor: "#39a1fdff",
  error: "#ff0000",
  errorLightLight: "#c0020216",
  pending: "#9b9d00ff",
  paid: "#31c22e96",
  shadow: "rgba(0,0,0,0.1)",
};

export const darkPalette = {
  background: "#121212",
  secondaryBackground: "#1e1e1e",
  boxBackground: "#000000",
  text: "#f5f5f5",
  secondaryText: "#6b7280",
  invertText: "#1a1a1a",
  tint: "#4dabf5",
  buttonColor: "#700ee8ff",
  baseColor: "#bb86fc",
  error: "#f7abb9ff",
  errorLightLight: "#c0020250",
  pending: "#636400ff",
  paid: "#04db00ff",
  shadow: "rgba(255,255,255,0.1)",
};

export const radius = {
  control: 6,
  card: 10,
  pill: 8,
  modal: 20,
  circle: 50,
};

export const spacing = {
  screenContentWidth: "90%",
  modalCardWidth: "85%",
  cardPadding: 10,
  modalPadding: 24,
  sectionGap: 20,
};

export const typography = {
  pageTitle: { fontSize: 28, fontWeight: 600 },
  sectionTitle: { fontSize: 20, fontWeight: 600 },
  cardTitle: { fontSize: 18, fontWeight: 700 },
  body: { fontSize: 14, fontWeight: 400 },
  label: { fontSize: 12, fontWeight: 400 },
  meta: { fontSize: 12, fontWeight: 400 },
  amount: { fontSize: 17, fontWeight: 400 },
  amountLarge: { fontSize: 20, fontWeight: 700 },
  buttonLabel: { fontSize: 15, fontWeight: 600 },
} as const;

export const shadows = {
  neutral: "2px 2px 4px rgba(0,0,0,0.5)",
};

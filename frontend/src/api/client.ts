const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ ok: true; role: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ authenticated: boolean; role?: string }>("/api/auth/me"),

  listTables: () => request<TableMeta[]>("/api/tables"),
  getTableRows: (key: string, limit: number, offset: number) =>
    request<TableRowsResponse>(`/api/tables/${encodeURIComponent(key)}/rows?limit=${limit}&offset=${offset}`),

  getThemeColors: () => request<ThemeColorsResponse>("/api/theme/colors"),
  putThemeColors: (mode: "light" | "dark", colors: Record<string, string>) =>
    request<Record<string, unknown>>("/api/theme/colors", { method: "PUT", body: JSON.stringify({ mode, colors }) }),
};

export interface ColumnMeta {
  name: string;
  type: string;
  nullable: boolean;
  fk?: string;
  description?: string;
}

export interface TableMeta {
  key: string;
  tableName: string;
  displayName: string;
  primaryKey: string;
  description: string | null;
  columns: ColumnMeta[];
}

export interface TableRowsResponse {
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
}

export interface ThemeColorRow {
  mode: "light" | "dark";
  background: string;
  secondaryBackground: string;
  boxBackground: string;
  text: string;
  secondaryText: string;
  invertText: string;
  tint: string;
  buttonColor: string;
  baseColor: string;
  error: string;
  errorLightLight: string;
  pending: string;
  paid: string;
  shadow: string;
  updated_at: string;
}

export interface ThemeColorsResponse {
  light: ThemeColorRow | null;
  dark: ThemeColorRow | null;
}

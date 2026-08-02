import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";

interface AuthContextValue {
  authenticated: boolean | null; // null while the initial check is in flight
  role: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then((res) => {
        setAuthenticated(res.authenticated);
        setRole(res.role ?? null);
      })
      .catch(() => setAuthenticated(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    setAuthenticated(true);
    setRole(res.role);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setAuthenticated(false);
    setRole(null);
  }, []);

  const value = useMemo(() => ({ authenticated, role, login, logout }), [authenticated, role, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

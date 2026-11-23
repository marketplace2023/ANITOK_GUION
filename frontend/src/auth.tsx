import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, getMe, login as apiLogin, logout as apiLogout } from "./api";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous"; reason?: "expired" | "not-configured" | "offline" }
  | { status: "authenticated"; user: string };

const AuthContext = createContext<{
  state: AuthState;
  login: (user: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const check = useCallback(async () => {
    try {
      const me = await getMe();
      setState({ status: "authenticated", user: me.user });
    } catch (e) {
      const err = e as ApiError;
      setState({ status: "anonymous", reason: err.code === "AUTH_NOT_CONFIGURED" ? "not-configured" : err.status === 0 ? "offline" : undefined });
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  // Cualquier 401 de la API (cookie caducada) devuelve a la pantalla de login
  useEffect(() => {
    const onExpired = () => setState((s) => (s.status === "authenticated" ? { status: "anonymous", reason: "expired" } : s));
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const me = await apiLogin(user, password);
    setState({ status: "authenticated", user: me.user });
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    setState({ status: "anonymous" });
  }, []);

  return <AuthContext.Provider value={{ state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

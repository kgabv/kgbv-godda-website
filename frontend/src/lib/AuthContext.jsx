import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext({ user: null, loading: true, refresh: () => {}, logout: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // If OAuth callback, skip - AuthCallback will handle
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, loading, refresh, logout, setUser }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

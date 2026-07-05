/**
 * Auth Context
 * Centralizes user session state. Wraps the app in main.jsx.
 * Provides login/register/logout and role-check helpers consumed
 * by ProtectedRoute and any component needing to know the current user.
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  // On mount, if we have a token but stale user data, refresh profile
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      authApi
        .getProfile()
        .then(({ data }) => {
          setUser(data);
          localStorage.setItem("user", JSON.stringify(data));
        })
        .catch(() => {
          // Token invalid/expired and refresh failed — client interceptor already redirects
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authApi.register(formData);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      if (refresh) await authApi.logout(refresh);
    } catch {
      // Ignore — we clear local session regardless
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await authApi.getProfile();
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
    return data;
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isCourtAdmin: user?.role === "COURT_ADMIN" || user?.role === "SYS_ADMIN",
    isSysAdmin: user?.role === "SYS_ADMIN",
    isAdvocate: user?.role === "ADVOCATE",
    hasPremium: !!user?.has_premium,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

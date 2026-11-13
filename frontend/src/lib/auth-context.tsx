"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, clearTokens, getAccessToken, getRefreshToken, setTokens } from "./api";
import type { User } from "./types";

interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

interface RegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }
    try {
      const res = await api.get<{ success: boolean; data: User }>("/users/me/");
      setUser(res.data);
    } catch {
      setUser(null);
      clearTokens();
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<LoginResponse>("/auth/login/", { email, password }, { auth: false });
    setTokens(res.access, res.refresh);
    setUser(res.user);
  };

  const register = async (payload: RegisterPayload) => {
    await api.post("/auth/register/", payload, { auth: false });
    await login(payload.email, payload.password);
  };

  const logout = () => {
    // Revoke the refresh token server-side (best effort — the user is logged
    // out locally either way).
    const refresh = getRefreshToken();
    if (refresh && getAccessToken()) {
      api.post("/auth/logout/", { refresh }).catch(() => undefined);
    }
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

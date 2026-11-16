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
  logout: () => Promise<void>;
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

  const logout = async () => {
    // Revoke the refresh token server-side before forgetting it locally. The
    // refresh token itself is the credential (auth: false), so an expired
    // access token can't trigger a refresh that rotates the token we're
    // revoking. Best effort with a timeout: the user is logged out locally
    // either way.
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await api.post("/auth/logout/", { refresh }, { auth: false, signal: AbortSignal.timeout(5000) });
      } catch {
        // Network error or timeout: still log out locally.
      }
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

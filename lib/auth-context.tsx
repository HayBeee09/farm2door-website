"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { UserRole } from "@/lib/supabase/types";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  farm_name?: string | null;
  farm_location?: string | null;
  address?: string | null;
  is_verified?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: "buyer" | "farmer";
  farm_name?: string;
  farm_location?: string;
  address?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalMode: "login" | "register";
  authModalDefaultRole: "buyer" | "farmer";
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  openAuthModal: (mode?: "login" | "register", role?: "buyer" | "farmer") => void;
  closeAuthModal: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: {
    full_name?: string;
    phone?: string;
    address?: string;
    farm_name?: string;
    farm_location?: string;
  }) => Promise<{ success: boolean; error?: string; profile?: AuthUser }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [authModalDefaultRole, setAuthModalDefaultRole] = useState<"buyer" | "farmer">("buyer");

  const supabase = createClient();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    // Listen to Supabase client auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        await refreshUser();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser, supabase]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      setUser(data.user);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during login";
      return { success: false, error: msg };
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      setUser(data.user);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during registration";
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      setUser(null);
    }
  };

  const updateProfile = async (updates: {
    full_name?: string;
    phone?: string;
    address?: string;
    farm_name?: string;
    farm_location?: string;
  }): Promise<{ success: boolean; error?: string; profile?: AuthUser }> => {
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to update profile." };
      }
      if (data.profile) {
        setUser(data.profile);
      } else {
        await refreshUser();
      }
      return { success: true, profile: data.profile };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error updating profile";
      return { success: false, error: msg };
    }
  };

  const openAuthModal = (mode: "login" | "register" = "login", role: "buyer" | "farmer" = "buyer") => {
    setAuthModalMode(mode);
    setAuthModalDefaultRole(role);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAuthModalOpen,
        authModalMode,
        authModalDefaultRole,
        login,
        register,
        logout,
        openAuthModal,
        closeAuthModal,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

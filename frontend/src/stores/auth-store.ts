import { create } from "zustand";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import type { DirectusUser } from "@/types";

interface AuthState {
  user: DirectusUser | null;
  isLoading: boolean;
  setUser: (user: DirectusUser | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (email, password) => {
    const res = await apiPost("/api/auth/login", { email, password }, { skipRetry: true });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Đăng nhập thất bại");
    }

    // After login, fetch the full user profile
    const meRes = await apiFetch("/api/auth/me");
    if (meRes.ok) {
      const meData = await meRes.json();
      set({ user: meData.user });
    }
  },

  register: async (data) => {
    const res = await apiPost("/api/auth/register", data, { skipRetry: true });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Đăng ký thất bại");
    }
  },

  logout: async () => {
    await apiPost("/api/auth/logout", undefined, { skipRetry: true });
    set({ user: null });
  },

  fetchUser: async () => {
    try {
      set({ isLoading: true });

      // Skip network request if no user_role cookie is present
      const hasRoleCookie = document.cookie
        .split("; ")
        .some((c) => c.startsWith("user_role="));

      if (!hasRoleCookie) {
        set({ user: null });
        return;
      }

      const res = await apiFetch("/api/auth/me");

      if (res.ok) {
        const data = await res.json();
        set({ user: data.user });
      } else {
        set({ user: null });
      }
    } catch {
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },
}));

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),

      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),

      // ✅ Thêm validation
      updateAccessToken: (accessToken) => {
        if (!accessToken) {
          return set({ accessToken: null, isAuthenticated: false });
        }
        return set({ accessToken, isAuthenticated: true });
      },
    }),
    {
      name: "auth-storage",
      getStorage: () => localStorage,
    },
  ),
);

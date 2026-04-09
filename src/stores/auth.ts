import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@oikos/coaching";

interface AuthState {
  activeRole: "athlete" | "coach";
  userId: string | null;
  userRole: UserRole | null;
  setActiveRole: (role: "athlete" | "coach") => void;
  setUser: (userId: string, role: UserRole) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      activeRole: "athlete",
      userId: null,
      userRole: null,
      setActiveRole: (role) => set({ activeRole: role }),
      setUser: (userId, userRole) => set({ userId, userRole }),
      clear: () => set({ activeRole: "athlete", userId: null, userRole: null }),
    }),
    { name: "coaching-auth" }
  )
);

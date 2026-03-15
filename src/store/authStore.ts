import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import type { User } from '@shared/types';
interface AuthState {
  user: User | null;
  expiresAt: number | null;
  login: (user: User, rememberMe?: boolean) => void;
  logout: () => void;
  checkSession: () => boolean;
  updateCurrentUser: (updates: Partial<User>) => void;
  importAuthData: (data: { user: User | null; expiresAt: number | null }) => void;
}
const hybridStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return localStorage.getItem(name) || sessionStorage.getItem(name) || null;
  },
  setItem: (name: string, value: string): void => {
    try {
      const parsed = JSON.parse(value);
      const state = parsed.state;
      const expiresAt = state?.expiresAt;
      // If expiration is > 24 hours from now, it's a "Remember Me" session (14 days)
      if (expiresAt && expiresAt > Date.now() + 24 * 60 * 60 * 1000) {
        localStorage.setItem(name, value);
        sessionStorage.removeItem(name);
      } else {
        // Standard session: store in sessionStorage so it wipes on tab/browser close
        sessionStorage.setItem(name, value);
        localStorage.removeItem(name);
      }
    } catch (e) {
      // Fallback to strict session
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    }
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  }
};
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      expiresAt: null,
      login: (user, rememberMe = false) => {
        // 14 days if rememberMe, else 12 hours
        const expirationTime = rememberMe
          ? Date.now() + 14 * 24 * 60 * 60 * 1000
          : Date.now() + 12 * 60 * 60 * 1000;
        set({ user, expiresAt: expirationTime });
      },
      logout: () => set({ user: null, expiresAt: null }),
      checkSession: () => {
        const { expiresAt } = get();
        if (expiresAt && Date.now() > expiresAt) {
          set({ user: null, expiresAt: null });
          return false;
        }
        return true;
      },
      updateCurrentUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      importAuthData: (data) => set({
        user: data.user,
        expiresAt: data.expiresAt
      })
    }),
    {
      name: 'synqwork-auth-storage',
      storage: createJSONStorage(() => hybridStorage),
    }
  )
);
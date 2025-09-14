import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'kor-auth',
    }
  )
);

export function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function hasPermission(role: string | undefined, requiredRoles: string[]): boolean {
  if (!role) return false;
  return requiredRoles.includes(role);
}

export function isAdmin(): boolean {
  const user = useAuthStore.getState().user;
  return user?.role === 'admin';
}

export function isEditor(): boolean {
  const user = useAuthStore.getState().user;
  return user?.role === 'admin' || user?.role === 'editor';
}

export function isViewer(): boolean {
  const user = useAuthStore.getState().user;
  return user?.role === 'admin' || user?.role === 'editor' || user?.role === 'viewer';
}

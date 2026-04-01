import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  login: (token: string, user: User, remember?: boolean) => void;
  logout: () => void;
  refresh: (token: string) => void;
}

function getStoredToken(): string | null {
  return localStorage.getItem('rnadetector_token') || sessionStorage.getItem('rnadetector_token');
}

function getRememberMe(): boolean {
  return localStorage.getItem('rnadetector_remember') === 'true';
}

const useAuthStore = create<AuthState>((set, get) => ({
  token: getStoredToken(),
  user: null,
  isAuthenticated: !!getStoredToken(),
  rememberMe: getRememberMe(),

  setToken: (token) => {
    const store = get().rememberMe ? localStorage : sessionStorage;
    if (token) {
      store.setItem('rnadetector_token', token);
    } else {
      localStorage.removeItem('rnadetector_token');
      sessionStorage.removeItem('rnadetector_token');
    }
    set({ token, isAuthenticated: !!token });
  },

  setUser: (user) => set({ user }),

  login: (token, user, remember = false) => {
    // Clear both storages first
    localStorage.removeItem('rnadetector_token');
    sessionStorage.removeItem('rnadetector_token');

    if (remember) {
      localStorage.setItem('rnadetector_token', token);
      localStorage.setItem('rnadetector_remember', 'true');
    } else {
      sessionStorage.setItem('rnadetector_token', token);
      localStorage.removeItem('rnadetector_remember');
    }
    set({ token, user, isAuthenticated: true, rememberMe: remember });
  },

  logout: () => {
    localStorage.removeItem('rnadetector_token');
    sessionStorage.removeItem('rnadetector_token');
    localStorage.removeItem('rnadetector_remember');
    set({ token: null, user: null, isAuthenticated: false, rememberMe: false });
  },

  refresh: (token) => {
    const store = get().rememberMe ? localStorage : sessionStorage;
    store.setItem('rnadetector_token', token);
    set({ token });
  },
}));

export default useAuthStore;

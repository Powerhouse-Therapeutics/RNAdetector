import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  login: (token: string, user: User, remember?: boolean, refreshToken?: string | null) => void;
  logout: () => void;
  refresh: (token: string) => void;
}

/* ---- Safe storage helpers ---- */

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch (e) {
    console.error('[authStore] Failed to read from storage:', e);
    return null;
  }
}

function safeSetItem(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch (e) {
    console.error('[authStore] Failed to write to storage:', e);
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
  try {
    sessionStorage.removeItem(key);
  } catch { /* ignore */ }
}

function getStoredToken(): string | null {
  return safeGetItem('rnadetector_token');
}

function getStoredRefreshToken(): string | null {
  return safeGetItem('rnadetector_refresh_token');
}

function getRememberMe(): boolean {
  try {
    return localStorage.getItem('rnadetector_remember') === 'true';
  } catch {
    return false;
  }
}

const useAuthStore = create<AuthState>((set, get) => ({
  token: getStoredToken(),
  refreshToken: getStoredRefreshToken(),
  user: null,
  isAuthenticated: !!getStoredToken(),
  rememberMe: getRememberMe(),

  setToken: (token) => {
    const store = get().rememberMe ? localStorage : sessionStorage;
    if (token) {
      safeSetItem(store, 'rnadetector_token', token);
    } else {
      safeRemoveItem('rnadetector_token');
    }
    set({ token, isAuthenticated: !!token });
  },

  setUser: (user) => set({ user }),

  login: (token, user, remember = false, refreshToken = null) => {
    // Clear both storages first
    safeRemoveItem('rnadetector_token');
    safeRemoveItem('rnadetector_refresh_token');

    if (remember) {
      safeSetItem(localStorage, 'rnadetector_token', token);
      safeSetItem(localStorage, 'rnadetector_remember', 'true');
      if (refreshToken) safeSetItem(localStorage, 'rnadetector_refresh_token', refreshToken);
    } else {
      safeSetItem(sessionStorage, 'rnadetector_token', token);
      try { localStorage.removeItem('rnadetector_remember'); } catch { /* ignore */ }
      if (refreshToken) safeSetItem(sessionStorage, 'rnadetector_refresh_token', refreshToken);
    }
    set({ token, refreshToken, user, isAuthenticated: true, rememberMe: remember });
  },

  logout: () => {
    safeRemoveItem('rnadetector_token');
    safeRemoveItem('rnadetector_refresh_token');
    try { localStorage.removeItem('rnadetector_remember'); } catch { /* ignore */ }
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false, rememberMe: false });
  },

  refresh: (token) => {
    const store = get().rememberMe ? localStorage : sessionStorage;
    safeSetItem(store, 'rnadetector_token', token);
    set({ token });
  },
}));

export default useAuthStore;

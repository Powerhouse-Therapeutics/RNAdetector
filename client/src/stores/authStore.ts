import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  refresh: (token: string) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('rnadetector_token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('rnadetector_token'),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('rnadetector_token', token);
    } else {
      localStorage.removeItem('rnadetector_token');
    }
    set({ token, isAuthenticated: !!token });
  },

  setUser: (user) => set({ user }),

  login: (token, user) => {
    localStorage.setItem('rnadetector_token', token);
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('rnadetector_token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  refresh: (token) => {
    localStorage.setItem('rnadetector_token', token);
    set({ token });
  },
}));

export default useAuthStore;

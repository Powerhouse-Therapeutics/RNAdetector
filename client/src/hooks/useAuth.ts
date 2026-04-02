import { useCallback } from 'react';
import useAuthStore from '@/stores/authStore';
import * as authApi from '@/api/auth';
import useNotificationStore from '@/stores/notificationStore';

export default function useAuth() {
  const { user, isAuthenticated, logout: storeLogout, login: storeLogin } = useAuthStore();
  const notify = useNotificationStore((s) => s.show);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      const data = await authApi.login(email, password);
      storeLogin(data.access_token, data.user, rememberMe, data.refresh_token ?? null);
    },
    [storeLogin]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore errors on logout
    } finally {
      storeLogout();
      notify('Logged out successfully', 'info');
    }
  }, [storeLogout, notify]);

  const isAdmin = user?.admin ?? false;

  return { user, isAuthenticated, isAdmin, login, logout };
}

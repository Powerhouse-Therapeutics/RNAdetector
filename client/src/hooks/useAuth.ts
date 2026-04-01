import { useCallback } from 'react';
import useAuthStore from '@/stores/authStore';
import * as authApi from '@/api/auth';
import useNotificationStore from '@/stores/notificationStore';

export default function useAuth() {
  const { user, isAuthenticated, logout: storeLogout, login: storeLogin } = useAuthStore();
  const notify = useNotificationStore((s) => s.show);

  const isAdmin = user?.admin ?? false;

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authApi.login(email, password);
      storeLogin(data.access_token, data.user);
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

  return { user, isAuthenticated, isAdmin, login, logout };
}

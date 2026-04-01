import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '@/stores/authStore';
import * as authApi from '@/api/auth';

export default function ProtectedRoute() {
  const { isAuthenticated, setUser, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      authApi.me().then((u) => setUser(u)).catch(() => {
        useAuthStore.getState().logout();
      });
    }
  }, [isAuthenticated, user, setUser]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

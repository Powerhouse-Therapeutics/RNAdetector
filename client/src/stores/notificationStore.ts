import { create } from 'zustand';
import type { AlertColor } from '@mui/material';

interface NotificationState {
  open: boolean;
  message: string;
  severity: AlertColor;
  show: (message: string, severity?: AlertColor) => void;
  hide: () => void;
}

const useNotificationStore = create<NotificationState>((set) => ({
  open: false,
  message: '',
  severity: 'info',

  show: (message, severity = 'info') => set({ open: true, message, severity }),
  hide: () => set({ open: false }),
}));

export default useNotificationStore;

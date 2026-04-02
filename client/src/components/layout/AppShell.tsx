import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Header from './Header';
import Sidebar from './Sidebar';
import {
  SidebarContext,
  DRAWER_WIDTH_EXPANDED,
  DRAWER_WIDTH_COLLAPSED,
} from './sidebarContext';

export default function AppShell() {
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Header drawerWidth={drawerWidth} />
        <Sidebar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            pt: 2,
            width: `calc(100% - ${drawerWidth}px)`,
            bgcolor: theme.palette.background.default,
            minHeight: '100vh',
            transition: 'width 200ms ease-out, margin-left 200ms ease-out',
          }}
        >
          <Toolbar sx={{ minHeight: '56px !important' }} />
          <Box
            sx={{
              animation: 'fadeIn 200ms ease-out',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateY(4px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </SidebarContext.Provider>
  );
}
